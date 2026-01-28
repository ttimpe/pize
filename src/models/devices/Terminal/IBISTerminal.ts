import { TerminalDisplayMode } from './../../../enums/IBISTerminalDisplayMode';
import { IBISTerminalKey } from '../../../enums/IBISTerminalKey';
import { IBISTerminalKeyMapping } from './IBISTerminalKeyMapping';
import { IBISTerminalKeyAction } from './IBISTerminalKeyAction';


import { IBISControllerInterface } from '../../../controllers/IBISControllerInterface';
import { TelegramGenerator } from '../../../IBISTelegramGenerator';
import { IBISTerminalMode } from './IBISTerminalMode';
import { IBISTerminalConfiguration } from './IBISTerminalConfiguration';
import { IBISTelegram } from '../../../extensions/IBISTelegram';
import { Util } from '../../../util';
import { AudioController } from '../../../controllers/AudioController';
import { DeviceConfig } from '../DeviceConfig';
import { Meldung } from '../../database/Meldung';
import { LidVerlauf } from '../../database/VDV/LidVerlauf';
import { IBISTestFunction } from '../../../enums/IBISTestFunction';

class IBISTerminal {
    private isPrimary: boolean = true
    private lines: string[] = ['', '']
    private previousDisplayMode = TerminalDisplayMode.None;
    private statusOverrideText?: string;
    private statusOverrideBlinking: boolean = false
    private currentMeldung?: Meldung
    private currentWeisung: string = ''
    mode: IBISTerminalMode = IBISTerminalMode.FUNCTION
    private deviceConfig: DeviceConfig = require('../../../../device_config.json')

    // TEIN
    public isActive: boolean = false
    public firstActivation: boolean = true
    // active function definition
    currentDisplayMode: TerminalDisplayMode = TerminalDisplayMode.None

    private isInTestMode: boolean = false;

    public errors: string[] = [];

    private get terminalLetter(): string {
        if (this.isPrimary) {
            return 'm'
        } else {
            return 't'
        }
    }

    private get statusQueryTelegram(): IBISTelegram {
        if (this.isPrimary) {
            return TelegramGenerator.DS040a(this.mode)
        } else {
            return TelegramGenerator.DS040b(this.mode)
        }
    }

    private getActionForKey(key: IBISTerminalKey): IBISTerminalKeyMapping {
        return this.terminalConfig.actions.find((mapping) => key == mapping.key)
    }

    private getAction(action: IBISTerminalKeyAction): IBISTerminalKeyMapping {
        return this.terminalConfig.actions.find((mapping) => action == mapping.action)
    }


    queryStatus() {
        this.ibisController.sendTelegram(this.statusQueryTelegram)
    }

    onReceiveTelegram(telegram: IBISTelegram) {
        // Number returned from the terminal
        Util.log('received')

        if (telegram.startsWith(this.terminalLetter + '?') && telegram.length > 2) {
            this.isActive = true;
            Util.log('got number')
            this.onNumber(telegram.substring(2))
        } else if (telegram.startsWith(this.terminalLetter + 'Q')) {
            // status reply
            this.isActive = true;
        }
        // terminal not active but on bus
        else if (telegram.startsWith(this.terminalLetter + 'A')) {
            Util.log('Terminal not active');
            this.isActive = false
            this.setDisplayMode(TerminalDisplayMode.None)
        } else if (telegram.startsWith(this.terminalLetter) && telegram.length == 2) {
            // Handle keys
            this.isActive = true
            this.onKeyPress(telegram[1] as IBISTerminalKey)

        }
    }





    constructor(private ibisController: IBISControllerInterface, isPrimary: boolean = true, private terminalConfig: IBISTerminalConfiguration) {
        this.ibisController = ibisController
        this.isPrimary = isPrimary
        this.terminalConfig = terminalConfig
        this.initTerminal()
    }

    private initTerminal() {
        // clear screen, ignore inputs before this
        this.setText(0, ''.padEnd(16))
        this.updateSecondLine()

        this.setDisplayMode(TerminalDisplayMode.LinieKurs)
    }



    private onKeyPress(key?: IBISTerminalKey) {
        if (key) {
            if (key != 'Q') {
                // This will change the display mode of the terminal and fire a command
                // Check if we have predefined text in the device config for this
                const keyConfig = this.getActionForKey(key)
                if (keyConfig) {
                    // we have a config for this key

                    // Fix: If we are in Zuglaenge mode or TestFunktion mode, do not execute number keys as functions (e.g. 1 -> Besetzgrad)
                    if ((this.currentDisplayMode === TerminalDisplayMode.Zuglaenge || this.currentDisplayMode === TerminalDisplayMode.TestFunktion) && !isNaN(parseInt(key))) {
                        Util.log('Ignoring key function action in Zuglaenge/TestFunktion mode for key: ' + key);
                        return;
                    }


                    // Set text after mode of terminal is set

                    if (keyConfig) {
                        // we have a config
                        if (keyConfig.action) {
                            switch (keyConfig.action) {
                                case IBISTerminalKeyAction.BESETZGRAD:
                                    this.onPressBesetzgrad()
                                    break
                                case IBISTerminalKeyAction.UHRZEIT_DATUM:
                                    this.onPressDatumUhrzeit()
                                    break
                                case IBISTerminalKeyAction.NAECHSTE_HST:
                                    this.onPressNaechsteHaltestelle()
                                    break
                                case IBISTerminalKeyAction.HALTESTELLE:
                                    this.onPressHaltestelle()
                                    break
                                case IBISTerminalKeyAction.RICHTUNG:
                                    this.onPressRichtung()
                                    break
                                case IBISTerminalKeyAction.MELDUNG:
                                    this.onPressMeldung()
                                    break
                                case IBISTerminalKeyAction.LINIE_KURS:
                                    this.onPressLinieKurs()
                                    break
                                case IBISTerminalKeyAction.ROUTE:
                                    this.onPressRoute()
                                    break
                                case IBISTerminalKeyAction.ZIEL:
                                    this.onPressZiel()
                                    break
                                case IBISTerminalKeyAction.WEICHE_LINKS:
                                    this.onPressFahrtrichtungLinks()
                                    break
                                case IBISTerminalKeyAction.WEICHE_GERADE:
                                    this.onPressFahrtrichtungGerade()
                                    break
                                case IBISTerminalKeyAction.WEICHE_RECHTS:
                                    this.onPressFahrtrichtungRechts()
                                    break
                                case IBISTerminalKeyAction.ANSAGE_STUMM:
                                    this.onPressAnsageStumm()
                                    break
                                case IBISTerminalKeyAction.ANSAGE_AUSSEN:
                                    this.onPressAnsageAussen()
                                    break
                                case IBISTerminalKeyAction.LST_AN_FG:
                                    this.onPressLstAnFG()
                                    break
                                case IBISTerminalKeyAction.UNFALL:
                                    this.onPressUnfall()
                                    break
                                case IBISTerminalKeyAction.HST_WIEDERHOLEN:
                                    this.onPressHstWiederholen()
                                    break
                                case IBISTerminalKeyAction.ANSAGE_INNEN:
                                    this.onPressAnsageInnen()
                                    break
                                case IBISTerminalKeyAction.SPRECHWUNSCH:
                                    this.onPressSprechwunsch()
                                    break
                            }
                        }
                    }
                } else {
                    if (key == '/') {
                        this.onPressDelete()
                    }
                    if (key == '?') {
                        // Taste Quittierung gedrückt
                        this.onPressQuittierung()
                    }
                }
            }
        } else {




        }
    }

    private onPressDelete() {
        if (this.currentDisplayMode == TerminalDisplayMode.Fehler) {
            this.errors.pop()
            if (this.errors.length > 0) {
                this.showError();
            } else {
                this.setDisplayMode(this.previousDisplayMode)

            }
        }
        // TFS Back Navigation
        else if (this.isInTestMode) {
            // Always return to main TFS menu
            this.enterTFSMode();
        }
        else {
            this.setDisplayMode(TerminalDisplayMode.None)
        }
    }

    private onPressQuittierung() {
        if (this.currentDisplayMode == TerminalDisplayMode.MeldungBestaetigen) {
            // TODO: Meldungsnummern
            this.setStatus('-ML' + this.currentMeldung.number + '-', true)
            this.setDisplayMode(TerminalDisplayMode.None)
        }
        if (this.currentDisplayMode == TerminalDisplayMode.Zuglaenge) {
            Util.log('Confirmed Zuglaenge (Default/Current)');
            // Default 1 if just confirmed without input, or take existing
            let current = this.ibisController.zuglaenge || 1;
            this.setZuglaenge(current.toString());
        }
        if (this.currentDisplayMode == TerminalDisplayMode.Fehler) {
            this.errors.pop()
            if (this.errors.length > 0) {
                this.showError();
            } else {
                this.setDisplayMode(this.previousDisplayMode)

            }
        }
    }
    private onPressFahrtrichtungLinks() {
        // Set Weiche Links on vehicle
        if (!this.ibisController.currentRouteNumber) {
            this.setDisplayMode(TerminalDisplayMode.FahrtrichtungLinks)
        }
    }
    private onPressZiel() {
        this.setDisplayMode(TerminalDisplayMode.Ziel)
    }
    private onPressRoute() {
        this.setDisplayMode(TerminalDisplayMode.Route)
    }
    private onPressLinieKurs() {
        this.setDisplayMode(TerminalDisplayMode.LinieKurs)
    }
    private onPressFahrtrichtungGerade() {
        if (!this.ibisController.currentRouteNumber) {
            this.setDisplayMode(TerminalDisplayMode.FahrtrichtungGerade)
        }
    }
    private onPressFahrtrichtungRechts() {
        if (!this.ibisController.currentRouteNumber) {
            this.setDisplayMode(TerminalDisplayMode.FahrtrichtungRechts)
        }
    }
    private onPressAnsageStumm() {
        this.ibisController.toggleAnnouncementsMuted();
        this.setDisplayMode(TerminalDisplayMode.AnsageStumm)
    }
    private onPressLstAnFG() {
        this.setDisplayMode(TerminalDisplayMode.LStAnFG)
    }
    private onPressUnfall() {
        this.setStatus('-UNF-', true)
        this.ibisController.sendUnfall()
    }
    private onPressHstWiederholen() {
        this.ibisController.repeatStopAnnouncement();
        Util.log('Repeat playback of current stop')
    }
    private onPressAnsageInnen() {
        if (this.currentDisplayMode != TerminalDisplayMode.AnsageInnen) {
            this.setDisplayMode(TerminalDisplayMode.AnsageInnen)
            this.ibisController.audioController.setAnsageInnen();
        } else {
            this.ibisController.audioController.unsetAnsage();
            this.setDisplayMode(TerminalDisplayMode.None)
        }

    }
    private onPressAnsageAussen() {
        if (this.currentDisplayMode != TerminalDisplayMode.AnsageAussen) {
            this.setDisplayMode(TerminalDisplayMode.AnsageAussen)
            this.ibisController.audioController.setAnsageAussen();
        } else {
            this.ibisController.audioController.unsetAnsage();
            this.setDisplayMode(TerminalDisplayMode.None)
        }

    }
    /* Sprechwunsch:
        - Im Datenfunkbetrieb blinkend -SPR- bis quittiert von VZ
        - Sobald quittiert von VZ -SPR- konstant
        - Wenn Sprechverbindung aufgebaut -VLS- konstant
        - Im Sprechfunkbetrieb direkt -VLS- konstant
    */

    private onPressSprechwunsch() {
        // TODO: Unterscheidung Datenfunk / Sprechfunk
        Util.log('Sprechwunsch')
        this.setStatus('-SPR-', true)

        this.ibisController.sendSprechwunsch()
    }

    private onPressMeldung() {
        this.setDisplayMode(TerminalDisplayMode.Meldung)
    }
    private onPressRichtung() {
        this.setDisplayMode(TerminalDisplayMode.Richtung)
    }
    private onPressHaltestelle() {
        this.setDisplayMode(TerminalDisplayMode.Haltestelle)
    }
    private onPressNaechsteHaltestelle() {
        Util.log('forward stops')
        this.ibisController.skipStop()
    }

    private onPressDatumUhrzeit() {
        this.setDisplayMode(TerminalDisplayMode.DatumUhrzeit)
    }
    private showDateTime() {
        let d = new Date()
        let outputString = d.toLocaleDateString('de', { dateStyle: "short" }) + '   ' + d.toLocaleTimeString('de', { timeStyle: "short" })
        this.setText(0, outputString.padEnd(16))
        setTimeout(() => {
            if (this.currentDisplayMode == TerminalDisplayMode.DatumUhrzeit) {
                this.setDisplayMode(TerminalDisplayMode.None)
            }
        })
    }
    private onPressBesetzgrad() {
        this.setDisplayMode(TerminalDisplayMode.Besetzung)
    }

    private onNumber(numberString: string) {
        // Fix no input from number prompt
        if (!numberString) {
            numberString = '0'
        }
        // Switch based on DisplayMode of the terminal
        switch (this.currentDisplayMode) {
            case TerminalDisplayMode.Besetzung:
                this.setBesetzgrad(numberString)
                break;
            case TerminalDisplayMode.Haltestelle:
                this.setHaltestelle(numberString)
                break;
            case TerminalDisplayMode.Richtung:
                this.setRichtung(numberString)
                break;
            case TerminalDisplayMode.Meldung:
                this.setMeldung(numberString)
                break
            case TerminalDisplayMode.LinieKurs:
                this.setLinieKurs(numberString)
                if (this.firstActivation == true) {
                    this.setDisplayMode(TerminalDisplayMode.Zuglaenge)
                }
                break
            case TerminalDisplayMode.Route:
                this.setRoute(numberString)
                break
            case TerminalDisplayMode.Sonderzeichen:
                this.setSonderzeichen(numberString)
                break
            case TerminalDisplayMode.Ziel:
                this.setZiel(numberString)
                break
            case TerminalDisplayMode.Zuglaenge:
                this.setZuglaenge(numberString);
                break;
            case TerminalDisplayMode.TestFunktion:
                this.handleTFSSelection(parseInt(numberString));
                break;
            case TerminalDisplayMode.TestMelodie:
                this.playSound(parseInt(numberString));
                break;
            case TerminalDisplayMode.TestSprachkanal:
                this.ibisController.setRadioChannel('voice', parseInt(numberString));
                this.promptForRadioChannel('voice');
                break;
            case TerminalDisplayMode.TestDatenkanal:
                this.ibisController.setRadioChannel('data', parseInt(numberString));
                this.promptForRadioChannel('data');
                break;
            case TerminalDisplayMode.TestLSAKanal:
                this.ibisController.setRadioChannel('lsa', parseInt(numberString));
                this.promptForRadioChannel('lsa');
                break;
            case TerminalDisplayMode.TestOrtsmarke:
                // Read only
                break;
        }
    }

    private handleTFSSelection(code: number) {
        this.ibisController.executeTestFunction(code, this.isPrimary ? 'A' : 'B');
    }



    private setText(lineNumber: number = 0, text: string, mode: IBISTerminalMode = this.mode, x: number = 0) {
        text = text.substring(0, 16);
        this.lines[lineNumber] = text


        let telegram: IBISTelegram
        if (this.isPrimary) {
            telegram = TelegramGenerator.DS044a(mode, x, lineNumber, text)
        } else {
            telegram = TelegramGenerator.DS044b(mode, x, lineNumber, text)
        }
        this.ibisController.sendTelegram(telegram)
        this.ibisController.sendTelegram(telegram)
        this.ibisController.sendTelegram(telegram)
        this.ibisController.sendTelegram(telegram)
    }




    clearFirstLine() {
        this.mode = IBISTerminalMode.FUNCTION
        this.setText(0, " ".padEnd(16))
    }
    updateSecondLine() {
        if (this.isInTestMode) {
            // Special handling for Ortsmarke which uses line 1 (index 1) for logic
            if (this.currentDisplayMode == TerminalDisplayMode.TestOrtsmarke) {
                const status = this.ibisController.getLocationStatus();
                this.setText(1, "WEG      :" + status.weg.toString().padStart(5, ' '), IBISTerminalMode.FUNCTION);
                return;
            }
            this.setText(1, ''.padEnd(16), this.mode)
            return
        }


        let linie = '   '
        let kurs = this.ibisController.kurs.toString().padStart(2, '0')
        let ziel = '   '
        let hst = '   '
        let richtung = 'Z'

        /* Abweichung nur, wenn in RBL angemeldet, ansonsten leer */

        let abweichung = '    '
        // Wenn im funkrückfall, Kanal anzeigen
        if (this.ibisController.funkmodus == 2) {
            abweichung = ' K' + this.deviceConfig.RADIO.channels.voice.toString() + ' ';
        }

        if (this.ibisController.linie) {
            linie = this.ibisController.linie.LID_NR.toString().padStart(3, '0')
        }
        if (this.ibisController.ziel) {
            ziel = this.ibisController.ziel.ZNR_NR.toString().padStart(3, '0')
        }
        if (this.ibisController.upcomingStop) {
            const hstNum = this.ibisController.getUpcomingStopShortId();
            hst = hstNum.toString().padStart(3, '0')
        }
        // Richtungstext: H - Hin, R - Rück, Z - RaZzia
        if (this.ibisController.richtung) {
            switch (this.ibisController.richtung) {
                case 1:
                    richtung = 'H'
                    break;
                case 2:
                    richtung = 'R'
                    break;
                default:
                    richtung = 'Z'
                    break;
            }


        }
        // Statusfeld überprüfen. Falls wir eine Meldung absenden oder abgesendet haben, Status anzeigen
        if (this.statusOverrideText) {
            Util.log("Status text")
            if (this.statusOverrideBlinking) {
                this.setText(1, this.statusOverrideText, IBISTerminalMode.BLINKING_FUNCTION_NO_RECEIVE)
            } else {
                this.setText(1, this.statusOverrideText, IBISTerminalMode.FUNCTION_NO_RECEIVE)
            }
        } else {
            Util.log("Kein Statustext")
            // Normal Line & Kurs anzeigen
            this.setText(1, linie + kurs, IBISTerminalMode.FUNCTION)
        }
        // restlichen Text nicht blinkend darstellen
        this.setText(1, ziel + richtung + hst + abweichung, IBISTerminalMode.FUNCTION, 5)

    }
    // Statusfeld setzen
    public setStatus(statusText: string, isBlinking: boolean) {
        //this.setText(1, )
        this.statusOverrideText = statusText
        this.statusOverrideBlinking = isBlinking
        this.updateSecondLine()
    }

    private setBesetzgrad(number: string) {
        Util.log('set besetzgrad')
        const bg = parseInt(number)
        this.setStatus('-BG' + bg + '-', true)

        this.setDisplayMode(TerminalDisplayMode.None)

    }
    private setHaltestelle(number: string) {
        const stopNumber = parseInt(number)
        let wasFound = false

        // VDV Search
        if (this.ibisController.currentStops && this.ibisController.currentStops.length > 0) {
            for (let i = 0; i < this.ibisController.currentStops.length; i++) {
                const currentStop = this.ibisController.currentStops[i];
                // VDV Logic: Check ORT_NR
                const ortNr = currentStop.ORT_NR;

                if ((ortNr % 1000) == stopNumber) {
                    Util.log('Found stop (VDV ORT_NR Match): ', ortNr);
                    wasFound = true
                    this.ibisController.stopIndex = i
                    this.setDisplayMode(TerminalDisplayMode.None)
                    // Trigger update via controller? setDisplayMode.None does refreshText usually logic but updateSecondLine is cleaner
                    this.updateSecondLine();
                    return;
                }
            }
        }



        if (!wasFound) {
            Util.log('Did not find stop')
            this.throwError('FALSCHE HST.')
        }
    }

    promptForLinieKurs() {
        let action = this.getAction(IBISTerminalKeyAction.LINIE_KURS)
        this.mode = IBISTerminalMode.BLINKING_DIGITS
        let outputText = action.textLine1
        if (this.ibisController.linie) {
            outputText = action.textLine1.split(':')[0] + ":" + this.ibisController.linie.STR_LID.padStart(3, '0') + this.ibisController.kurs.toString().padStart(2, '0');
        }

        this.setText(0, outputText)
    }
    promptForBesetzgrad() {
        let action = this.getAction(IBISTerminalKeyAction.BESETZGRAD)
        this.mode = IBISTerminalMode.DIGITS
        this.setText(0, action.textLine1.padEnd(16))
    }
    promptForStopNumber() {
        let action = this.getAction(IBISTerminalKeyAction.HALTESTELLE)
        this.mode = IBISTerminalMode.DIGITS
        this.setText(0, action.textLine1.padEnd(16))
    }

    promptForDirection() {
        let action = this.getAction(IBISTerminalKeyAction.RICHTUNG)
        this.mode = IBISTerminalMode.DIGITS
        let outputText = action.textLine1
        if (this.ibisController.richtung != undefined) {
            outputText = action.textLine1.split(':')[0] + ":" + this.ibisController.richtung.toString();
        }

        this.setText(0, outputText.padEnd(16))
    }
    promptForRoute() {
        let action = this.getAction(IBISTerminalKeyAction.ROUTE)
        this.mode = IBISTerminalMode.DIGITS
        let outputText = action.textLine1
        if (this.ibisController.currentRouteNumber) {
            outputText = action.textLine1.split(':')[0] + ":" + this.ibisController.currentRouteNumber.padStart(3, '0');
        }

        this.setText(0, outputText.padEnd(16))
    }
    promptForDestination() {
        let action = this.getAction(IBISTerminalKeyAction.ZIEL)
        this.mode = IBISTerminalMode.DIGITS
        let outputText = action.textLine1
        if (this.ibisController.ziel) {
            outputText = action.textLine1.split(':')[0] + ":" + this.ibisController.ziel.ZNR_NR.toString().padStart(3, '0');
        }

        this.setText(0, outputText.padEnd(16))
    }

    // Abfrage der Zuglänge, nur bei ersten aufrüsten
    promptZuglaenge() {
        this.mode = IBISTerminalMode.DIGITS
        let outputText = "ZUGLÄNGE      :";
        if (this.ibisController.zuglaenge) {
            outputText += this.ibisController.zuglaenge.toString()
        } else {
            outputText += "1";
        }
        this.setText(0, outputText)
    }
    setWeicheLinks() {

    }
    setWeicheGerade() {

    }
    setWeicheRechts() {

    }
    setAnsageStumm() {

    }
    showMeldung() {
        this.mode = IBISTerminalMode.BLINKING_FUNCTION
        this.setText(0, this.currentMeldung.stringValue.padEnd(16), IBISTerminalMode.BLINKING_FUNCTION)

    }
    setAnsageAussen() {
        let action = this.getAction(IBISTerminalKeyAction.ANSAGE_AUSSEN)
        this.mode = IBISTerminalMode.FUNCTION
        let outputText = action.textLine1
        this.setText(0, outputText.padEnd(16))
    }
    setAnsageInnen() {
        let action = this.getAction(IBISTerminalKeyAction.ANSAGE_INNEN)
        this.mode = IBISTerminalMode.FUNCTION
        let outputText = action.textLine1
        this.setText(0, outputText.padEnd(16))
    }

    setLStAnFG() {

    }

    setUnfall() {

    }
    // Abfrage Meldungsnummer (1-stellig) 
    promptForMessage() {
        let action = this.getAction(IBISTerminalKeyAction.MELDUNG)
        this.mode = IBISTerminalMode.DIGITS
        this.setText(0, action.textLine1.padEnd(16))
    }
    skipStop() {

    }

    public setDisplayMode(displayMode: TerminalDisplayMode) {
        this.previousDisplayMode = this.currentDisplayMode
        this.currentDisplayMode = displayMode
        switch (displayMode) {
            case TerminalDisplayMode.Besetzung:
                this.promptForBesetzgrad()
                break
            case TerminalDisplayMode.NaechsteHaltestelle:
                this.skipStop()
                break
            case TerminalDisplayMode.HstNr:
                this.promptForStopNumber()
                break
            case TerminalDisplayMode.Richtung:
                this.promptForDirection()
                break
            case TerminalDisplayMode.Meldung:
                this.promptForMessage()
                break
            case TerminalDisplayMode.LinieKurs:
                this.promptForLinieKurs()
                break
            case TerminalDisplayMode.Route:
                this.promptForRoute()
                break
            case TerminalDisplayMode.Sonderzeichen:
                this.promptForSpecialCharacter()
                break
            case TerminalDisplayMode.Ziel:
                this.promptForDestination()
                break
            case TerminalDisplayMode.DatumUhrzeit:
                this.showDateTime()
                break
            case TerminalDisplayMode.None:
                this.showNormalMode()
                break
            case TerminalDisplayMode.FahrtrichtungLinks:
                this.setWeicheLinks()
                break
            case TerminalDisplayMode.FahrtrichtungGerade:
                this.setWeicheGerade()
                break
            case TerminalDisplayMode.FahrtrichtungRechts:
                this.setWeicheRechts()
                break
            case TerminalDisplayMode.AnsageStumm:
                this.setAnsageStumm()
                break
            case TerminalDisplayMode.AnsageAussen:
                this.setAnsageAussen()
                break
            case TerminalDisplayMode.LStAnFG:
                this.setLStAnFG()
                break
            case TerminalDisplayMode.Unfall:
                this.setUnfall()
                break
            case TerminalDisplayMode.AnsageInnen:
                this.setAnsageInnen()
                break
            case TerminalDisplayMode.Haltestelle:
                this.promptForStopNumber()
                break
            case TerminalDisplayMode.Fehler:
                this.showError();
                break
            case TerminalDisplayMode.MeldungBestaetigen:
                this.showMeldung()
                break
            case TerminalDisplayMode.Weisung:
                this.showWeisung()
                break
            case TerminalDisplayMode.Zuglaenge:
                this.promptZuglaenge()
                break
            case TerminalDisplayMode.TestFunktion:
                this.promptForTestFunction();
                break;
            case TerminalDisplayMode.TestMelodie:
                this.promptForMelody();
                break;
            case TerminalDisplayMode.TestSprachkanal:
                this.promptForRadioChannel('voice');
                break;
            case TerminalDisplayMode.TestDatenkanal:
                this.promptForRadioChannel('data');
                break;
            case TerminalDisplayMode.TestLSAKanal:
                this.promptForRadioChannel('lsa');
                break;
            case TerminalDisplayMode.TestOrtsmarke:
                this.promptForLocation();
                break;
        }
    }

    private setRichtung(number: string) {
        this.ibisController.setRichtung(parseInt(number))
        this.setDisplayMode(TerminalDisplayMode.None)
    }

    /* Weisung anzeigen, 10 Sekunden */

    private showWeisung() {

        this.setText(0, this.currentWeisung.padEnd(16), IBISTerminalMode.FUNCTION)
        this.playSound(this.deviceConfig.terminal_config.sounds.WEISUNG)
        setTimeout(() => {
            this.currentWeisung = ''
            this.setDisplayMode(TerminalDisplayMode.None)
        }, 10000)
    }




    public setWeisung(weisung: string) {
        this.currentWeisung = weisung
        this.setDisplayMode(TerminalDisplayMode.Weisung)
    }



    private async setMeldung(number: string) {
        Util.log('Zeige Meldung Nr.', number)
        let meldungNumber = parseInt(number)


        let meldung = await Meldung.findOne({
            where: {
                'number': meldungNumber
            }
        })

        this.currentMeldung = meldung
        Util.log('Meldung: ', meldung.stringValue)
        this.setDisplayMode(TerminalDisplayMode.MeldungBestaetigen)
        /* TODO:
        Meldung anzeigen zur Kontrolle, muss von FP bestätigt werden
        Durch Bestätigung an VZ senden (Funktelegramm)
        oberer Zeile löschen
        -ML(X)- blinkend in Statuszellen anzeigen
        sobald Meldung bestätigt, ML(X) statisch weiter 15 Sekunden anzeigen
        this.playSound(parseInt(number));
        this.setDisplayMode(TerminalDisplayMode.None)
    */

    }

    private async setLinieKurs(number: string) {
        let linie: string
        let kurs: number
        Util.log('Set Linie/Kurs', number)
        // TODO: Logik für kurze Linien/Kurse
        if (number.length >= 5) {
            // LLLKK
            linie = parseInt(number.substring(0, 3)).toString()
            kurs = parseInt(number.substring(3, 5))
        } else if (number.length == 4) {
            // LLKK
            linie = parseInt(number.substring(0, 2)).toString()
            kurs = parseInt(number.substring(2, 4))
        } else {
            // Just Line
            linie = parseInt(number).toString()
            kurs = 0
        }
        Util.log('Kurs', kurs)
        await this.ibisController.setLine(linie)
        const scheduleFound = await this.ibisController.setCourseNumber(kurs)
        if (!scheduleFound) {
            Util.log('No schedule found for Line/Kurs, prompting for Route');
            this.promptForRoute(); // Ask for specific Route (Fahrt-Nr/Lid-Verlauf)
        } else if (!this.firstActivation) {
            this.setDisplayMode(TerminalDisplayMode.None)
        }
    }

    public refreshText() {
        if (this.isInTestMode) {
            // Force refresh of current mode (Ortsmarke Updates etc)
            this.setDisplayMode(this.currentDisplayMode);
        } else if (this.currentDisplayMode == TerminalDisplayMode.None) {
            this.showNormalMode()
        }
    }

    private async setRoute(number: string) {
        let route = parseInt(number)
        const didSet = await this.ibisController.setRoute(route)
        this.mode = IBISTerminalMode.FUNCTION

        if (!didSet) {
            Util.log('Could not find route')
            this.throwError('FALSCHE ROUTE')
        } else {

        }
        this.setDisplayMode(TerminalDisplayMode.None)
    }

    private setZuglaenge(laenge: string) {
        let zuglaenge = parseInt(laenge)
        this.ibisController.setZuglaenge(zuglaenge)
        // Zuglaenge gesetzt, fertig mit ersten aufrüsten
        this.firstActivation = false
        this.setDisplayMode(TerminalDisplayMode.None)
    }

    private async setSonderzeichen(number: string) {
        Util.log('set character')
        let sonderzeichen = parseInt(number)
        if (sonderzeichen != 0) {
            const res = await this.ibisController.setSpecialCharacter(sonderzeichen)
            if (!res) {
                this.throwError('FALSCHES SONDERZ')

            } else {
                this.setDisplayMode(TerminalDisplayMode.Sonderzeichen)
            }
        } else {
            await this.ibisController.setSpecialCharacter(0);
        }
        this.setDisplayMode(TerminalDisplayMode.None)
    }

    private promptForSpecialCharacter() {
        let action = this.getAction(IBISTerminalKeyAction.SONDERZEICHEN)
        this.mode = IBISTerminalMode.DIGITS
        this.setText(0, action.textLine1)
    }

    private async setZiel(number: string) {
        let ziel = parseInt(number)
        const res = await this.ibisController.setZiel(ziel)
        if (!res) {
            this.throwError('FALSCHES ZIEL')

        } else {
            this.setDisplayMode(TerminalDisplayMode.Sonderzeichen)
        }
    }

    private showNormalMode() {
        this.mode = IBISTerminalMode.FUNCTION
        if (this.ibisController.upcomingStop != null) {
            const stop = this.ibisController.upcomingStop;
            let name = "";
            if (stop instanceof LidVerlauf) {
                name = stop.stop?.recOrt?.ORT_REF_ORT_NAME || "";
            }
            this.setText(0, name.toUpperCase().padEnd(16))
        } else {
            this.setText(0, ''.padEnd(16))
        }
        this.updateSecondLine()
    }

    throwError(errorText: string) {
        if (!this.errors.includes(errorText)) {
            this.errors.push(errorText)

            // If already in error mode, just update the text (showError)
            // If not, switch mode (which saves previous mode)
            if (this.currentDisplayMode == TerminalDisplayMode.Fehler) {
                this.showError();
            } else {
                this.setDisplayMode(TerminalDisplayMode.Fehler)
            }
        }
    }
    showError() {
        this.mode = IBISTerminalMode.BLINKING_FUNCTION;
        this.playSound(this.deviceConfig.terminal_config.sounds.FEHLER);
        this.setText(0, this.errors[this.errors.length - 1].padEnd(16))
    }

    playSound(soundNumber: number) {
        let telegram: IBISTelegram;
        if (this.isPrimary) {

            telegram = TelegramGenerator.DS045a(this.mode, soundNumber);
        } else {
            telegram = TelegramGenerator.DS045b(this.mode, soundNumber);
        }
        this.ibisController.sendTelegram(telegram)
    }

    onSetHaltestelle() {
        if (this.currentDisplayMode == TerminalDisplayMode.None) {
            if (this.ibisController.upcomingStop) {
                const stop = this.ibisController.upcomingStop;
                let name = "";
                if (stop instanceof LidVerlauf) {
                    name = stop.stop?.recOrt?.ORT_REF_ORT_NAME || "";
                }
                this.setText(0, name.toUpperCase().padEnd(16))
            }
        }
        this.updateSecondLine()
    }
    onSetRoute() {
        Util.log('onSetRoute called');
        this.updateSecondLine()

        if (this.ibisController.currentStops && this.ibisController.currentStops.length > 0) {
            const firstStop = this.ibisController.currentStops[0];
            const lastStop = this.ibisController.currentStops[this.ibisController.currentStops.length - 1];

            // VDV: Use stop.recOrt.ORT_NAME
            const firstName = firstStop.stop?.recOrt?.ORT_NAME || 'Unknown';
            const lastName = lastStop.stop?.recOrt?.ORT_NAME || 'Unknown';

            this.setText(0, firstName.toUpperCase().padEnd(16));
            setTimeout(() => {
                this.setText(0, lastName.toUpperCase().padEnd(16));
                setTimeout(() => {
                    this.setDisplayMode(TerminalDisplayMode.None);
                }, 500);
            }, 500);
        } else if (this.ibisController.route != undefined) {
            // Legacy fallback
            this.setText(0, this.ibisController.route.stops[0].stop.information.shortName.toUpperCase().padEnd(16));
            setTimeout(() => {
                this.setText(0, this.ibisController.route.stops[this.ibisController.route.stops.length - 1].stop.information.shortName.toUpperCase().padEnd(16))
                setTimeout(() => {
                    this.setDisplayMode(TerminalDisplayMode.None);
                }, 500);
            }, 500);
        }
    }
    onSetZiel() {
        this.updateSecondLine()
    }
    onSetRichtung() {
        this.updateSecondLine()
    }
    onSetKurs() {
        this.updateSecondLine()
    }

    onAbmeldung() {
        // Abmeldung, eventuell "ABMELDUNG... blinkedn anzeigen"
    }

    public enterTFSMode() {
        this.isInTestMode = true;
        this.setDisplayMode(TerminalDisplayMode.TestFunktion);
    }

    public exitTFSMode() {
        this.isInTestMode = false;
        this.setDisplayMode(TerminalDisplayMode.None);
    }

    private promptForTestFunction() {
        this.mode = IBISTerminalMode.BLINKING_DIGITS;
        this.setText(0, "TESTFUNKTION:   ");
        this.updateSecondLine();
    }

    private promptForMelody() {
        this.mode = IBISTerminalMode.DIGITS; // Or Blinking? Usually melody is instant 1-9.
        this.setText(0, "MELODIE:        ");
        this.updateSecondLine();
    }

    private promptForRadioChannel(type: 'voice' | 'data' | 'lsa') {
        this.mode = IBISTerminalMode.BLINKING_DIGITS;
        const current = this.ibisController.getRadioChannel(type);
        let label = "KANAL:";
        if (type == 'voice') label = "SPRACHKANAL:";
        if (type == 'data') label = "DATENKANAL:";
        if (type == 'lsa') label = "LSA-KANAL:";

        let text = label + current.toString().padStart(16 - label.length, ' ');
        // If label is long, padding might be tricky.
        // SPRACHKANAL: is 12 chars. + 4 chars for number.

        this.setText(0, text);
        this.updateSecondLine();
    }

    private promptForLocation() {
        this.mode = IBISTerminalMode.FUNCTION; // Read Only
        const status = this.ibisController.getLocationStatus();
        this.setText(0, "ORTSMARKE:" + status.ortNr.toString().padStart(6, ' '));
        this.updateSecondLine(); // Will draw WEG on line 1
    }
}
export { IBISTerminal }
