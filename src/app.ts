import { Stop } from './models/Stop';
import { Trip } from './models/Trip';
import { sequelize } from './sequelize';

import { Route } from './models/Route';

import { SerialPort } from 'serialport';
import { ReadlineParser } from '@serialport/parser-readline'
import { Button } from './enums/buttons'
import { DisplayMode } from './enums/displayMode'


const IBIS_SEND_INTERVAL = 10
const IBIS_TERMINAL_RECEIVE_INTERVAL = 10

let currentDisplayMode :DisplayMode = DisplayMode.None
let line = ''
let course = ''
let route = ''
let ziel = ''
let telegramQueue = []
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

  let telegram = 'mC' + mode + String.fromCharCode(47 + text.length) + line.toString() + '0' + text
  sendTelegram(telegram)
}

function queueTelegram(telegram: string) {

}


function writeSecondLine() {
  writeTextToTerminal(1, line + course + ziel + 'Z' + '000')
}


function onPressLinieKurs() {
  writeTextToTerminal(0,'LINIE-KURS:     ', 3)
  currentDisplayMode = DisplayMode.LinieKurs
}

function onPressRoute() {
  clearScreen()
  writeTextToTerminal(0,'ROUTE        :  ', 3)
  currentDisplayMode = DisplayMode.Route

}
function onPressMeldung() {
  clearScreen()
  writeTextToTerminal(0,'MELDUNG    :', 3)
  currentDisplayMode = DisplayMode.Meldung

}

function onPressZielSonderzeichen() {
  clearScreen()
  currentDisplayMode = DisplayMode.Ziel
  writeTextToTerminal(0, 'ZIEL        :', 3)

}


function onPressUhrzeitDatum() {
  if (currentDisplayMode != DisplayMode.DatumUhrzeit) {
    currentDisplayMode = DisplayMode.DatumUhrzeit
    let d = new Date()
    let outputString = d.toLocaleDateString('de', { dateStyle: "short" }) + '   ' + d.toLocaleTimeString('de', { timeStyle: "short" })
    writeTextToTerminal(0, outputString)
  } else {
    clearScreen()
    currentDisplayMode = DisplayMode.None
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
    if (currentDisplayMode == DisplayMode.None || currentDisplayMode == DisplayMode.DatumUhrzeit) {
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
        writeTextToTerminal(0,'HALTEST.NR.:')
        break;
      case Button.Richtung:
        writeTextToTerminal(0,'RICHTUNG     :')
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
      clearScreen()
      currentDisplayMode = DisplayMode.None
      return
    }
  }
  if (currentDisplayMode == DisplayMode.Meldung) {
    if (telegram.startsWith('m?')) {
      // TODO: Implement Meldung
      clearScreen()
      currentDisplayMode = DisplayMode.None
      return
    }
  }
  if (currentDisplayMode == DisplayMode.Ziel) {
    if (telegram.startsWith('m?')) {
      ziel = telegram.substring(2, 5)
      sendTelegram('z' + ziel)
      writeSecondLine()
      sendTelegram('mS2')
      clearScreen()
      currentDisplayMode = DisplayMode.None
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
    if (currentDisplayMode == DisplayMode.None || currentDisplayMode == DisplayMode.DatumUhrzeit) {
      sendTelegram('mS2')
    } else {
      sendTelegram('mS3')
    }
  },IBIS_TERMINAL_RECEIVE_INTERVAL * 1000)
}
main()