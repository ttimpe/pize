import { Stop } from './models/Stop';
import { Trip } from './models/Trip';
import { sequelize } from './sequelize';

import { Route } from './models/Route';

import { SerialPort } from 'serialport';
import { ReadlineParser } from '@serialport/parser-readline'
import { Button } from './enums/buttons'
import { DisplayMode } from './enums/displayMode'
import { Richtung } from './models/Richtung';

const IBIS_SEND_INTERVAL = 10
const IBIS_TERMINAL_RECEIVE_INTERVAL = 2

let currentDisplayMode :DisplayMode = DisplayMode.None
let line = ''
let course = ''
let route = ''
let ziel = ''
let richtung = 'Z'
let haltestellen = ['SIEKER', 'SIEKER DEPOT', 'SIEKER WEICHE', 'SIEKER MITTE']
const port = new SerialPort({
  path: process.argv[2],
  baudRate: 1200,
  dataBits: 7,
  stopBits: 2,
  parity: 'even'
})

function sendTelegram(telegram: string) {
  const signedTelegram = signTelegram(telegram + '\r')
  port.write(signedTelegram)
  console.log('out > ' + signedTelegram.replace('\r', '<CR>'))
}


function writeTextToTerminal(line: number, text: string, mode: number = 2) {
  // char code 48 is 0
  text = text.padEnd(16)
  let telegram = 'mC' + mode + String.fromCharCode(47 + text.length) + line.toString() + '0' + text
  sendTelegram(telegram)
}



function writeSecondLine() {
  let directionLetter = 'Z'
  switch (richtung) {
    case '01':
      directionLetter = 'H'
      break;
    case '02':
      directionLetter = 'R'
      break;
  }
  writeTextToTerminal(1, line.padStart(3) + course.padStart(2) + ziel.padStart(3) + directionLetter)
}


function onPressLinieKurs() {
  setDisplayMode(DisplayMode.LinieKurs)
}

function onPressRoute() {
  setDisplayMode(DisplayMode.Route)

}
function onPressMeldung() {
  setDisplayMode(DisplayMode.Meldung)
}

function onPressZielSonderzeichen() {
  setDisplayMode(DisplayMode.Ziel)
}

function onPressRichtung() {
  setDisplayMode(DisplayMode.Richtung)
}

function onPressHstNr() {
  setDisplayMode(DisplayMode.HstNr)
}
function onPressWeicheLinks() {

}
function onPressWeicheGerade() {

}
function onPressWeicheRechts() {

}
function onPressAnsageStumm() {

}
function onPressAnsageAussen() {
  console.log('onPressAnsageInnen')
  if (currentDisplayMode != DisplayMode.AnsageAussen) {
    setDisplayMode(DisplayMode.AnsageAussen)
  } else {
    setDisplayMode(DisplayMode.Haltestelle)
  }
}
function onPressSprechwunsch() {

}
function onPressLStAnFG() {
  if (currentDisplayMode != DisplayMode.LStAnFG) {
    setDisplayMode(DisplayMode.LStAnFG)
  } else {
    setDisplayMode(DisplayMode.Haltestelle)
  }
}
function onPressUnfall() {

}
function onPressHstWiederholen() {

}

function setDisplayMode(displayMode: DisplayMode) {
  currentDisplayMode = displayMode
  switch (currentDisplayMode) {
    case DisplayMode.Besetzung:
      writeTextToTerminal(0, 'BESETZUNG    :  ', 3)
      break;
    case DisplayMode.NaechsteHaltestelle:
    case DisplayMode.HstNr:
      writeTextToTerminal(0,'HALTEST.NR.: ', 3)
      break;
    case DisplayMode.Richtung:
      writeTextToTerminal(0,'RICHTUNG     :  ', 3)
      break;
    case DisplayMode.Meldung:
      writeTextToTerminal(0,'MELDUNG    :   ', 3)
      break;
    case DisplayMode.LinieKurs:
      writeTextToTerminal(0,'LINIE-KURS:     ', 3)
      break;
    case DisplayMode.Route:
      writeTextToTerminal(0,'ROUTE        :  ', 3)
      break;
    case DisplayMode.Sonderzeichen:
    case DisplayMode.Ziel:
      writeTextToTerminal(0, 'ZIEL        :', 3)
      break;
    case DisplayMode.DatumUhrzeit:
      let d = new Date()
      let outputString = d.toLocaleDateString('de', { dateStyle: "short" }) + '   ' + d.toLocaleTimeString('de', { timeStyle: "short" })
      writeTextToTerminal(0, outputString)
      break;
    case DisplayMode.None:
      clearScreen()
      break;
    case DisplayMode.WeicheLinks:
    case DisplayMode.WeicheGerade:
    case DisplayMode.WeicheRechts:
    case DisplayMode.AnsageStumm:
    case DisplayMode.AnsageAussen:
      writeTextToTerminal(0, '  ** AUSSEN **  ')
      break;
    case DisplayMode.LStAnFG:
      writeTextToTerminal(0, '* LS-FAHRGAST * ')
      break;
    case DisplayMode.Unfall:
    case DisplayMode.AnsageInnen:
      writeTextToTerminal(0, '   ** INNEN **  ')
      break;
    case DisplayMode.Haltestelle:
      writeTextToTerminal(0, haltestellen[0])
      break;
  }
}

function onPressAnsageInnen() {
  console.log('onPressAnsageInnen')
  if (currentDisplayMode != DisplayMode.AnsageInnen) {
    setDisplayMode(DisplayMode.AnsageInnen)
  } else {
    setDisplayMode(DisplayMode.Haltestelle)
  }
} 


function onPressUhrzeitDatum() {
  if (currentDisplayMode != DisplayMode.DatumUhrzeit) {
    setDisplayMode(DisplayMode.DatumUhrzeit)   
  } else {
    setDisplayMode(DisplayMode.Haltestelle)
  }
}




function clearScreen() {
  sendTelegram('mC2?00                ')
}

function onReceiveTelegram(telegram: string) {
  telegram = telegram.substring(1)
  console.log('in > ' + telegram)
  // Check if terminal input

  if (telegram.startsWith('m')) {
    if (currentDisplayMode == DisplayMode.None || currentDisplayMode == DisplayMode.Haltestelle || currentDisplayMode == DisplayMode.DatumUhrzeit || currentDisplayMode == DisplayMode.WeicheLinks || currentDisplayMode == DisplayMode.WeicheGerade || currentDisplayMode == DisplayMode.WeicheRechts || currentDisplayMode == DisplayMode.AnsageAussen || currentDisplayMode == DisplayMode.Unfall || currentDisplayMode == DisplayMode.AnsageInnen) {
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
  if (currentDisplayMode == DisplayMode.LinieKurs) {
    if (telegram.startsWith('m?')) {
      line = telegram.substring(2, 5)
      course = telegram.substring(5,7)
      sendTelegram('l' + line)
      sendTelegram('k' + course)
      writeSecondLine()
      onPressRoute()
      return
    }
  }
  if (currentDisplayMode == DisplayMode.Route) {
    if (telegram.startsWith('m?')) {
      route = telegram.substring(2, 5)
      sendTelegram('r' + route)
      setDisplayMode(DisplayMode.Haltestelle)
      return
    }
  }
  if (currentDisplayMode == DisplayMode.Richtung) {
    if (telegram.startsWith('m?')) {
      richtung = telegram.substring(2, 5)
      writeSecondLine()
      setDisplayMode(DisplayMode.Haltestelle)
      return
    }
  }
  if (currentDisplayMode == DisplayMode.Meldung) {
    if (telegram.startsWith('m?')) {
      // TODO: Implement Meldung
      setDisplayMode(DisplayMode.Haltestelle)
      return
    }
  }
  if (currentDisplayMode == DisplayMode.Ziel) {
    if (telegram.startsWith('m?')) {
      ziel = telegram.substring(2, 5)
      sendTelegram('z' + ziel)
      writeSecondLine()
      setDisplayMode(DisplayMode.Haltestelle)
      return
    }
  }
  }

}

function playSound(id: string, repeat: number) {
  sendTelegram('mK' + id + repeat)
}

function signTelegram(message: string): string {

  let checkByte = 0x7F;
  for (const char of message) {
      const byte = char.charCodeAt(0);
      checkByte = checkByte ^ byte;
  }
  message += String.fromCharCode(checkByte);
  return message;
}

function main() {
  const parser = port.pipe(new ReadlineParser({ delimiter: '\r' }))
  parser.on('data', onReceiveTelegram)
  onPressLinieKurs()
  playSound('1', 1)
  setInterval(() => {
    console.log('currentDisplayMode', currentDisplayMode)
    if (currentDisplayMode == DisplayMode.None || currentDisplayMode == DisplayMode.DatumUhrzeit || currentDisplayMode == DisplayMode.WeicheLinks || currentDisplayMode == DisplayMode.WeicheGerade || currentDisplayMode == DisplayMode.WeicheRechts || currentDisplayMode == DisplayMode.AnsageAussen || currentDisplayMode == DisplayMode.Unfall || currentDisplayMode == DisplayMode.AnsageInnen || DisplayMode.Haltestelle) {
      sendTelegram('mS2')
    } else {
      sendTelegram('mS3')
    }
  },IBIS_TERMINAL_RECEIVE_INTERVAL * 1000)
}
main()