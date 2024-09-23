import { Destination } from './../../database/Destination';
import { IBISTerminalKey } from '../../../enums/IBISTerminalKey';
import { TerminalDisplayMode } from '../../../enums/IBISTerminalDisplayMode';
import { IBISTerminalKeyMapping } from './IBISTerminalKeyMapping';
import { IBISTerminalKeyAction } from './IBISTerminalKeyAction';


import { IBISController } from '../../../controllers/IBISController';
import {TelegramGenerator } from '../../../TelegramGenerator';
import {IBISTerminalMode } from './IBISTerminalMode';
import {IBISTerminalConfiguration } from './IBISTerminalConfiguration';
import {IBISTelegram } from '../../../extensions/IBISTelegram';
import { Util } from '../../../util';

class IBISTerminal {
    private isPrimary: boolean = true
    private lines: string[] = ['', '']
    mode: IBISTerminalMode = IBISTerminalMode.FUNCTION
    // TEIN
    public isActive: boolean = false
     // active function definition
    currentDisplayMode :TerminalDisplayMode = TerminalDisplayMode.None
    
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

    onReceiveTelegram(telegram:IBISTelegram) {
        // Number returned from the terminal
        Util.log('received')
        if (telegram.startsWith(this.terminalLetter + '?')) {
            this.isActive = true;
            Util.log('got number')
            this.onNumber(telegram.substring(2))
        } else if (telegram.startsWith(this.terminalLetter + 'Q')) {
            // status reply


        }
        // terminal not active but on bus
        else if (telegram.startsWith(this.terminalLetter + 'A')) {
            this.isActive = false
        } else if (telegram.startsWith(this.terminalLetter) && telegram.length == 2) {
            // Handle keys
            this.isActive = true
            this.onKeyPress(telegram[1] as IBISTerminalKey)

        } else {
            Util.log('cannot handle', telegram)
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
        this.setText(1,'')

        this.mode = IBISTerminalMode.BLINKING_FUNCTION;
        this.setText(0, 'IBISPLUSPLUS');
        this.setText(1, "VERSION 1.0");

        setTimeout(() => {
            this.mode = IBISTerminalMode.FUNCTION;
            this.setText(0,'')
            this.setText(1,'')
        }, 5000);
    }
    


    private onKeyPress(key?: IBISTerminalKey) {
        if (key) {
            if (key != 'Q') {
            // This will change the display mode of the terminal and fire a command
            // Check if we have predefined text in the device config for this
            const keyConfig = this.getActionForKey(key)
            if (keyConfig) {
                // we have a config for this key
               
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
            } else {
                if (key == '/') {
                    this.onPressDelete()
                }
            }
        }
        } else {
            // Key is Q, Quittierung
            
            
        }
    }

    private onPressDelete() {
        if (this.currentDisplayMode == TerminalDisplayMode.Fehler) {
            this.errors.pop()
            if (this.errors.length > 0) {
                this.showError();
            } else {
                this.setDisplayMode(TerminalDisplayMode.None)

            }
        } else {
            this.setDisplayMode(TerminalDisplayMode.None)
        }
    }
    private onPressWeicheLinks() {
        // Set Weiche Links on vehicle
        this.setDisplayMode(TerminalDisplayMode.WeicheLinks)
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
    private onPressWeicheGerade() {
        this.setDisplayMode(TerminalDisplayMode.WeicheGerade)
    }
    private onPressWeicheRechts() {
        this.setDisplayMode(TerminalDisplayMode.WeicheRechts)
    }
    private onPressAnsageStumm() {
        this.ibisController.toggleAnnouncementsMuted();
        this.setDisplayMode(TerminalDisplayMode.AnsageStumm)
    }
    private onPressLstAnFG() {
        this.setDisplayMode(TerminalDisplayMode.LStAnFG)
    }
    private onPressUnfall() {
        this.setDisplayMode(TerminalDisplayMode.Unfall)
    }
    private onPressHstWiederholen() {
        this.ibisController.repeatStopAnnouncement();
        Util.log('Repeat playback of current stop')
    }
    private onPressAnsageInnen() {
        this.setDisplayMode(TerminalDisplayMode.AnsageInnen)
    }
    private onPressSprechwunsch() {
        Util.log('Method not implemented.');
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
        this.setText(0, outputString)
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
        switch(this.currentDisplayMode) {
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
        text = text.substring(0, 16);
        this.lines[lineNumber] = text
        let mode = this.mode
        if (lineNumber == 1) {
            mode = IBISTerminalMode.FUNCTION_NO_RECEIVE
        }
        // this.currentLine = lineNumber
        // this.textBuffer = text
        let telegram: IBISTelegram
        if (this.isPrimary) {
            
            telegram = TelegramGenerator.DS044a(this.mode, 0, lineNumber, text) 
        } else {
            telegram = TelegramGenerator.DS044b(this.mode, 0, lineNumber, text) 
        }
        this.ibisController.sendTelegram(telegram)
        this.ibisController.sendTelegram(telegram)
        this.ibisController.sendTelegram(telegram)
        this.ibisController.sendTelegram(telegram)

   //     this.lastTextSentTimestamp = new Date()
    }



    
   clearFirstLine() {
    this.mode = IBISTerminalMode.FUNCTION
    this.setText(0, " ".repeat(16))
   }
    updateSecondLine() {
       

        let linie = '   '
        let kurs = this.ibisController.kurs.toString().padStart(2, '0')
        let ziel = '   '
        let hst = '   '
        let richtung = 'Z'
        let abweichung = '+0.0'

        if (this.ibisController.linie) {
            linie = this.ibisController.linie.number.padStart(3, '0')
        }
        if (this.ibisController.ziel) {
            ziel = this.ibisController.ziel.number.toString().padStart(3, '0')
        }
        if (this.ibisController.route && this.ibisController.route.stops[this.ibisController.stopIndex] != undefined) {
            hst = this.ibisController.route.stops[this.ibisController.stopIndex].stop.number.toString().padStart(3, '0')
        } 
        if (this.ibisController.richtung) {
            if (this.ibisController.richtung == 1) {
                richtung = 'H'
            } else {
                richtung = 'R'
            }
        }
        this.setText(1, linie + kurs + ziel + richtung + hst + abweichung)
      }



 private setBesetzgrad(number: string) {
    Util.log('set besetzgrad')

    this.setDisplayMode(TerminalDisplayMode.None)

}
private setHaltestelle(number: string) {
    const stopNumber = parseInt(number)
    let wasFound = false
    for (let i=0; i<this.ibisController.route.stops.length; i++) {
        if (this.ibisController.route.stops[i].stop.number == stopNumber) {
            Util.log('Found stop');
            wasFound = true
            this.ibisController.stopIndex = i
            this.setDisplayMode(TerminalDisplayMode.None)
        }
    }
    if (!wasFound) {
        Util.log('Did not find stop')
        this.throwError('FALSCHE HST.')
    }
}

promptForLinieKurs() {
    let action = this.getAction(IBISTerminalKeyAction.LINIE_KURS)
    this.mode = IBISTerminalMode.DIGITS
    let outputText = action.textLine1
    if (this.ibisController.linie) {
        outputText = action.textLine1.split(':')[0] + ":" + this.ibisController.linie.number.padStart(3, '0') + this.ibisController.kurs.toString().padStart(2, '0');
    }

    this.setText(0, outputText)
}
promptForBesetzgrad() {
    let action = this.getAction(IBISTerminalKeyAction.BESETZGRAD)
    this.mode = IBISTerminalMode.DIGITS
    this.setText(0, action.textLine1)
}
promptForStopNumber() {
    let action = this.getAction(IBISTerminalKeyAction.HALTESTELLE)
    this.mode = IBISTerminalMode.DIGITS
    this.setText(0, action.textLine1)
}

promptForDirection() {
    let action = this.getAction(IBISTerminalKeyAction.RICHTUNG)
    this.mode = IBISTerminalMode.DIGITS
    let outputText = action.textLine1
    if (this.ibisController.richtung != undefined) {
        outputText = action.textLine1.split(':')[0] + ":" + this.ibisController.richtung.toString();
    }

    this.setText(0, outputText)
}
promptForRoute() {
    let action = this.getAction(IBISTerminalKeyAction.ROUTE)
    this.mode = IBISTerminalMode.DIGITS
    let outputText = action.textLine1
    if (this.ibisController.route) {
        outputText = action.textLine1.split(':')[0] + ":" + this.ibisController.route.route_id.padStart(3, '0');
    }

    this.setText(0, outputText)
}
promptForDestination() {
    let action = this.getAction(IBISTerminalKeyAction.ZIEL)
    this.mode = IBISTerminalMode.DIGITS
    let outputText = action.textLine1
    if (this.ibisController.ziel) {
        outputText = action.textLine1.split(':')[0] + ":" + this.ibisController.ziel.number.toString().padStart(3, '0');
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
setAnsageInnen() {

}
setAnsageAussen() {

}

setLStAnFG() {

}

setUnfall() {

}

promptForMessage() {
    let action = this.getAction(IBISTerminalKeyAction.MELDUNG)
    this.mode = IBISTerminalMode.DIGITS
    this.setText(0, action.textLine1)
}
skipStop() {

}

private setDisplayMode(displayMode: TerminalDisplayMode) {
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
        case TerminalDisplayMode.WeicheLinks:
            this.setWeicheLinks()
            break
        case TerminalDisplayMode.WeicheGerade:
            this.setWeicheGerade()
            break
        case TerminalDisplayMode.WeicheRechts:
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
    }
}

private setRichtung(number: string) {
    this.ibisController.setRichtung(parseInt(number))
    this.setDisplayMode(TerminalDisplayMode.None)
}

private setMeldung(number: string) {
    Util.log('Sending message')
    this.playSound(parseInt(number));
    this.setDisplayMode(TerminalDisplayMode.None)
}

 private async setLinieKurs(number: string) {
    let linie: string
    let kurs: number
    Util.log('Set Linie/Kurs', number)
    // TODO: Logik für kurze Linien/Kurse
    if (number.length == 5) {
        linie = parseInt(number.substring(0, 3)).toString()
        kurs = parseInt(number.substring(3, 5))
    } else if (number.length == 4) {
        linie = parseInt(number.substring(0,2)).toString()
        kurs = parseInt(number.substring(2, 4))
    }
    Util.log('Kurs', kurs)
    await this.ibisController.setLine(linie)
    this.ibisController.setCourseNumber(kurs)
    this.setDisplayMode(TerminalDisplayMode.None)
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
            this.setText(0, this.ibisController.upcomingStop.stop.information.shortName.toUpperCase())
        } else {
            this.setText(0, '')
        }
        this.updateSecondLine()
    }

    throwError(errorText: string) {
        this.errors.push(errorText)
        this.setDisplayMode(TerminalDisplayMode.Fehler)

    }
    showError() {
        this.mode = IBISTerminalMode.BLINKING_FUNCTION;
        this.setText(0, this.errors[this.errors.length - 1])
        this.playSound(3);
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
            this.setText(0, this.ibisController.upcomingStop.stop.information.shortName.toUpperCase()) 
        }
        this.updateSecondLine()
    }
    onSetRoute() {
        this.updateSecondLine()

        if (this.ibisController.route != undefined) {
            this.setText(0, this.ibisController.route.stops[0].stop.information.shortName.toUpperCase());
            setTimeout(() => {
                this.setText(0, this.ibisController.route.stops[this.ibisController.route.stops.length - 1].stop.information.shortName.toUpperCase())
                setTimeout(() => {
                    this.setDisplayMode(TerminalDisplayMode.None);
                }, 1000);
            }, 1000);
           
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

}
export { IBISTerminal }
