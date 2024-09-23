import { Destination } from './../models/database/Destination';
import { SpecialCharacter } from './../models/database/SpecialCharacter';
import { SerialPort } from 'serialport';
import { ReadlineParser } from '@serialport/parser-readline'
import { TelegramGenerator } from '../TelegramGenerator';
import { Vehicle } from '../Vehicle';
import { IBISTerminal } from '../models/devices/Terminal/IBISTerminal';
import { DeviceConfig } from '../models/devices/DeviceConfig';
import { IBISSign } from '../models/devices/IBISSign';
import { IBISValidator } from '../models/devices/IBISValidator';
import { AudioController } from './AudioController';
import { IBISTelegram } from '../extensions/IBISTelegram';
import { TerminalDisplayMode } from '../enums/IBISTerminalDisplayMode';
import { UestraLVA } from '../models/devices/Signs/UestraLVA';
import { Stop } from '../models/database/Stop';
import { Route } from '../models/database/Route';
import { Line } from '../models/database/Line'
import { RouteStop } from '../models/database/RouteStop';
import { StopInformation } from '../models/database/StopInformation.js';
import { Announcement } from '../models/database/Announcement';
import { Util } from '../util';
import { LocationController } from './LocationController';
class IBISController {
    private IBIS_QUEUE_SEND_INTERVAL_MS = 20
    private IBIS_TERMINAL_RECEIVE_INTERVAL = 1

    // Timeout waiting for response to status request
    private IBIS_RESPONSE_TIMEOUT = 5
    private serialPort: SerialPort

    private aTerminal?: IBISTerminal
    private bTerminal?: IBISTerminal

    private signs: IBISSign[] = []
    private validators: IBISValidator[] = []

    // Scanning variables
    public currentSign?: IBISSign;
    public currentValidator?: IBISValidator;

    private uestraLVAs: UestraLVA[] = []
    private terminalStatusTimer: any
    private deviceStatusTimer: any
    private queueSendTimer: any
    private timer: any
    private deviceConfig: DeviceConfig = require('../../device_config.json')
    private audioController: AudioController = new AudioController()
    public locationController: LocationController
    public linie?: Line
    public kurs: number = 0
    public sonderzeichen?: SpecialCharacter
    get upcomingStop(): RouteStop {
        if (this.route && this.route.stops.length > 0) {
        return this.route.stops[this.stopIndex]
        } else {
            return null
        }
    }
    public route?: Route
    public ziel?: Destination
    public stopIndex: number = 0
    public richtung: number = 0

    private telegramSendQueue:IBISTelegram[] = []


    

    private get stopName(): string {
        let length = 24
        if (this.linie != undefined && this.route != undefined) {
            let stopName = this.route.stops[this.stopIndex].stop.information.shortName;
            // Fix for signs that don't support DS001
            if (this.deviceConfig.line_number_in_ds009 == false) {
                return stopName;
            }
            
            let lineString = this.linie.number
            if (this.sonderzeichen) {
                lineString = this.sonderzeichen.stringValue
            }

  
            // cut off stop name based on sign length
            stopName = stopName.substring(0, length - lineString.length);
            const whitespacePaddingOnLeftLength = Math.floor(length - lineString.length - stopName.length) / 2;

            let output = lineString + " ".repeat(whitespacePaddingOnLeftLength) + stopName;
            output = output.padEnd(length - 1, " ");
            output = output + "\x01"




            
            
            return output;
        }
        return ''
    }
    constructor(portString: string, interval: number) {
        
        this.serialPort = new SerialPort({
            path: portString,
            baudRate: 1200,
            dataBits: 7,
            stopBits: 2,
            parity: 'even'
        })

        const parser = this.serialPort.pipe(new ReadlineParser({ delimiter: '\r' }))

        if (this.deviceConfig.TERMINAL_A) {
            this.aTerminal = new IBISTerminal(this, true, this.deviceConfig.terminal_config)
        }
        if (this.deviceConfig.TERMINAL_B) {
            this.bTerminal = new IBISTerminal(this, false, this.deviceConfig.terminal_config)    
        }

    
        
        


        this.registerSigns()
        this.registerUestraLVAs()
        this.registerValidators()

        this.tick10Seconds()
        this.tick60Seconds()
        this.timer = setInterval(() => {
            this.tick1Second()
            let d = new Date()
            if (d.getSeconds() % 10 == 0) {
                this.tick10Seconds()
            }
            if (d.getSeconds() % 30 == 0) {
                this.tick30Seconds()
            }
            if (d.getSeconds() % 60 == 0) {
                this.tick60Seconds()
            }
        }, 1000)




       // Delay sending of different telegrams by a couple of ms
       this.queueSendTimer = setInterval( () => {
        if (this.telegramSendQueue.length != 0) {
            let telegram = this.telegramSendQueue.shift()
            this.actuallySendTelegram(telegram)
        }
       }, this.IBIS_QUEUE_SEND_INTERVAL_MS)

       parser.on('data', (data) => {
        this.onReceiveTelegram(data)
       })

    }

    // Aktivierte Anzeigen loopen und registrieren
    private registerSigns() {
        for (let i=0; i < this.deviceConfig.signs.length; i++) {
            if (this.deviceConfig.signs[i] == true) {
                this.signs.push(new IBISSign(this, i as IBISAddress))
            }
        }
    }

    private registerUestraLVAs() {
        for (let i=0; i < this.deviceConfig.UESTRA_LVA.length; i++) {

            
                this.uestraLVAs.push(new UestraLVA(this, this.deviceConfig.UESTRA_LVA[i] as IBISAddress));
    
        } 
    }

    // Aktivierte Entwerter loopen und registrieren
    private registerValidators() {
        for (let i=0; i < this.deviceConfig.validators.length; i++) {
            if (this.deviceConfig.validators[i] == true) {
                this.validators.push(new IBISValidator(this, i as IBISAddress))
            }
        }
    }

    private throwError(errorText: string) {

    }

   
    // Status scanning logic
    private queryStatusOfAllSigns() {
        // TODO: Query status of sign, then wait for n seconds, then query next sign
        this.signs.forEach((sign) => {
            this.currentSign = sign
            sign.queryStatus()
        })
    }
    private queryStatusOfAllValidators() {
        Util.log('Querying validators')
        this.validators.forEach((validator) => {
            this.currentValidator = validator
            validator.queryStatus()
        })
    }



    repeatStopAnnouncement() {
        if (this.deviceConfig.external_announcements) {
            this.sendTelegram(TelegramGenerator.DS033());
            
        } else {
        this.audioController.playStopAnnouncement(this.upcomingStop, () => {
            if (this.stopIndex == (this.route.stops.length - 1)) {
                // Is end
                this.audioController.playEndAnnouncement();
            }
        });
    }
        this.sendStopData();

    }
    toggleAnnouncementsMuted() {
        this.audioController.announcementsMuted = !(this.audioController.announcementsMuted)
    }

    private refreshTerminals() {
        if (this.aTerminal) {
            this.aTerminal.updateSecondLine()
            if (this.aTerminal.currentDisplayMode == TerminalDisplayMode.None) {
             //   this.aTerminal.refreshText()
            }
        }
        if (this.bTerminal) {
            this.bTerminal.updateSecondLine()
            if (this.bTerminal.currentDisplayMode == TerminalDisplayMode.None) {
                // this.bTerminal.refreshText()
            }
        }
    }

    onReceiveTelegram(telegram: IBISTelegram) {
        // Switch status telegram per device / terminal
        // Pass terminal keys to each terminal, change terminal state

        Util.log('in >', telegram.substring(1))
        if (this.aTerminal) {
            this.aTerminal.onReceiveTelegram(telegram.substring(1))
        }
        if (this.bTerminal) {
            this.bTerminal.onReceiveTelegram(telegram.substring(1))
        }
        this.signs.forEach((sign) => {
            sign.onReceiveTelegram(telegram.substring(1))
        })
        this.validators.forEach((validator) => {
            validator.onReceiveTelegram(telegram.substring(1))
        })

        // Update status values for devices
        // Throw errors for missing devices
    }

    sendTelegram(telegram: IBISTelegram) {
        telegram = telegram.replaceAll( "ä", "{")
        telegram = telegram.replaceAll("ö", "|")
        telegram = telegram.replaceAll("ü", "}")
        telegram = telegram.replaceAll("ß", "~")
        telegram = telegram.replaceAll("Ä", "[")
        telegram = telegram.replaceAll("Ö", "\\")
        telegram = telegram.replaceAll("Ü", "]")
      
        const signedTelegram = this.signTelegram(telegram + '\r')
        this.telegramSendQueue.push(signedTelegram)
    }

    sanatizeOutputForLog(telegram: IBISTelegram) {
        return telegram.replace(/[\x00-\x1F\x7F]/g, (char) => {
            return `<${char.charCodeAt(0).toString(16).padStart(2, '0').toUpperCase()}>`;
        });
    }

    private actuallySendTelegram(telegram: IBISTelegram) {
        this.serialPort.write(telegram)
     //   Util.log('out > ' + this.sanatizeOutputForLog(telegram))
    }
    
    // IBIS Telegrammsignierung
    private signTelegram(message: IBISTelegram): IBISTelegram {
        let checkByte = 0x7F;
        for (const char of message) {
            const byte = char.charCodeAt(0);
            checkByte = checkByte ^ byte;
        }
        message += String.fromCharCode(checkByte);
        return message;
    }



      tick10Seconds() {
        this.queryStatusOfAllSigns()
        this.queryStatusOfAllValidators()
        // Kursnummer
        this.sendTelegram(TelegramGenerator.DS002(this.kurs))
          // Liniennummer



        if (this.linie) {
            this.sendTelegram(TelegramGenerator.DS001(parseInt(this.linie.number)))
            // Sonderzeichen
            if (this.sonderzeichen) {
                this.sendTelegram(TelegramGenerator.DS001a(this.sonderzeichen.number))
            } else {
                this.sendTelegram(TelegramGenerator.DS001a(0))
            }
            // Funkkennung
            this.sendTelegram(TelegramGenerator.DS001b(parseInt(this.linie.number), this.kurs))
        }
        if (this.linie != undefined && this.route != undefined) {
            this.sendStopData()

            // Routennummer für ZUB
            this.sendTelegram(TelegramGenerator.DS003d(parseInt(this.route.route_id)))
        }
    
        if (this.linie != undefined && this.ziel != undefined) {
            // Zielnummer 
            this.sendTelegram(TelegramGenerator.DS003(this.ziel.number))
            // Zieltext
            this.sendTelegram(TelegramGenerator.DS003a(this.ziel.sign_text))
            // Ziel für ZUB
            this.sendTelegram(TelegramGenerator.DS003b(this.ziel.number))
        }
    
         // Zuglänge
         this.sendTelegram(TelegramGenerator.DS007(1))
         if (this.linie != undefined && this.route != undefined) {
          
        }

        // Entwerter
        if (this.linie && this.route && this.richtung) {
            this.sendTelegram(TelegramGenerator.DS004(parseInt(this.linie.number), this.upcomingStop.stop.number, this.richtung));
            // Erweitert für KVRG
            this.sendTelegram(TelegramGenerator.DS004a(2000));
        }
      
      }

      tick30Seconds() {

      }

      tick60Seconds() {
        // Uhrzeit
        this.sendTelegram(TelegramGenerator.DS005(new Date()))
        // Datum 6 stellig
        this.sendTelegram(TelegramGenerator.DS006a(new Date()))
        // Jahreszahl 4 stellig
        this.sendTelegram(TelegramGenerator.DS010d(new Date()))

      
      }

      tick1Second() {
        if (this.aTerminal) {
            this.aTerminal.queryStatus()
        }
        if (this.bTerminal) {
            this.bTerminal.queryStatus()
        }
      }

    
    async setLine(lineNumber: string): Promise<boolean> {
        const line = await Line.findOne({
            where: {
                number: lineNumber
            }
        })
        if (line) {
            this.linie = line
            this.route = null;
            for (var i=0; i<this.uestraLVAs.length; i++) {
                this.uestraLVAs[i].clearSign();
            }
            return true
        }
        return false
    }

    async setRoute(routeNumber: number): Promise<boolean> {
        if (this.linie) {
            const route = await Route.findOne({
                where: {
                    line_id: this.linie.id,
                    route_id: routeNumber.toString()
                },
                include: [RouteStop, Destination, {
                    model: RouteStop,
                    include: [{
                        model: Stop,
                        include: [StopInformation], // Include the associated Stop model
                      },Announcement], // Include the associated Stop model
                  }]
            })
            if (route) {
                Util.log(route)
                Util.log(route.destination)
                this.stopIndex = 0;
                this.route = route
                this.ziel = route.destination
                this.richtung = route.direction
                if (this.aTerminal && this.aTerminal.isActive) {
                    this.aTerminal.onSetRoute();
                }
                if (this.bTerminal && this.bTerminal.isActive) {
                    this.bTerminal.onSetRoute();
                }
                for (var i=0; i<this.uestraLVAs.length; i++) {
                    this.uestraLVAs[i].onSetRoute(this.linie, this.route)
                    this.uestraLVAs[i].onSetZiel(this.ziel)
                }
                if (this.locationController) {
                    this.locationController.onSetRoute()
                }
                return true
            } else {
                return false
            }
        }
        return false
    }
    
    setRichtung(direction: number) {
        this.richtung = direction
    }

    async setZiel(destinationNumber: number): Promise<boolean> {
        const destination = await Destination.findOne({
            where: {
                number: destinationNumber
            }
        })
        if (destination) {
            this.ziel = destination
            for (var i=0; i<this.uestraLVAs.length; i++) {
                this.uestraLVAs[i].onSetZiel(this.ziel)
            }
            return true
        } else {
            return false
        }
    }
    setCourseNumber(courseNumber: number) {
        this.kurs = courseNumber
        if (this.aTerminal) {
            this.aTerminal.onSetKurs()
        }
        if (this.bTerminal) {
            this.bTerminal.onSetKurs()
        }
        // If we also have a line, let's go find a valid schedule
    }

    skipStop() {
        if (this.route && this.stopIndex < (this.route.stops.length) - 1) {
            this.stopIndex = this.stopIndex + 1
            this.setHaltestelle(this.route.stops[this.stopIndex])
            this.playAnnouncementForRouteStop(this.route.stops[this.stopIndex])
        }
    }

    playAnnouncementForRouteStop(routeStop: RouteStop) {
        if (this.deviceConfig.external_announcements) {
            this.sendTelegram(TelegramGenerator.DS036(routeStop.announcement.number));
        } else {

        this.audioController.playStopAnnouncement(routeStop, ()=> {
            if (this.stopIndex == (this.route.stops.length - 1)) {
                // Is end
                this.audioController.playEndAnnouncement();
            }
        })
    }
    }
    setHaltestelle(stop: RouteStop) {
        Util.log('setting stop to', stop);
        this.sendStopData()
        
        if (this.aTerminal) {
            this.aTerminal.onSetHaltestelle()
        }
        if (this.bTerminal) {
            this.bTerminal.onSetHaltestelle()
        }
        
        
    }

    arriveAtStop(routeStop: RouteStop) {
        // Find stop index based on id
        this.stopIndex = (routeStop.sequence_number + 1);
        this.setHaltestelle(this.route.stops[this.stopIndex]);

    }


    private sendStopData() {
            // Haltestellenname
            this.sendTelegram(TelegramGenerator.DS003c(this.route.stops[this.stopIndex].stop.name))
          // Haltestellenname
          this.sendTelegram(TelegramGenerator.DS009c(this.stopName))
          // Haltestellennummer 4 stellig
         // this.sendTelegram(TelegramGenerator.DS010(this.upcomingStop.stop.number))
          // Haltestellennummer Perlenschnur        
          // this.sendTelegram(TelegramGenerator.DS010a(this.upcomingStop.stop.number))
          // Haltestellenindex
          this.sendTelegram("x2" + (this.stopIndex + 1).toString().padStart(3, "0"))
          // Haltestellenindex Endhaltestelle
          this.sendTelegram(TelegramGenerator.DS010c(this.route.stops.length - 1))
    }

    async setSpecialCharacter(characterNumber: number): Promise<boolean> {
        if (characterNumber != 0) {
        const specialCharacter = await SpecialCharacter.findOne({
            where: {
                number: characterNumber
            }
        })
        if (specialCharacter) {
            this.sonderzeichen = specialCharacter
            return true
        } else {
            return false
        }
        } else {
            this.sonderzeichen = null;
            return true;
        }
    }


}
export { IBISController }