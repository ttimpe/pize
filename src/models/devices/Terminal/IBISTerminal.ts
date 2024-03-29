import { IBISTerminalKey } from './../../../enums/IBISTerminalKey';
import { TerminalDisplayMode } from './../../../enums/IBISTerminalDisplayMode';
import { StopInformation } from '../../database/StopInformation';
import { Vehicle } from "../../../Vehicle"
import { DeviceConfig } from '../DeviceConfig';
import { IBISTerminalKeyMapping } from './IBISTerminalKeyMapping';
import { IBISTerminalKeyAction } from './IBISTerminalKeyAction';

import { Line } from '../../database/Line';
import { IBISController } from '../../../controllers/IBISController';
import { TelegramGenerator } from '../../../TelegramGenerator';
import { IBISTerminalMode } from './IBISTerminalMode';
import { IBISTerminalConfiguration } from './IBISTerminalConfiguration';
import { IBISTelegram } from '../../../extensions/IBISTelegram';

class IBISTerminal {
    private isPrimary: boolean = true
    private lines: string[] = ['', '']
    mode: IBISTerminalMode = IBISTerminalMode.FUNCTION

     // active function definition
    currentDisplayMode :TerminalDisplayMode = TerminalDisplayMode.None
    

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

    private getKeyMappingForKey(key: IBISTerminalKey): IBISTerminalKeyMapping {

        return this.terminalConfig.keymap.find((mapping) => key == mapping.key)
    }

    queryStatus() {
            this.ibisController.sendTelegram(this.statusQueryTelegram)
    }

    onReceiveTelegram(telegram: IBISTelegram) {
        // Number returned from the terminal
        console.log('received')
        if (telegram.startsWith(this.terminalLetter + '?')) {
            console.log('got number')
            this.onNumber(telegram.substring(2))
        } else if (telegram.startsWith(this.terminalLetter) && telegram.length == 2) {
            // Handle keys
            this.onKeyPress(telegram[1] as IBISTerminalKey)

        } else {
            console.log('cannot handle', telegram)
        }
    }


   
    

    constructor(private ibisController: IBISController, isPrimary: boolean = true, private terminalConfig: IBISTerminalConfiguration) {
        this.ibisController = ibisController
        this.isPrimary = isPrimary
        this.terminalConfig = terminalConfig
        this.initTerminal()
    }

    private initTerminal() {
        // clear screen, ignore inputs before this
        this.setText(0,'')
        this.setText(0,'')
    }
    

    private onKeyPress(key?: IBISTerminalKey) {
        if (key && key != 'Q') {
            // This will change the display mode of the terminal and fire a command
            // Check if we have predefined text in the device config for this
            const keyConfig = this.getKeyMappingForKey(key)
            if (keyConfig) {
                // we have a config for this key
                if (keyConfig.isPrompt) {
                    if (keyConfig.isBlinking) {
                        this.mode = IBISTerminalMode.BLINKING_DIGITS
                    } else {
                        this.mode = IBISTerminalMode.DIGITS
                    }
                } else {
                    if (keyConfig.isBlinking) {
                        this.mode = IBISTerminalMode.BLINKING_FUNCTION
                    } else {
                        this.mode = IBISTerminalMode.FUNCTION
                    }
                }
                this.queryStatus()
                // Set text after mode of terminal is set
                this.setText(0, keyConfig.textLine1)

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
                                this.onPressWeicheLinks()
                                break
                            case IBISTerminalKeyAction.WEICHE_GERADE:
                                this.onPressWeicheGerade()
                                break
                            case IBISTerminalKeyAction.WEICHE_RECHTS:
                                this.onPressWeicheRechts()
                                break
                            case IBISTerminalKeyAction.ANSAGE_STUMM:
                                this.onPressAnsageStumm()
                                break
                            case IBISTerminalKeyAction.ANSAGE_AUSSEN:
                                this.onPressAnsageInnen()
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
            }
        }
    }
    private onPressWeicheLinks() {
        // Set Weiche Links on vehicle
        throw new Error('Method not implemented.');
    }
    private onPressZiel() {
        this.currentDisplayMode = TerminalDisplayMode.Ziel
    }
    private onPressRoute() {
        this.currentDisplayMode = TerminalDisplayMode.Route
    }
    private onPressLinieKurs() {
       this.currentDisplayMode = TerminalDisplayMode.LinieKurs
    }
    private onPressWeicheGerade() {
        this.currentDisplayMode = TerminalDisplayMode.WeicheGerade
    }
    private onPressWeicheRechts() {
        this.currentDisplayMode = TerminalDisplayMode.WeicheRechts
        throw new Error('Method not implemented.');
    }
    private onPressAnsageStumm() {
        this.currentDisplayMode = TerminalDisplayMode.AnsageStumm
    }
    private onPressLstAnFG() {
        this.currentDisplayMode = TerminalDisplayMode.LStAnFG
    }
    private onPressUnfall() {
        this.currentDisplayMode = TerminalDisplayMode.Unfall
    }
    private onPressHstWiederholen() {
        console.log('Repeat playback of current stop')
    }
    private onPressAnsageInnen() {
        this.currentDisplayMode = TerminalDisplayMode.AnsageInnen
    }
    private onPressSprechwunsch() {
        throw new Error('Method not implemented.');
    }
    private onPressMeldung() {
        this.currentDisplayMode = TerminalDisplayMode.Meldung
    }
    private onPressRichtung() {
        this.currentDisplayMode = TerminalDisplayMode.Richtung
    }
    private onPressHaltestelle() {
        this.currentDisplayMode = TerminalDisplayMode.Haltestelle
    }
    private onPressNaechsteHaltestelle() {
        console.log('forward stops')
    }
    private onPressDatumUhrzeit() {
        this.currentDisplayMode = TerminalDisplayMode.DatumUhrzeit
        let d = new Date()
        let outputString = d.toLocaleDateString('de', { dateStyle: "short" }) + '   ' + d.toLocaleTimeString('de', { timeStyle: "short" })
        this.setText(0, outputString)

    }
    private onPressBesetzgrad() {
        this.currentDisplayMode = TerminalDisplayMode.Besetzung
    }

    private onNumber(numberString: string) {

        // Switch based on DisplayMode of the terminal
        switch(this.currentDisplayMode) {
            case TerminalDisplayMode.Besetzung:
                this.setBesetzgrad(numberString)
                break;
            case TerminalDisplayMode.HstNr:
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
        }
    }

    

    private setText(lineNumber: number = 0, text: string) {
        this.lines[lineNumber] = text
        let mode = this.mode
        if (lineNumber == 1) {
            mode = IBISTerminalMode.FUNCTION_NO_RECEIVE
        }
        let telegram: IBISTelegram
        if (this.isPrimary) {
            
            telegram = TelegramGenerator.DS044a(this.mode, 0, lineNumber, text) 
        } else {
            telegram = TelegramGenerator.DS044b(this.mode, 0, lineNumber, text) 
        }
        this.ibisController.sendTelegram(telegram)
    }

   refreshText() {
    
   }
    updateSecondLine() {
       /* switch (richtung) {
          case '01':
            directionLetter = 'H'
            break;
          case '02':
            directionLetter = 'R'
            break;
        }*/

        let linie = '   '
        let kurs = Vehicle.getInstance().courseNumber.toString().padStart(2, '0')
        let ziel = '   '
        let hst = '   '
        let richtung = 'Z'
        let abweichung = '+0.0'

        if (Vehicle.getInstance().line) {
            linie = Vehicle.getInstance().line.number.padStart(3, '0')
        }
        if (Vehicle.getInstance().destination) {
            ziel = Vehicle.getInstance().destination.number.toString().padStart(3, '0')
        }
        if (Vehicle.getInstance().route && Vehicle.getInstance().route.stops[Vehicle.getInstance().stopIndex] != undefined) {
            hst = Vehicle.getInstance().route.stops[Vehicle.getInstance().stopIndex].stop.number.toString().padStart(3, '0')
        } 
          this.setText(1, linie + kurs + ziel +richtung + hst + abweichung)
      }



 private setBesetzgrad(number: string) {
    throw new Error('Function not implemented.');
}
private setHaltestelle(number: string) {
    throw new Error('Function not implemented.');
}

private setRichtung(number: string) {
    throw new Error('Function not implemented.');
}

private setMeldung(number: string) {
    throw new Error('Function not implemented.');
}

 private setLinieKurs(number: string) {
    let linie: string
    let kurs: number
    console.log('Set Linie/Kurs', number)
    // TODO: Logik für kurze Linien/Kurse
    if (number.length == 5) {
        linie = parseInt(number.substring(0, 3)).toString()
        kurs = parseInt(number.substring(3, 5))
    } else if (number.length == 4) {
        linie = parseInt(number.substring(0,2)).toString()
        kurs = parseInt(number.substring(2, 4))
    }
    console.log('Kurs', kurs)
    Vehicle.getInstance().setLine(linie)
    Vehicle.getInstance().setCourseNumber(kurs)
    this.mode = IBISTerminalMode.FUNCTION
    this.queryStatus()
    this.setText(0, '')
    this.updateSecondLine()
}

 private async setRoute(number: string) {
    let route = parseInt(number)
    const didSet = await Vehicle.getInstance().setRoute(route)
    this.mode = IBISTerminalMode.FUNCTION

    if (!didSet) {
        console.log('Could not find route')
        this.setText(0, 'FALSCHE ROUTE')
    } else {
        if (Vehicle.getInstance().upcomingStop != null) {
            this.mode = IBISTerminalMode.FUNCTION
            this.setText(0, Vehicle.getInstance().upcomingStop.stop.name)
        }
    }
    this.updateSecondLine()
}

 private setSonderzeichen(number: string) {
    throw new Error('Function not implemented.');
}

 private async setZiel(number: string) {
    let ziel = parseInt(number)
    const res = await Vehicle.getInstance().setDestination(ziel)
    if (!res) {
        this.mode = IBISTerminalMode.FUNCTION
        this.setText(0, 'FALSCHES ZIEL')
        
    } else {
        this.mode = IBISTerminalMode.FUNCTION
        this.setText(0, '                ')
        this.updateSecondLine()

    }
    }



}
export { IBISTerminal }
