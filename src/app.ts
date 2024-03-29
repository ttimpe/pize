
import { TerminalDisplayMode } from './enums/IBISTerminalDisplayMode'

import { IBISTerminal } from './models/devices/Terminal/IBISTerminal';
import { Sequelize } from 'sequelize-typescript';
import { Destination } from './models/database/Destination';
import { Route } from './models/database/Route';
import { Stop } from './models/database/Stop';
import { RouteStop } from './models/database/RouteStop';
import { StopInformation } from './models/database/StopInformation';
import { Announcement } from './models/database/Announcement';
import { Line } from './models/database/Line';
import { IBISController } from './controllers/IBISController';
import { Vehicle } from './Vehicle';




let ibisController: IBISController
let portString: string


/*
function onPressRichtung() {
  setDisplayMode(TerminalDisplayMode.Richtung)
}

function onPressHstNr() {
  setDisplayMode(TerminalDisplayMode.HstNr)
}

function onPressAnsageAussen() {
  console.log('onPressAnsageInnen')
  if (currentDisplayMode != TerminalDisplayMode.AnsageAussen) {
    setDisplayMode(TerminalDisplayMode.AnsageAussen)
  } else {
    setDisplayMode(TerminalDisplayMode.Haltestelle)
  }
}
function onPressSprechwunsch() {

}
function onPressLStAnFG() {
  if (currentDisplayMode != TerminalDisplayMode.LStAnFG) {
    setDisplayMode(TerminalDisplayMode.LStAnFG)
  } else {
    setDisplayMode(TerminalDisplayMode.Haltestelle)
  }
}
function onPressUnfall() {

}
function onPressHstWiederholen() {

}
/*
function setDisplayMode(displayMode: TerminalDisplayMode) {
  currentDisplayMode = displayMode
  switch (currentDisplayMode) {
    case TerminalDisplayMode.Besetzung:
     // writeTextToTerminal(0, 'BESETZUNG    :  ', 3)
      break;
    case TerminalDisplayMode.NaechsteHaltestelle:
      break;
    case TerminalDisplayMode.HstNr:
      writeTextToTerminal(0,'HALTEST.NR.: ', 3)
      break;
    case TerminalDisplayMode.Richtung:
      writeTextToTerminal(0,'RICHTUNG     :  ', 3)
      break;
    case TerminalDisplayMode.Meldung:
      writeTextToTerminal(0,'MELDUNG    :   ', 3)
      break;
    case TerminalDisplayMode.LinieKurs:
      writeTextToTerminal(0,'LINIE-KURS:     ', 3)
      break;
    case TerminalDisplayMode.Route:
      writeTextToTerminal(0,'ROUTE       :   ', 3)
      break;
    case TerminalDisplayMode.Sonderzeichen:
    case TerminalDisplayMode.Ziel:
      writeTextToTerminal(0, 'ZIEL        :   ', 3)
      break;
    case TerminalDisplayMode.DatumUhrzeit:
      let d = new Date()
      let outputString = d.toLocaleDateString('de', { dateStyle: "short" }) + '   ' + d.toLocaleTimeString('de', { timeStyle: "short" })
      writeTextToTerminal(0, outputString)
      break;
    case TerminalDisplayMode.None:
      clearScreen()
      break;
    case TerminalDisplayMode.WeicheLinks:
    case TerminalDisplayMode.WeicheGerade:
    case TerminalDisplayMode.WeicheRechts:
    case TerminalDisplayMode.AnsageStumm:
    case TerminalDisplayMode.AnsageAussen:
      clearScreen()
      writeTextToTerminal(0, '  ** AUSSEN **  ')
      break;
    case TerminalDisplayMode.LStAnFG:
      clearScreen()
      writeTextToTerminal(0, '* LS-FAHRGAST * ')
      break;
    case TerminalDisplayMode.Unfall:
    case TerminalDisplayMode.AnsageInnen:
      clearScreen()
      writeTextToTerminal(0, '   ** INNEN **  ')
      break;
    case TerminalDisplayMode.Haltestelle:
      if (route) {
      if (route.stops.length > 0) {
        clearScreen()
        writeTextToTerminal(0, route.stops[stopIndex].name.toUpperCase())
        writeSecondLine()
      } else {
        writeTextToTerminal(0, 'KEINE HALTEST.')
      }
     } else {
        writeTextToTerminal(0, 'KEINE ROUTE')
      }
      break;
  }
}

function onPressAnsageInnen() {
  console.log('onPressAnsageInnen')
  if (currentDisplayMode != TerminalDisplayMode.AnsageInnen) {
    setDisplayMode(TerminalDisplayMode.AnsageInnen)
  } else {
    setDisplayMode(TerminalDisplayMode.Haltestelle)
  }
} 


function onPressUhrzeitDatum() {
  if (currentDisplayMode != TerminalDisplayMode.DatumUhrzeit) {
    setDisplayMode(TerminalDisplayMode.DatumUhrzeit)   
  } else {
    setDisplayMode(TerminalDisplayMode.Haltestelle)
  }
}

function onPressNaechsteHaltestelle() {
  stopIndex++
  setDisplayMode(TerminalDisplayMode.Haltestelle)
}


function clearScreen() {
  sendTelegram('mC2?00                ')
}

function onReceiveTelegram(telegram: string) {
  telegram = telegram.substring(1)
  console.log('in > ' + telegram)
  // Check if terminal input

  if (telegram.startsWith('m')) {
    if (currentDisplayMode == TerminalDisplayMode.None || currentDisplayMode == TerminalDisplayMode.Haltestelle || currentDisplayMode == TerminalDisplayMode.DatumUhrzeit || currentDisplayMode == TerminalDisplayMode.WeicheLinks || currentDisplayMode == TerminalDisplayMode.WeicheGerade || currentDisplayMode == TerminalDisplayMode.WeicheRechts || currentDisplayMode == TerminalDisplayMode.AnsageAussen || currentDisplayMode == TerminalDisplayMode.Unfall || currentDisplayMode == TerminalDisplayMode.AnsageInnen || currentDisplayMode == TerminalDisplayMode.LStAnFG) {
    switch (telegram[1]) {
      case Button.None:
        break;
      case Button.IFISStop:

        break;
      case Button.Besetzung:

        break;
      case Button.UhrzeitDatum:
        onPressUhrzeitDatum()
        break;
      case Button.NaechsteHaltestelle:
        onPressNaechsteHaltestelle()
        break;
      case Button.HstNr:
        onPressHstNr()
        break;
      case Button.Richtung:
        onPressRichtung()
        break;
      case Button.Meldung:
        onPressMeldung()
        break;
      case Button.LinieKurs:
        onPressLinieKurs()
        break;
      case Button.Route:
        onPressRoute()
        break;
      case Button.Sonderzeichen:
        onPressZielSonderzeichen()
        break;
      case Button.WeicheLinks:
        onPressWeicheLinks()
        break;
      case Button.WeicheGerade:
        onPressWeicheGerade()
        break;
      case Button.WeicheRechts:
        onPressWeicheRechts()
        break;
      case Button.AnsageStumm:
        onPressAnsageStumm()
        break;
      case Button.AnsageAussen:
        onPressAnsageAussen()
        break;
      case Button.LStAnFG:
        onPressLStAnFG()
        break;
      case Button.Unfall:
        onPressUnfall()
        break;
      case Button.HstWiederholen:
        onPressHstWiederholen()
        break;
      case Button.AnsageInnen:
        onPressAnsageInnen()
        break;
    }
  }
  if (currentDisplayMode == TerminalDisplayMode.LinieKurs) {
    if (telegram.startsWith('m?')) {
      setLinie(telegram.substring(2, 5))
      setKurs(telegram.substring(5,7)) 
      writeSecondLine()
      onPressRoute()
      return
    }
  }
  if (currentDisplayMode == TerminalDisplayMode.Route) {
    if (telegram.startsWith('m?')) {
      setRoute(telegram.substring(2, 5))
      setDisplayMode(TerminalDisplayMode.Haltestelle)
      return
    }
  }
  if (currentDisplayMode == TerminalDisplayMode.Richtung) {
    if (telegram.startsWith('m?')) {
      richtung = telegram.substring(2, 5)
      writeSecondLine()
      setDisplayMode(TerminalDisplayMode.Haltestelle)
      return
    }
  }
  if (currentDisplayMode == TerminalDisplayMode.Meldung) {
    if (telegram.startsWith('m?')) {
      // TODO: Implement Meldung
      setDisplayMode(TerminalDisplayMode.Haltestelle)
      return
    }
  }
  if (currentDisplayMode == TerminalDisplayMode.Ziel) {
    if (telegram.startsWith('m?')) {
      ziel = telegram.substring(2, 5)
      sendTelegram('z' + ziel)
      writeSecondLine()
      setDisplayMode(TerminalDisplayMode.Haltestelle)
      return
    }
  }
  }

}

*/


function main() {

  if (process.argv.length === 3) {

    portString = process.argv[2]
  // read config
  // load DB from Sequelize
  const sequelize = new Sequelize({
    storage: './test.sqlite3',
    dialect:'sqlite'
  })
  sequelize.addModels([
    Destination,
    Line,
    Route,
    Stop,
    RouteStop,
    StopInformation,
    Announcement
  ])
  sequelize.sync();
  // Init terminal(s)
    ibisController = new IBISController(portString, 10)
  

  } else {
    console.error('ERROR: Please specify serial port')
  }
  

}
main()