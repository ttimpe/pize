import { Gpio } from 'onoff';
import { SpecialCharacter } from './../models/database/SpecialCharacter';
import { SerialPort } from 'serialport';
import { ReadlineParser } from '@serialport/parser-readline'
import { TelegramGenerator } from '../IBISTelegramGenerator';
import { IBISTerminal } from '../models/devices/Terminal/IBISTerminal';
import { DeviceConfig } from '../models/devices/DeviceConfig';
import { IBISSign as IBISAnzeige } from '../models/devices/IBISSign';
import { IBISValidator as IBISEntwerter } from '../models/devices/IBISValidator';
import { AudioController } from './AudioController';
import { IBISTelegram } from '../extensions/IBISTelegram';
import { TerminalDisplayMode } from '../enums/IBISTerminalDisplayMode';
import { Util } from '../util';
import { UestraLVA } from '../models/devices/Signs/UestraLVA';
import { LocationController } from './LocationController';
import { WebSocket, WebSocketServer } from 'ws';
import { RadioController } from './RadioController';
import { RecHp } from '../models/database/VDV/RecHp';
import { RecZnr } from '../models/database/VDV/RecZnr';
import { RecLid } from '../models/database/VDV/RecLid';
import { RecFrt } from "../models/database/VDV/RecFrt";
import { RecSel } from "../models/database/VDV/RecSel";
import { RecOrt } from '../models/database/VDV/RecOrt';
import { LidVerlauf } from '../models/database/VDV/LidVerlauf';

import { RecAnr } from '../models/database/VDV/RecAnr';
import { IBISControllerInterface } from './IBISControllerInterface';


class IBISController implements IBISControllerInterface {
    private IBIS_QUEUE_SEND_INTERVAL_MS = 20
    private IBIS_TERMINAL_RECEIVE_INTERVAL = 1

    // Timeout waiting for response to status request
    private IBIS_RESPONSE_TIMEOUT = 5
    private serialPort: SerialPort

    // Terminals von Kopf A und B
    private aTerminal?: IBISTerminal
    private bTerminal?: IBISTerminal


    private anzeigen: IBISAnzeige[] = []
    private entwerter: IBISEntwerter[] = []

    // UESTRA Linienverlaufsanzeigen
    private uestraLVAs: UestraLVA[] = []
    private terminalStatusTimer: any
    private deviceStatusTimer: any
    private queueSendTimer: any
    private timer: any
    private deviceConfig: DeviceConfig = require('../../device_config.json')
    public audioController: AudioController
    public locationController: LocationController
    public radioController?: RadioController
    public linie?: RecLid
    public kurs: number = 0
    public zuglaenge: number = 0

    // VDV Properties
    public currentTrips: RecFrt[] = [];
    public currentStops: LidVerlauf[] = []; // VDV
    public currentRouteNumber: string = "";

    public sonderzeichen?: SpecialCharacter

    public aktuelleAnzeige?: IBISAnzeige
    public aktuellerEntwerter?: IBISEntwerter


    // HAG
    private HAGlastStatusQueriedTime?: Date
    private HAGlastStatusReceivedTime?: Date
    private HAGstatus?: number

    // IRIS
    private IRIS_A_LastStatusQueriedTime?: Date
    private IRIS_A_LastStatusReceivedTime?: Date
    private IRIS_B_LastStatusQueriedTime?: Date
    private IRIS_B_LastStatusReceivedTime?: Date
    private IRIS_A_Defect: boolean = false
    private IRIS_B_Defect: boolean = false

    // Websocket
    private websocket: WebSocketServer

    private ueberfallSet: boolean

    // Türkriterium - Türen freigegeben ja nein
    private tuerkriteriumStatus: boolean

    // Kupplungen belegt – für Zuglänge
    private kupplungA: boolean
    private kupplungB: boolean

    // 0: Datenfunk, 1: Datenfunk gestört, 2: Funkrückfall
    public funkmodus: number

    private timersInterrupted: boolean = false

    get upcomingStop(): LidVerlauf | null {
        if (this.currentStops && this.currentStops.length > 0 && this.stopIndex < this.currentStops.length) {
            return this.currentStops[this.stopIndex];
        } else {
            return null;
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

    public route?: any
    public ziel?: RecZnr
    public stopIndex: number = 0
    public richtung: number = 0

    private telegramSendQueue: IBISTelegram[] = []





    private get stopName(): string {
        let length = 24

        if (this.currentStops && this.currentStops.length > 0 && this.stopIndex < this.currentStops.length) {
            const step = this.currentStops[this.stopIndex];
            const ort = step.stop?.recOrt;
            let stopName = ort ? (ort.ORT_REF_ORT_NAME || ort.ORT_NAME) : 'Unknown';

            // Apply formatting
            if (this.deviceConfig.line_number_in_ds009 == false) {
                return stopName;
            } else {
                let lineString = this.linie ? this.linie.STR_LID : '';
                if (this.sonderzeichen) {
                    lineString = this.sonderzeichen.stringValue
                }
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
    constructor(portString: string, interval: number, websocket: WebSocketServer, locationController: LocationController) {
        this.locationController = locationController


        this.interruptKupplungA = this.interruptKupplungA.bind(this);
        this.interruptKupplungB = this.interruptKupplungB.bind(this);
        this.interruptTuerkriterium = this.interruptTuerkriterium.bind(this);
        this.interruptWegimpuls = this.interruptWegimpuls.bind(this);
        this.interruptUeberfall = this.interruptUeberfall.bind(this);


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
        if (this.timersInterrupted == false) {
            this.tick10Seconds()
            this.tick60Seconds()
        }
        this.timer = setInterval(() => {
            if (this.timersInterrupted == false) {
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
            }
        }, 1000)




        // Delay sending of different telegrams by a couple of ms
        this.queueSendTimer = setInterval(() => {
            if (this.telegramSendQueue.length != 0) {
                let telegram = this.telegramSendQueue.shift()
                this.actuallySendTelegram(telegram)
            }
        }, this.IBIS_QUEUE_SEND_INTERVAL_MS)

        parser.on('data', (data) => {
            this.onReceiveTelegram(data)

        })
        this.websocket.on('connection', (client) => {
            // Send initial route data
            if (this.currentStops.length > 0) {
                client.send(this.getRouteDebugPayload());
            }
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
                            case 'WBSD_STOP':
                                this.timersInterrupted = messageObject['data']['value'];
                                break;
                            case 'OBI':
                                // Ortsbake Interrupt (Simulation)
                                this.interruptOrtbake();
                                break;
                            case 'IRIS_BEACON':
                                // Direct Beacon Code Injection (Simulation)
                                const beaconCode = messageObject['data']['value']; // Hex String
                                Util.log(`[Simulation] IRIS Beacon injected: ${beaconCode}`);
                                this.locationController.onBeaconDetected(beaconCode, 'SIM');
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

            const obiPin = new Gpio(this.deviceConfig.GPIO_PINOUT.OBI, 'in', 'falling');


            const kupplungAPin = new Gpio(this.deviceConfig.GPIO_PINOUT.KKA, 'in', 'both')
            const kupplungBPin = new Gpio(this.deviceConfig.GPIO_PINOUT.KKB, 'in', 'both')

            ueberfallPin.watch(this.interruptUeberfall);
            wegimpulsPin.watch(this.interruptWegimpuls);
            tuerkontaktPin.watch(this.interruptTuerkriterium)
            obiPin.watch(this.interruptOrtbake);
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

    private interruptOrtbake = (err?: Error | null, value?: number) => {
        if (err) {
            Util.log('GPIO-Fehler OBI', err)
            return;
        }
        // OBI triggert sofortige Datenabfrage (DS061)
        Util.log("[GPIO] OBI Interrupt detected -> Requesting Data");
        // Richtung abhängig von Fahrtrichtung/Terminal? 
        // Wir fragen einfach das aktive Lesegerät ab oder beide wenn unsicher.
        // IRIS Logic: C 'A' oder 'B'. Wir nehmen an, wir wissen welche aktiv ist.
        if (this.deviceConfig.IRIS_A && (!this.IRIS_A_Defect)) {
            this.sendTelegram(TelegramGenerator.DS061('A'));
        }
        if (this.deviceConfig.IRIS_B && (!this.IRIS_B_Defect)) {
            this.sendTelegram(TelegramGenerator.DS061('B'));
        }
    }

    private interruptWegimpuls(err: Error | null, value: number) {
        if (err) {
            Util.log('GPIO-Fehler Wegimpuls', err)
            return;
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
        for (let i = 0; i < this.deviceConfig.signs.length; i++) {
            if (this.deviceConfig.signs[i] == true) {
                this.anzeigen.push(new IBISAnzeige(this, i as IBISAddress))
            }
        }
    }

    private registerUestraLVAs() {
        for (let i = 0; i < this.deviceConfig.UESTRA_LVA.length; i++) {

            this.uestraLVAs.push(new UestraLVA(this, this.deviceConfig.UESTRA_LVA[i] as IBISAddress));

        }
    }

    // Aktivierte Entwerter loopen und registrieren
    private registerValidators() {
        for (let i = 0; i < this.deviceConfig.validators.length; i++) {
            if (this.deviceConfig.validators[i] == true) {
                this.entwerter.push(new IBISEntwerter(this, i as IBISAddress))
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
                if (this.HAGlastStatusReceivedTime != undefined && (this.HAGlastStatusQueriedTime.getTime()) && (this.HAGlastStatusReceivedTime.getTime() - this.HAGlastStatusQueriedTime.getTime()) <= 6000) {
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

    private queryIRIS(direction: 'A' | 'B') {
        const isA = direction === 'A';
        if (isA ? this.IRIS_A_Defect : this.IRIS_B_Defect) return; // Schon defekt

        if (isA) this.IRIS_A_LastStatusQueriedTime = new Date();
        else this.IRIS_B_LastStatusQueriedTime = new Date();

        this.sendTelegram(TelegramGenerator.DS060(direction));

        setTimeout(() => {
            const lastReceived = isA ? this.IRIS_A_LastStatusReceivedTime : this.IRIS_B_LastStatusReceivedTime;
            const lastQueried = isA ? this.IRIS_A_LastStatusQueriedTime : this.IRIS_B_LastStatusQueriedTime;
            const hasRecentResponse = lastReceived && lastQueried && (lastReceived.getTime() > lastQueried.getTime());

            if (!hasRecentResponse) {
                // Defect Detected
                Util.log(`IRIS ${direction} DEFEKT! Keine Antwort.`);
                this.throwError(`IRIS ${direction} DEFEKT`);
                if (isA) this.IRIS_A_Defect = true;
                else this.IRIS_B_Defect = true;
            } else {
                // OK
                if (isA) this.IRIS_A_Defect = false;
                else this.IRIS_B_Defect = false;
            }
        }, 6000);
    }


    // Status scanning logic
    private queryStatusOfAllSigns() {
        // TODO: Query status of sign, then wait for n seconds, then query next sign

        this.aktuelleAnzeige = this.anzeigen[0]
        this.aktuelleAnzeige.queryStatus()
        for (let i = 1; i < this.anzeigen.length; i++) {
            setTimeout(() => {
                this.aktuelleAnzeige = this.anzeigen[i]
                this.aktuelleAnzeige.queryStatus()
            }, 5000 * i);
        }
    }
    private queryStatusOfAllValidators() {
        Util.log('Querying validators')
        this.aktuellerEntwerter = this.entwerter[0]
        this.aktuellerEntwerter.queryStatus()
        for (let i = 1; i < this.entwerter.length; i++) {
            setTimeout(() => {
                this.aktuellerEntwerter = this.entwerter[i]
                this.aktuellerEntwerter.queryStatus()
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
                this.aTerminal.refreshText()
            }
            // IRIS Power Management
            if (this.deviceConfig.IRIS_A) {
                if (this.aTerminal.isActive) {
                    this.sendTelegram(TelegramGenerator.DS063('A'));
                } else {
                    this.sendTelegram(TelegramGenerator.DS064('A'));
                }
            }
        }
        if (this.bTerminal) {
            this.bTerminal.updateSecondLine()
            if (this.bTerminal.currentDisplayMode == TerminalDisplayMode.None) {
                this.bTerminal.refreshText()
            }
            // IRIS Power Management
            if (this.deviceConfig.IRIS_B) {
                if (this.bTerminal.isActive) {
                    this.sendTelegram(TelegramGenerator.DS063('B'));
                } else {
                    this.sendTelegram(TelegramGenerator.DS064('B'));
                }
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

        if (this.aktuelleAnzeige) {
            // Currently have a sign active, if this is a reply, handle it
            this.aktuelleAnzeige.onReceiveTelegram(telegram.substring(1))
        }
        if (this.aktuellerEntwerter) {
            // Currently have a validator active, if this is a reply, handle it
            this.aktuellerEntwerter.onReceiveTelegram(telegram.substring(1))
        }

        if (telegram.substring(1).match("h[0-9]")) {
            this.HAGlastStatusReceivedTime = new Date()
            this.HAGstatus = parseInt(telegram.substring(2))
        }

        // IRIS DS160 (Status) - o[A/B][0/1/2]
        // Example: oA0 (Idle), oA1 (Data), oA2 (Changed)
        if (telegram.substring(1).match(/^o[AB][012]$/)) {
            const direction = telegram.substring(2, 3) as 'A' | 'B';
            const status = parseInt(telegram.substring(3, 4));

            if (direction === 'A') {
                this.IRIS_A_LastStatusReceivedTime = new Date();
                this.IRIS_A_Defect = false;
            } else {
                this.IRIS_B_LastStatusReceivedTime = new Date();
                this.IRIS_B_Defect = false;
            }

            if (status === 1 || status === 2) {
                // Data available, query it!
                Util.log(`IRIS ${direction} has data (Status ${status}). Requesting DS061...`);
                this.sendTelegram(TelegramGenerator.DS061(direction));
            }
        }

        // IRIS DS161 (Data) - o[A/B]D[Hex8]
        // Example: oAD00000FA3
        if (telegram.substring(1).match(/^o[AB]D[0-9A-Fa-f]{8}$/)) {
            const direction = telegram.substring(2, 3);
            const hexCode = telegram.substring(4);
            this.locationController.onBeaconDetected(hexCode, direction);
        }


        // Update status values for devices
        // Throw errors for missing devices
    }

    sendTelegram(telegram: IBISTelegram) {
        telegram = telegram.replaceAll("ä", "{")
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
            this.sendTelegram(TelegramGenerator.DS001(parseInt(this.linie.STR_LID)))
            // Sonderzeichen
            if (this.sonderzeichen) {
                this.sendTelegram(TelegramGenerator.DS001a(this.sonderzeichen.number))
            } else {
                this.sendTelegram(TelegramGenerator.DS001a(0))
            }
            // Funkkennung
            this.sendTelegram(TelegramGenerator.DS001b(parseInt(this.linie.STR_LID), this.kurs))
        } else {
            this.sendTelegram(TelegramGenerator.DS001(0))
        }
        if (this.linie != undefined && this.route != undefined && this.upcomingStop) {
            this.sendStopData()

            // Routennummer für ZUB (using VDV LI_NO if available or 0)
            this.sendTelegram(TelegramGenerator.DS003d(parseInt(this.linie.STR_LID)))
        }

        if (this.linie != undefined && this.ziel != undefined) {
            // Zielnummer 
            this.sendTelegram(TelegramGenerator.DS003(this.ziel.ZNR_NR))
            // Zieltext
            this.sendTelegram(TelegramGenerator.DS003a(this.ziel.ZNR_TEXT))
            // Ziel für ZUB
            this.sendTelegram(TelegramGenerator.DS003b(this.ziel.ZNR_NR))
        }

        // Zuglänge
        this.sendTelegram(TelegramGenerator.DS007(1))
        if (this.linie != undefined && this.route != undefined) {

        }

        this.sendTelegram(TelegramGenerator.DS004a(0));

        // Entwerter
        if (this.linie && this.upcomingStop) {
            // VDV: Use upcoming ORT_NR (last 3 digits usually)
            const ortNr = this.upcomingStop.ORT_NR % 1000;
            this.sendTelegram(TelegramGenerator.DS004(parseInt(this.linie.STR_LID), ortNr, this.richtung));
            // Erweitert für KVRG
        } else {
            this.sendTelegram(TelegramGenerator.DS004(0, 0, 0));
        }
        if (this.deviceConfig.query_device_status) {
            if (this.anzeigen.length > 0) {
                this.queryStatusOfAllSigns()
            }
            if (this.entwerter.length > 0) {
                this.queryStatusOfAllValidators()
            }
        }
        if (this.deviceConfig.external_announcements) {
            this.queryHAG();
        }

        // Ortung per IRIS
        if (this.deviceConfig.IRIS_A) {
            this.queryIRIS('A');
        }
        if (this.deviceConfig.IRIS_B) {
            this.queryIRIS('B');
        }
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

        // --- DEBUG TABLE UPDATE via WebSocket ---
        // Ziel-Nr
        const zielNr = this.ziel ? this.ziel.ZNR_NR : 0;
        // Haltestellennummer für Entwerterkriterium (Upcoming Stop Number)
        const entwerterHst = this.getUpcomingStopShortId();
        // Aktuelle Ortsmarkennummer (Current Stop ORT_NR)
        let ortNr = 0;
        if (this.currentStops && this.currentStops.length > 0 && this.stopIndex < this.currentStops.length) {
            ortNr = this.currentStops[this.stopIndex].stop?.recOrt ? this.currentStops[this.stopIndex].stop.recOrt.ORT_NR : 0;
        }
        // Aktueller Wegzähler-Stand
        const wegzaehler = this.locationController.impulsesSinceReset;
        // Aktuelle Routennummer
        // Aktuelle Routennummer
        const routeNr = this.currentRouteNumber ? parseInt(this.currentRouteNumber) : (this.route ? parseInt(this.route.route_id) : 0);
        // Aktuelle Richtung
        const richtung = this.richtung;
        // Aktuelle Liniennummer
        const linienNr = this.linie ? parseInt(this.linie.STR_LID) : 0;

        // Distances
        const distLastStop = this.locationController.currentDistLastStop;
        const distNextStop = this.locationController.currentDistNextStop;

        const payload = {
            channel: 'DEBUG_VALUES',
            data: {
                zielNr,
                entwerterHst,
                ortNr,
                wegzaehler,
                routeNr,
                richtung,
                linienNr,
                distLastStop,
                distNextStop
            }
        };
        this.sendToWebsocket(JSON.stringify(payload));

    }


    async setLine(lineNumber: string): Promise<boolean> {
        Util.log(`setLine called with: '${lineNumber}'`);
        if (parseInt(lineNumber) > 0) {
            // Linie in VDV RecLid suchen
            let line = await RecLid.findOne({
                where: {
                    LI_KUERZEL: lineNumber
                }
            })

            // Fallback: Try padded with zeros (e.g. "1" -> "001") if not found
            if (!line) {
                const padded = lineNumber.padStart(3, '0');
                line = await RecLid.findOne({ where: { LI_KUERZEL: padded } });
                if (line) Util.log(`Found Line via padded search: ${padded}`);
            }

            if (line) {
                Util.log(`VDV Line found: ${line.STR_LID}`);
                // Assign RecLid directly
                this.linie = line;
                // Reset VDV state
                this.currentStops = [];
                this.currentTrips = [];
                this.sendRouteDebugData();

                this.route = null;
                for (var i = 0; i < this.uestraLVAs.length; i++) {
                    this.uestraLVAs[i].clearSign();
                }

                // If Kurs is already set, try loading schedule
                if (this.kurs > 0) {
                    this.loadVDVSchedule();
                }

                return true
            }
            return false
        } else {
            // Abmeldung bei Linie 0
            this.onAbmeldung()
            return true;
        }
    }

    async setRoute(routeNumber: number): Promise<boolean> {
        Util.log(`setRoute called with ${routeNumber}`);

        if (!this.linie) {
            Util.log("Cannot set route: No line set.");
            return false;
        }

        // VDV Logic: Route Number (ROUTEN_NR) maps to a specific Variant (STR_LI_VAR) in REC_LID.
        const variantRecord = await RecLid.findOne({
            where: {
                LI_NR: this.linie.LI_NR,
                ROUTEN_NR: routeNumber
            }
        });

        if (variantRecord) {
            Util.log(`Found Variant for Route ${routeNumber}: ${variantRecord.STR_LI_VAR} (${variantRecord.LIDNAME})`);
            this.linie = variantRecord;
            return await this.loadStopSequence(variantRecord.STR_LI_VAR);
        } else {
            Util.log(`No Variant found for Line ${this.linie.LI_KUERZEL} (LI_NR: ${this.linie.LI_NR}) / Route ${routeNumber}`);

            // Debug info
            const allVariants = await RecLid.findAll({ where: { LI_NR: this.linie.LI_NR } });
            Util.log(`DEBUG: Available variants for Line ${this.linie.LI_NR}: ${allVariants.map(v => `${v.STR_LI_VAR} (R:${v.ROUTEN_NR})`).join(', ')}`);

            return false;
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
        const destination = await RecZnr.findOne({
            where: {
                ZNR_NR: destinationNumber
            }
        })
        if (destination) {
            this.ziel = destination
            for (var i = 0; i < this.uestraLVAs.length; i++) {
                // Adapt to VDV or just clear/ignore for now if types mismatch
                // this.uestraLVAs[i].onSetZiel(this.ziel)
            }
            return true
        } else {
            return false
        }
    }
    async setCourseNumber(courseNumber: number): Promise<boolean> {
        Util.log(`setCourseNumber called with: ${courseNumber}. Line is: ${this.linie ? this.linie.STR_LID : 'undefined'}`);
        this.kurs = courseNumber
        if (this.aTerminal) {
            this.aTerminal.onSetKurs()
        }
        if (this.bTerminal) {
            this.bTerminal.onSetKurs()
        }

        // VDV Logic: If Line and Kurs are set, load the schedule
        if (this.linie && this.kurs > 0) {
            Util.log(`Attempting to load VDV schedule for Line ${this.linie.STR_LID}, Kurs ${this.kurs}`);
            return await this.loadVDVSchedule();
        } else {
            Util.log('Skipping VDV load - Line not set or Kurs <= 0');
            return false;
        }
    }

    public activeTripIndex: number = 0;

    // Helper: Load a specific trip
    private async loadTrip(trip: RecFrt) {
        try {
            Util.log(`Loading Trip: FRT_FID ${trip.FRT_FID}, Variant ${trip.STR_LI_VAR}`);
            // Delegate to shared stop sequence loader
            await this.loadStopSequence(trip.STR_LI_VAR);
        } catch (error) {
            Util.log('Error loading VDV Trip:', error);
        }
    }

    // New Helper: Load Schedule from VDV Tables
    private async loadVDVSchedule(): Promise<boolean> {
        try {
            // 1. Find all Trips (RecFrt) for this Line (RecLid) and Kurs (LI_KU_NR)
            const lineId = this.linie['LI_NR'];

            const recLid = await RecLid.findOne({ where: { LI_KUERZEL: this.linie.STR_LID } });
            if (!recLid) {
                Util.log('VDV Error: RecLid not found for', this.linie.STR_LID);
                return false;
            }

            // Find Trips
            this.currentTrips = await RecFrt.findAll({
                where: {
                    LI_NR: recLid.LI_NR,
                    LI_KU_NR: this.kurs
                },
                order: [['FRT_START', 'ASC']]
            });

            if (this.currentTrips.length > 0) {
                // Select active trip (Simplification: Take the first one for now or based on time if we had logic)
                // TODO: Implement time-based selection
                this.activeTripIndex = 0;
                await this.loadTrip(this.currentTrips[this.activeTripIndex]);
                return true;
            } else {
                Util.log('No trips found for this Line/Kurs');
                this.route = undefined;
                this.ziel = undefined;
                this.currentStops = [];
                this.stopIndex = 0;

                // Clear Terminals
                if (this.aTerminal) {
                    this.aTerminal.onSetRoute();
                    this.aTerminal.onSetZiel();
                }
                if (this.bTerminal) {
                    this.bTerminal.onSetRoute();
                    this.bTerminal.onSetZiel();
                }

                this.sendStopData(); // Clearing display
                this.sendRouteDebugData();
                return false;
            }


        } catch (error) {
            Util.log('Error loading VDV schedule:', error);
            return false;
        }
    }



    // Helper to replace setHaltestelle
    setHaltestelleVDV(step: any) {
        if (!step) return;
        Util.log('setting VDV stop to', step.ort?.ORT_NAME);
        this.sendStopData();
        this.sendRouteDebugData();
        if (this.aTerminal) this.aTerminal.onSetHaltestelle();
        if (this.bTerminal) this.bTerminal.onSetHaltestelle();
    }



    private async loadNextTrip() {
        this.activeTripIndex++;
        if (this.activeTripIndex < this.currentTrips.length) {
            Util.log('Switching to next trip...');
            await this.loadTrip(this.currentTrips[this.activeTripIndex]);
        } else {
            Util.log('End of Service (No more trips found)');
            // Optionally clear line/route or show "Fahrt Ende"
        }
    }

    private async loadStopSequence(variant: string): Promise<boolean> {
        try {
            Util.log(`[loadStopSequence] Loading with variant: "${variant}" (Type: ${typeof variant})`);

            if (!this.linie) return false;

            // Use this.linie.LI_NR directly. this.linie is now the correct Variant (RecLid).
            const lidVerlaufEntries = await LidVerlauf.findAll({
                where: {
                    LI_NR: this.linie.LI_NR,
                    STR_LI_VAR: variant
                },
                order: [['LI_LFD_NR', 'ASC']]
            });

            if (lidVerlaufEntries.length === 0) {
                Util.log(`No stops found for variant ${variant} (LI_NR: ${this.linie.LI_NR})`);
                return false;
            }

            // Fallback ZNR_NR logic removed as RecLidVerlauf does not exist.
            // Destination must be derived from LidVerlauf entries (e.g. last stop) or ZNR_NR on LidVerlauf.

            this.currentStops = [];
            for (let i = 0; i < lidVerlaufEntries.length; i++) {
                const entry = lidVerlaufEntries[i];
                let recHp: RecHp | null = null;
                let destination: RecZnr | null = null;
                let announcement: RecAnr | null = null;

                // Stop Resolution (Manual because composite key association might fail)
                recHp = await RecHp.findOne({
                    where: {
                        ORT_NR: entry.ORT_NR,
                        ONR_TYP_NR: entry.ONR_TYP_NR
                        // HALTEPUNKT_NR removed from LidVerlauf, allows any HP (or we could assume 0)
                    },
                    include: [{
                        model: RecOrt,
                        as: 'recOrt'
                    }]
                });

                // Destination Resolution
                if (entry.ZNR_NR) {
                    destination = await RecZnr.findOne({ where: { ZNR_NR: entry.ZNR_NR } });
                }

                // Announcement Resolution
                if (entry.ANR_NR) {
                    announcement = await RecAnr.findOne({ where: { ANR_NR: entry.ANR_NR } });
                }

                // Attach to Instance
                if (recHp) entry.stop = recHp;
                if (destination) entry.destination = destination;
                if (announcement) entry.announcement = announcement;

                // Calculate Distance from Previous Stop
                if (i > 0) {
                    const prevStop = this.currentStops[i - 1];
                    // Find RecSel (Direction: Prev -> Curr)
                    // Note: RecSel ORT_NR is Start, SEL_ZIEL is End. 
                    // Use subplace IDs (ORT_NR) as verified previously.
                    const recSel = await RecSel.findOne({
                        where: {
                            ORT_NR: prevStop.ORT_NR,
                            SEL_ZIEL: entry.ORT_NR
                        }
                    });

                    if (recSel) {
                        (entry as any).distanceToPrevious = recSel.SEL_LAENGE;
                        Util.log(`  -> RecSel found: ${recSel.SEL_LAENGE}m`);
                    } else {
                        (entry as any).distanceToPrevious = 0;
                        Util.log(`  -> RecSel MISSING for ${prevStop.ORT_NR} -> ${entry.ORT_NR}`);
                    }
                } else {
                    (entry as any).distanceToPrevious = 0;
                }

                this.currentStops.push(entry);

                // DEBUG LOGGING
                Util.log(`Loaded Stop ${i}: Sequence=${entry.LI_LFD_NR}, ORT_NR=${entry.ORT_NR}`);
                if (entry.stop) {
                    Util.log(`  -> RecHp found: ID=${entry.stop.HALTEPUNKT_NR}, ORT_NR=${entry.stop.ORT_NR}`);
                    if (entry.stop.recOrt) {
                        Util.log(`  -> RecOrt found: ORT_NAME=${entry.stop.recOrt.ORT_NAME}`);
                    } else {
                        Util.log(`  -> RecOrt MISSING on RecHp!`);
                    }
                } else {
                    Util.log(`  -> RecHp MISSING!`);
                }
            }

            // Set current Route Number explicitly
            this.currentRouteNumber = variant;
            // Remove legacy fake route object
            this.route = undefined;

            if (this.currentStops.length > 0) {
                // Set Destination (Ziel) based on the last component of the route
                const lastStop = this.currentStops[this.currentStops.length - 1];
                if (lastStop.destination) {
                    Util.log(`Setting Destination to ${lastStop.destination.ZNR_NR} (${lastStop.destination.ZNR_TEXT})`);
                    this.ziel = lastStop.destination;
                } else if (lastStop.ZNR_NR) {
                    // Try to fetch if only ID is available
                    const dest = await RecZnr.findOne({ where: { ZNR_NR: lastStop.ZNR_NR } });
                    if (dest) {
                        this.ziel = dest;
                        Util.log(`Setting Destination to ${dest.ZNR_NR} (${dest.ZNR_TEXT})`);
                    }
                }

                // Set initial index
                this.stopIndex = 0;

                // Trigger updates
                Util.log('VDV Route Loaded. Stops:');
                this.currentStops.forEach((s, idx) => {
                    Util.log(`Stop ${idx}: ${s.stop?.recOrt?.ORT_NAME || 'Unknown'} (Nr: ${s.ORT_NR})`);
                });
                if (this.aTerminal) this.aTerminal.onSetRoute();
                if (this.bTerminal) this.bTerminal.onSetRoute();
                if (this.ziel && this.aTerminal) this.aTerminal.onSetZiel();
                if (this.ziel && this.bTerminal) this.bTerminal.onSetZiel();

                // Initialize Location Controller (VDV Logic)
                try {
                    await this.locationController.onSetRoute();
                    // Explicitly set the display for the Start Stop (Index 0)
                    // (onSetRoute sets stopIndex=0, arriveAtStop(Stop 0) usually does not update display if index=0 due to our new logic)
                    this.setHaltestelleVDV(this.currentStops[0]);
                } catch (e) {
                    Util.log("Error initializing LocationController", e);
                }

                // Force display update
                this.sendStopData();
                this.sendRouteDebugData();

                return true;
            } else {
                return false;
            }

        } catch (error) {
            Util.log('Error loading Stop Sequence:', error);
            return false;
        }
    }


    advanceFromStart() {
        if (this.stopIndex === 0 && this.currentStops && this.currentStops.length > 1) {
            Util.log('Departed Start Stop (Fangradius exited). Auto-Advancing to Stop 1.');
            this.stopIndex = 1;
            this.setHaltestelleVDV(this.currentStops[1]);
            this.playAnnouncementForRouteStop(this.currentStops[1]);
        }
    }

    skipStop() {
        Util.log(`skipStop called.StopIndex: ${this.stopIndex}.CurrentStops: ${this.currentStops ? this.currentStops.length : 0} `);
        if (this.currentStops && this.currentStops.length > 0) {
            // VDV / RData
            if (this.stopIndex < this.currentStops.length - 1) {
                // Arrive at the PREVIOUS upcoming stop (which is now current)
                this.locationController.arriveAtStop(this.currentStops[this.stopIndex], false);

                this.stopIndex++;
                Util.log(`Advancing to stop index ${this.stopIndex}: ${this.currentStops[this.stopIndex].stop?.recOrt?.ORT_NAME || 'Unknown'} `);
                this.setHaltestelleVDV(this.currentStops[this.stopIndex]);
                this.playAnnouncementForRouteStop(this.upcomingStop);
            } else {
                // End of trip reached
                Util.log('End of trip reached in skipStop');
                this.loadNextTrip();
            }
        } else if (this.route && this.stopIndex < (this.route.stops.length) - 1) {
            // Legacy
            this.stopIndex = this.stopIndex + 1
            this.setHaltestelle(this.route.stops[this.stopIndex])
            this.playAnnouncementForRouteStop(this.route.stops[this.stopIndex])
            this.locationController.arriveAtStop(this.route.stops[this.stopIndex], false)
        }
    }

    public playAnnouncementForRouteStop(routeStop: any) {
        if (this.deviceConfig.external_announcements) {
            if (routeStop.announcement && routeStop.announcement.number) {
                this.sendTelegram(TelegramGenerator.DS036(routeStop.announcement.number));
            }
        } else {
            if (routeStop.announcement) {
                // Determine filename (VDV specific logic: use mapped fileName only)
                let fileName = routeStop.announcement.fileName;

                if (fileName) {
                    const announcementMock = { fileName: fileName, number: routeStop.announcement.number || 0 } as any;
                    this.audioController.playAnnouncement(announcementMock, () => {
                        Util.log('Announcement finished');
                    })
                }
            }
        }
    }


    setHaltestelle(stop: any) {
        Util.log('setting stop to', stop);
        this.sendStopData()

        if (this.aTerminal) {
            this.aTerminal.onSetHaltestelle()
        }
        if (this.bTerminal) {
            this.bTerminal.onSetHaltestelle()
        }


    }

    arriveAtStop(routeStop: LidVerlauf) {
        if (this.currentStops && this.currentStops.length > 0) {
            // VDV Logic: Find stop by ORT_NR
            const targetOrtNr = routeStop.ORT_NR;
            const index = this.currentStops.findIndex(s => s.ORT_NR == targetOrtNr);

            if (index >= 0) {
                // We arrived at this stop.
                // Advance index if not last stop
                // AND if not start stop (Fangradius logic: Stay at Stop 0 until departed)

                // Fangradius logic: If at Start Stop (Index 0), just wait.
                if (index === 0) {
                    Util.log('Arrived at Start Stop. Waiting for departure (Fangradius)...');
                    return;
                }

                // Normal advancement logic
                if (index + 1 < this.currentStops.length) {
                    this.stopIndex = index + 1;
                    this.setHaltestelleVDV(this.currentStops[this.stopIndex]);

                    // Trigger announcement for the new upcoming stop (Next Stop)
                    // Wait a brief moment for the display to update
                    setTimeout(() => {
                        this.playAnnouncementForRouteStop(this.currentStops[this.stopIndex]);
                    }, 500);
                } else {
                    Util.log('End of VDV trip reached.');
                    this.loadNextTrip();
                }
            }
        }
    }

    public getUpcomingStopShortId(): number {
        if (!this.upcomingStop || !this.upcomingStop.stop || !this.upcomingStop.stop.recOrt) return 0;

        const ortNr = this.upcomingStop.stop.recOrt.ORT_NR;
        const parentId = this.upcomingStop.stop.recOrt.ORT_REF_ORT || Math.floor(ortNr / 10000);
        return parentId % 1000;
    }

    private sendStopData() {
        if (this.upcomingStop) {
            const shortId = this.getUpcomingStopShortId();
            this.sendTelegram(TelegramGenerator.DS010(shortId));
            // Haltestellennummer Perlenschnur        
            this.sendTelegram(TelegramGenerator.DS010a(shortId));
        }

        // Haltestellenname
        this.sendTelegram(TelegramGenerator.DS003c(this.stopName))


        // Haltestellenname
        this.sendTelegram(TelegramGenerator.DS009c(this.stopName))


        // Sonderoption DS021_STOP_NAME - Haltestellenname in DS021
        if (this.deviceConfig.DS021_STOP_NAME) {
            for (var i = 0; i < this.deviceConfig.DS021_STOP_NAME.length; i++) {
                // Use unified stopName getter to avoid crash
                this.sendTelegram(TelegramGenerator.DS021(this.deviceConfig.DS021_STOP_NAME[i], this.stopName));
            }
        }
        // Haltestellennummer 4 stellig
        if (this.upcomingStop && this.upcomingStop.stop && this.upcomingStop.stop.recOrt) {
            const ortNr = this.upcomingStop.stop.recOrt.ORT_NR;
            // Logic: ParentID (Ref or Prefix) -> Last 3 digits
            const parentId = this.upcomingStop.stop.recOrt.ORT_REF_ORT || Math.floor(ortNr / 10000);
            const shortId = parentId % 1000;
            this.sendTelegram(TelegramGenerator.DS010(shortId));
            // Haltestellennummer Perlenschnur        
            this.sendTelegram(TelegramGenerator.DS010a(shortId));
        }

        // Haltestellenindex
        this.sendTelegram("x2" + (this.stopIndex + 1).toString().padStart(3, "0"))
        // Haltestellenindex Haltestellenindex Endhaltestelle
        // Use VDV count if active
        if (this.currentStops && this.currentStops.length > 0) {
            this.sendTelegram(TelegramGenerator.DS010c(this.currentStops.length - 1))
        } else if (this.route != undefined) {
            this.sendTelegram(TelegramGenerator.DS010c(this.route.stops.length - 1))
        }
    }

    private getRouteDebugPayload(): string {
        const stopsPayload = this.currentStops.map((s, index) => {
            return {
                seq: index + 1,
                name: s.stop?.recOrt?.ORT_NAME || 'Unknown',
                ortNr: s.ORT_NR,
                parentId: s.stop?.recOrt?.ORT_REF_ORT || Math.floor(s.ORT_NR / 10000),
                distance: (s as any).distanceToPrevious || 0,
                status: (index === this.stopIndex) ? 'Next' : ''
            };
        });

        return JSON.stringify({
            channel: 'ROUTE_DEBUG',
            data: {
                stops: stopsPayload,
                currentIndex: this.stopIndex - 1,
                upcomingIndex: this.stopIndex
            }
        });
    }

    public sendRouteDebugData() {
        if (this.currentStops.length === 0) return;

        const payload = this.getRouteDebugPayload();
        Util.log(`Broadcasting ROUTE_DEBUG with ${this.currentStops.length} stops.`);
        this.sendToWebsocket(payload);
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