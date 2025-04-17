import { Gpio } from 'onoff';
import { StopDistance } from './../models/database/StopDistance';
import { Destination } from './../models/database/Destination';
import { SpecialCharacter } from './../models/database/SpecialCharacter';
import { SerialPort } from 'serialport';
import { ReadlineParser } from '@serialport/parser-readline'
import { TelegramGenerator } from '../IBISTelegramGenerator';
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
import { Trip } from '../models/database/Trip';
import { WebSocket, WebSocketServer } from 'ws';
import { RadioController } from './RadioController';


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


    private uestraLVAs: UestraLVA[] = []
    private terminalStatusTimer: any
    private deviceStatusTimer: any
    private queueSendTimer: any
    private timer: any
    private deviceConfig: DeviceConfig = require('../../device_config.json')
    public audioController: AudioController
    public locationController: LocationController
    public radioController?: RadioController
    public linie?: Line
    public kurs: number = 0
    public zuglaenge: number = 0
    
    public sonderzeichen?: SpecialCharacter

    public currentSign?: IBISSign
    public currentValidator?: IBISValidator
    
    // HAG

    private HAGlastStatusQueriedTime?: Date
    private HAGlastStatusReceivedTime?: Date
    private HAGstatus?: number

    // Websocket
    private websocket: WebSocketServer

    private ueberfallSet: boolean
    
    private tuerkriteriumStatus: boolean
    
    private kupplungA: boolean
    private kupplungB: boolean
    
    // 0: Datenfunk, 1: Datenfunk gestört, 2: Funkrückfall
    public funkmodus: number
    

    get upcomingStop(): RouteStop {
        if (this.route && this.route.stops.length > 0) {
            return this.route.stops[this.stopIndex]
        } else {
            return null
        }
    }

    get fahrtrichtung(): string {
        if (this.aTerminal && this.aTerminal.isActive) {
            return 'A';
        }
        if (this.bTerminal && this.bTerminal.isActive) {
            return 'B';
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
                Util.log('No line in DS009')
                return stopName;
            } else {
            
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
        }
        return ''
    }
    constructor(portString: string, interval: number, websocket: WebSocketServer) {
        
        this.serialPort = new SerialPort({
            path: portString,
            baudRate: 1200,
            dataBits: 7,
            stopBits: 2,
            parity: 'even'
        })
        this.websocket = websocket

        const parser = this.serialPort.pipe(new ReadlineParser({ delimiter: '\r' }))

        if (this.deviceConfig.TERMINAL_A) {
            this.aTerminal = new IBISTerminal(this, true, this.deviceConfig.terminal_config)
        }
        if (this.deviceConfig.TERMINAL_B) {
            this.bTerminal = new IBISTerminal(this, false, this.deviceConfig.terminal_config)    
        }

    
        // TODO: wait until mA turns into mQ
   
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
       this.websocket.on('connection', (client) => {
        client.on('message', (data) => {
           const messageObject = JSON.parse(data.toString())
           Util.log(messageObject)
            switch (messageObject['channel']) {
                case 'WBED':
                    Util.log('Passing to onReceiveTelegram')
                    this.onReceiveTelegram(messageObject['data'])
                    break;
                case 'WBSD':
                    Util.log('Passing to sendTelegram')
                    this.sendTelegram(messageObject['data'] as IBISTelegram)
                    break;
                case 'simulation':
                    Util.log('simulation message')
                    Util.log(messageObject);
                    switch (messageObject['data']['criteria']) {
                        case 'TK':
                            // Türkriterium
                            this.onTuerkriterium(messageObject['data']['value'])
                            break;
                        case 'KBA':
                            // Kupplung A Status
                            this.onKupplungA(messageObject['data']['value'])
                            break;
                        case 'KBB':
                            // Kupplung B Status
                            this.onKupplungB(messageObject['data']['value'])
                            break;
                        case 'UEB':
                            this.onUeberfall();
                            break;
                        case 'WEISUNG':
                            Util.log('Weisung anzeigen: ', messageObject['data']['value']['text'])
                            this.aTerminal.setWeisung(messageObject['data']['value']['text'])
                            break;
                        case 'DRIVING':
                            // value reading
                            const value = messageObject['data']['value'];
                            const speed = parseInt(value['speed'])
                            const distance = parseInt(value['distance'])
                                this.locationController.simulateDrive(speed, distance)
                
                            break;
                        case 'RADIO':
                            const radioValue = messageObject['data']['value'];
                            const bits = radioValue['bits']
                            this.radioController.playFFSKBits(bits);
                            break;
                    }
                    break;
                // TODO: Zugbus    
            }
        });
    });
       

    if (this.deviceConfig.use_gpio == true) {
            // Überfall-Taster
            const ueberfallPin = new Gpio(this.deviceConfig.GPIO_PINOUT.UEB, 'in', 'falling')
            // Wegimpuls
            const wegimpulsPin = new Gpio(this.deviceConfig.GPIO_PINOUT.WI, 'in', 'both')
            // Türkontakt, hier beide Richtung da Tür auf/zu
            const tuerkontaktPin = new Gpio(this.deviceConfig.GPIO_PINOUT.TK, 'in', 'both')

            const kupplungAPin = new Gpio(this.deviceConfig.GPIO_PINOUT.KKA, 'in', 'both')
            const kupplungBPin = new Gpio(this.deviceConfig.GPIO_PINOUT.KKB, 'in', 'both')
        
            ueberfallPin.watch(this.interruptUeberfall);
            wegimpulsPin.watch(this.interruptWegimpuls);
            tuerkontaktPin.watch(this.interruptTuerkriterium)
            kupplungAPin.watch(this.interruptKupplungA)
            kupplungBPin.watch(this.interruptKupplungB)
        }
    }

    


    private interruptKupplungA(err: Error | null, value: number) {
        if (err) {
            Util.log('GPIO-Fehler Kupplung A', err)
            return;
        }
        this.onKupplungA(value > 0)
    }




    private interruptKupplungB(err: Error | null, value: number) {
        if (err) {
            Util.log('GPIO-Fehler Kupplung B', err)
            return;
        } 
        this.onKupplungB(value > 0)
  
    }

    private interruptTuerkriterium(err: Error | null, value: number) {
        if (err) {
            Util.log('GPIO-Fehler Türkriterium', err)
            return;
        }
        this.onTuerkriterium(value > 0)
      
    }

    private interruptWegimpuls(err: Error | null, value: number) {
        Util.log('WI')
        if (err) {
            Util.log('GPIO-Fehler Wegimpuls', err)
            return;
        } else {
            Util.log('Wegimpuls-Interrupt')
        }
        if (value == 1) {
            this.locationController.wiInterrupt()
        }
    }

    private interruptUeberfall(err: Error | null, value: number) {
        if (err) {
            Util.log('GPIO-Fehler Überfall:', err);
            return;
        }
        this.onUeberfall();
        
    }




    private onChangeKupplung() {
        Util.log('Kupplungsstatus geändert, neue Zuglänge')
    }


    private onUeberfall() {
            this.ueberfallSet = true

            if (this.aTerminal) {
                this.aTerminal.setStatus('-----', true);
                this.aTerminal.updateSecondLine()
            }
            if (this.bTerminal) {
                this.bTerminal.setStatus('-----', true);
                this.bTerminal.updateSecondLine()
            }
    }
    private onTuerkriterium(value: boolean) {
        if (this.tuerkriteriumStatus != value) {
            this.tuerkriteriumStatus = value
            Util.log('Türkriterium geändert:', value)
            // Wenn Tür wieder geschlossen und Fzg Haltestellenfangradius verlassen, nächste Hst
            // Wenn Tür geöffnet wurde, Zählerstände merken
        }
    }
    private onKupplungA(value: boolean) {
        if (value) {
            // Kupplung A aktiv
            this.kupplungA = true
        } else {
            this.kupplungA = false
        }
        this.onChangeKupplung()
    }
    private onKupplungB(value: boolean) {
        if (value) {
            // Kupplung A aktiv
            this.kupplungB = true
        } else {
            this.kupplungB = false
        }
        this.onChangeKupplung()
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

    throwError(errorText: string) {
        if (this.aTerminal) {
            this.aTerminal.throwError(errorText)
        }
        if (this.bTerminal) {
            this.bTerminal.throwError(errorText)
        }
    }

    private queryHAG() {
        if (this.HAGstatus === undefined || this.HAGstatus == 0) {
            this.sendTelegram(TelegramGenerator.DS030())
            setTimeout(() => {
                if (this.HAGlastStatusReceivedTime != undefined && (this.HAGlastStatusReceivedTime.getTime() - this.HAGlastStatusQueriedTime.getTime()) <= 6000) {
                    // Is active, have received status
                    Util.log("HAG OK")
                } else {
                    // Have not received status, throw error
                    this.throwError("H.ANSAG DEF!");
                    Util.log("HAG FAIL")
                    this.HAGstatus = null;
                }
            }, 6000);
        }
    }

   
    // Status scanning logic
    private queryStatusOfAllSigns() {
        // TODO: Query status of sign, then wait for n seconds, then query next sign
        
        this.currentSign = this.signs[0]
        this.currentSign.queryStatus()
        for (let i=1; i<this.signs.length; i++) {
            setTimeout(() => {
                this.currentSign = this.signs[i]
                this.currentSign.queryStatus()
            }, 5000 * i);
        }
    }
    private queryStatusOfAllValidators() {
        Util.log('Querying validators')
        this.currentValidator = this.validators[0]
        this.currentValidator.queryStatus()
        for (let i=1; i<this.validators.length; i++) {
            setTimeout(() => {
                this.currentValidator = this.validators[i]
                this.currentValidator.queryStatus()
            }, 5000 * i);
        }
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
    public sendToWebsocket(payload: string) {
        this.websocket.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(payload)
            }
        });
    }
    onReceiveTelegram(telegram: IBISTelegram) {
        // Switch status telegram per device / terminal
        // Pass terminal keys to each terminal, change terminal state

        Util.log('in >', telegram.substring(1))
               // Also send telegram to websocket for debug
        this.sendToWebsocket(JSON.stringify({
                'channel': 'WBED',
                data: telegram
        }))
        if (this.aTerminal) {
            this.aTerminal.onReceiveTelegram(telegram.substring(1))
        }
        if (this.bTerminal) {
            this.bTerminal.onReceiveTelegram(telegram.substring(1))
        }

        if (this.currentSign) {
            // Currently have a sign active, if this is a reply, handle it
            this.currentSign.onReceiveTelegram(telegram.substring(1))
        }
        if (this.currentValidator) {
            // Currently have a validator active, if this is a reply, handle it
            this.currentValidator.onReceiveTelegram(telegram.substring(1))
        }
     
        if (telegram.substring(1).match("h[0-9]")) {
            this.HAGlastStatusReceivedTime = new Date()
            this.HAGstatus = parseInt(telegram.substring(2))
        }


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
        Util.log('out > ' + this.sanatizeOutputForLog(telegram))
        // Also send telegram to websocket for debug
this.websocket.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({
             "channel": "WBSD",
             data: telegram
            }))
    }
});
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
        } else {
            this.sendTelegram(TelegramGenerator.DS001(0))
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
        if (this.deviceConfig.query_device_status) {
            if (this.signs.length > 0) {
                this.queryStatusOfAllSigns()
            }
            if (this.validators.length > 0) {
                this.queryStatusOfAllValidators()
            }
            }
            if (this.deviceConfig.external_announcements) {
                this.queryHAG();
            }

            // Ortung per IRIS

      }

      tick30Seconds() {

      }

      tick60Seconds() {
        // Uhrzeit
        this.sendTelegram(TelegramGenerator.DS005(new Date()))
        // Datum 5-stellig
        this.sendTelegram(TelegramGenerator.DS006(new Date()))
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
        if (parseInt(lineNumber) > 0) { 
        // Linie in DV suchen
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
        } else {
            // Abmeldung bei Linie 0
            this.onAbmeldung()
        }
    }

    async setRoute(routeNumber: number): Promise<boolean> {
        if (routeNumber != 0) {
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
        } else {
            // Route 0 gesetzt, mit Route 0 sind Pfeiltasten für LSA aktiv, sonst nicht.
            this.route = undefined;
            if (this.aTerminal && this.aTerminal.isActive) {
                this.aTerminal.onSetRoute();
            }
            if (this.bTerminal && this.bTerminal.isActive) {
                this.bTerminal.onSetRoute();
            }
            if (this.locationController) {
                this.locationController.onSetRoute()
            }
            return true
        }
    }
    
    onAbmeldung() {
        if (this.aTerminal && this.aTerminal.isActive) {
            this.aTerminal.onAbmeldung();
        }
        if (this.bTerminal && this.bTerminal.isActive) {
            this.bTerminal.onAbmeldung();
        }
    }

    setRichtung(direction: number) {
        this.richtung = direction
    }

    setZuglaenge(laenge: number) {
        this.zuglaenge = laenge
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

        if (this.linie && this.kurs > 0) {
            // Find schedule/trip at current time
            /*
            await Trip.findOne( {
                where: {
                    // aktuelle Zeit in Sekunden nach 0:00 + aktueller Tagtyp von Firmenkalender

                }
            })
            */
        }
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
            this.sendTelegram(TelegramGenerator.DS003c(this.stopName))


          // Haltestellenname
          this.sendTelegram(TelegramGenerator.DS009c(this.stopName))


          // Sonderoption DS021_STOP_NAME - Haltestellenname in DS021
          if (this.deviceConfig.DS021_STOP_NAME) {
            for (var i=0; i<this.deviceConfig.DS021_STOP_NAME.length; i++) {
                this.sendTelegram(TelegramGenerator.DS021(this.deviceConfig.DS021_STOP_NAME[i], this.route.stops[this.stopIndex].stop.information.shortName))
                this.sendTelegram(TelegramGenerator.DS021a(this.deviceConfig.DS021_STOP_NAME[i], this.route.stops[this.stopIndex].stop.information.shortName))
            }
          }
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

    sendSprechwunsch() {
        
    }
    sendUnfall() {
        
    }
    // Funkrückfall setzen:
    // Kanalnummer statt Fahrplanabweichung zeigen,
    // Sprechtaste zum FuG durchschalten mit Fünftonfolge
    // Direkt verbinden, also -VLS- statisch anzeigen
    setFunkrueckfall() {
        this.funkmodus = 2;
    }

}
export { IBISController }