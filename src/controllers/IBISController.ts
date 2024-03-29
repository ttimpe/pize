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
class IBISController {
    private IBIS_SEND_INTERVAL = 5
    private IBIS_QUEUE_SEND_INTERVAL_MS = 10
    private IBIS_TERMINAL_RECEIVE_INTERVAL = 1
    private serialPort: SerialPort

    private aTerminal?: IBISTerminal
    private bTerminal?: IBISTerminal

    private signs: IBISSign[] = []
    private validators: IBISValidator[] = []

    private terminalStatusTimer: any
    private deviceStatusTimer: any
    private queueSendTimer: any
    private deviceConfig: DeviceConfig = require('../../device_config.json')

    private telegramSendQueue:IBISTelegram[] = []

    private get stopName(): string {
        let length = 32
        if (Vehicle.getInstance().line != undefined && Vehicle.getInstance().route != undefined) {
            let lineString = Vehicle.getInstance().line.number

            let stopName = Vehicle.getInstance().route.stops[Vehicle.getInstance().stopIndex].stop.name.substring(0,16)
    
            const leftPad = Math.floor((length - lineString.length - stopName.length) / 2);
    
            // Leerzeichen rechts von der Haltestelle berechnen
            const rightPad = length - lineString.length - stopName.length - leftPad;
            
            // Konstruiere den formatierten String
            const formatierterString = lineString + " ".repeat(leftPad) + stopName + " ".repeat(rightPad);
            
            return formatierterString + '\0x01';
        }
        return ''
    }
    constructor(portString: string, interval: number) {
        this.IBIS_SEND_INTERVAL = interval
        
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
        this.registerValidators()

        // TODO: Run timer every second, but only send certain command every n seconds:
        // send time at 0 second
       setInterval(() => {
        this.sendAllTelegrams()
       }, this.IBIS_SEND_INTERVAL * 1000) 

       // Need to query terminals more often than sending commands
       this.terminalStatusTimer = setInterval(() => {
        if (this.aTerminal) {
            this.aTerminal.queryStatus()
        }
        if (this.bTerminal) {
            this.bTerminal.queryStatus()
        }
        
       }, this.IBIS_TERMINAL_RECEIVE_INTERVAL * 1000)

       // Query Sign and Validator status every minute
       this.deviceStatusTimer = setInterval( () => {
        this.queryStatusOfAllSigns()
        this.queryStatusOfAllValidators()
       }, 60000)


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
       this.refreshTerminals()

    }

    // Aktivierte Anzeigen loopen und registrieren
    private registerSigns() {
        for (let i=0; i < this.deviceConfig.signs.length; i++) {
            if (this.deviceConfig.signs[i] == true) {
                this.signs.push(new IBISSign(this, i as IBISAddress))
            }
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

    private queryStatusOfAllSigns() {
        this.signs.forEach((sign) => {
            sign.queryStatus()
        })
    }
    private queryStatusOfAllValidators() {
        this.validators.forEach((validator) => {
            validator.queryStatus()
        })
    }

    private refreshTerminals() {
        if (this.aTerminal) {
            this.aTerminal.updateSecondLine()
            if (this.aTerminal.currentDisplayMode == TerminalDisplayMode.None) {
                this.aTerminal.refreshText()
            }
        }
        if (this.bTerminal) {
            this.bTerminal.updateSecondLine()
            if (this.bTerminal.currentDisplayMode == TerminalDisplayMode.None) {
                this.bTerminal.refreshText()
            }
        }
    }

    onReceiveTelegram(telegram: IBISTelegram) {
        // Switch status telegram per device / terminal
        // Pass terminal keys to each terminal, change terminal state

        console.log('in >', telegram.substring(1))
        if (this.aTerminal) {
       //     console.log('got A Terminal, forwarding')
            this.aTerminal.onReceiveTelegram(telegram.substring(1))
        }
        if (this.bTerminal) {
       //     console.log('got B Terminal, forwarding')
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

    private actuallySendTelegram(telegram: IBISTelegram) {
        this.serialPort.write(telegram)
        console.log('out > ' + telegram.replace('\r', '<CR>'))
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


    
    
    sendAllTelegrams() {
        
        // Liniennummer


        if (Vehicle.getInstance().line) {
            this.sendTelegram(TelegramGenerator.DS001(parseInt(Vehicle.getInstance().line.number)))
        }
        // Linie Kurs für Funk
        if (Vehicle.getInstance().line) {
            this.sendTelegram(TelegramGenerator.DS001b(parseInt(Vehicle.getInstance().line.number), Vehicle.getInstance().courseNumber))
            // Kursnummer
            this.sendTelegram(TelegramGenerator.DS002(Vehicle.getInstance().courseNumber))
        }
        if (Vehicle.getInstance().line != undefined && Vehicle.getInstance().destination != undefined) {
            // Zielnummer 
            this.sendTelegram(TelegramGenerator.DS003(Vehicle.getInstance().destination.number))
            // Zieltext
            this.sendTelegram(TelegramGenerator.DS003a(Vehicle.getInstance().destination.name))
            // Ziel für ZUB
            this.sendTelegram(TelegramGenerator.DS003b(Vehicle.getInstance().destination.number))
        }
        if (Vehicle.getInstance().line != undefined && Vehicle.getInstance().route != undefined) {
        // Haltestellenname
            this.sendTelegram(TelegramGenerator.DS003c(Vehicle.getInstance().route.stops[Vehicle.getInstance().stopIndex].stop.name))
        // Routennummer für ZUB
            this.sendTelegram(TelegramGenerator.DS003d(parseInt(Vehicle.getInstance().route.route_id)))
        }


        // Fahrweg Seitentext
        // Entwertermerkmale
        // Uhrzeit
        this.sendTelegram(TelegramGenerator.DS005(new Date()))
        // Datum 6 stellig
        this.sendTelegram(TelegramGenerator.DS006a(new Date()))
        // Zuglänge
        this.sendTelegram(TelegramGenerator.DS007(1))
        if (Vehicle.getInstance().line != undefined && Vehicle.getInstance().route != undefined) {
            // Haltestellenname
            this.sendTelegram(TelegramGenerator.DS009c(this.stopName))
            // Haltestellennummer 4 stellig
            this.sendTelegram(TelegramGenerator.DS010(Vehicle.getInstance().upcomingStop.stop.number))
            // Haltestellennummer Perlenschnur        
            this.sendTelegram(TelegramGenerator.DS010a(Vehicle.getInstance().upcomingStop.stop.number))
            // Haltestellenindex
            this.sendTelegram(TelegramGenerator.DS010b(Vehicle.getInstance().stopIndex))
            // Haltestellenindex Endhaltestelle
            this.sendTelegram(TelegramGenerator.DS010c(Vehicle.getInstance().route.stops.length - 1))
        }
        // Jahreszahl 4 stellig
        this.sendTelegram(TelegramGenerator.DS010d(new Date()))


      }


}
export { IBISController }