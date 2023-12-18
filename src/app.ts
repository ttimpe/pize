import { Stop } from './models/Stop';
import { Trip } from './models/Trip';
import { sequelize } from './sequelize';

import { Route } from './models/Route';

import { SerialPort } from 'serialport';
import { ReadlineParser } from '@serialport/parser-readline'
import { Button } from './enums/buttons'
import { DisplayMode } from './enums/displayMode'


const IBIS_SEND_INTERVAL = 10
const IBIS_TERMINAL_RECEIVE_INTERVAL = 1

let currentDisplayMode :DisplayMode = DisplayMode.None
let line = ''
let course = ''
let route = ''
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


function writeTextToTerminal(line: number, text: string) {
  // char code 48 is 0

  let telegram = 'mC3' + String.fromCharCode(47 + text.length) + line.toString() + '0' + text
  sendTelegram(telegram)
}


function setDisplayMode(displayMode: DisplayMode) {

}


function onPressLinieKurs() {
  writeTextToTerminal(0,'LINIE-KURS:     ')
  currentDisplayMode = DisplayMode.LinieKurs
}

function onPressRoute() {
  clearScreen()
  currentDisplayMode = DisplayMode.Route
  writeTextToTerminal(0,'ROUTE        :  ')
}

function onPressUhrzeitDatum() {
  if (currentDisplayMode != DisplayMode.DatumUhrzeit) {
    currentDisplayMode = DisplayMode.DatumUhrzeit
    let d = new Date()
    let outputString = d.toLocaleDateString('de', { dateStyle: "short" }) + '   ' + d.toLocaleTimeString('de', { timeStyle: "short" })
    writeTextToTerminal(0, outputString)
  } else {
    currentDisplayMode = DisplayMode.None
    clearScreen()
  }
}

function clearScreen() {
  sendTelegram('mC0?                ')
} 
function onReceiveTelegram(telegram: string) {
  telegram = telegram.substring(1)
  console.log('in > ' + telegram)
  // Check if terminal input

  if (telegram.startsWith('m')) {
    if (currentDisplayMode == DisplayMode.None) {
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
        writeTextToTerminal(0,'MELDUNG:')
        break;
      case Button.LinieKurs:
        onPressLinieKurs()
        break;
      case Button.Route:
        onPressRoute()
        break;
      case Button.Sonderzeichen:
        writeTextToTerminal(0,'SONDERZEICH. :')
        break;
    }
  }
  if (currentDisplayMode == DisplayMode.LinieKurs) {
    if (telegram.startsWith('m?')) {
      line = telegram.substring(2, 5)
      course = telegram.substring(5,7)
      sendTelegram('l' + line)
      sendTelegram('k' + course)
      writeTextToTerminal(1, line + course)
      onPressRoute()
    }
  }
  if (currentDisplayMode == DisplayMode.Route) {
    if (telegram.startsWith('m?')) {
      route = telegram.substring(2, 5)
      sendTelegram('r' + route)
      currentDisplayMode = DisplayMode.None
      clearScreen()
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
    if (currentDisplayMode == DisplayMode.None) {
      sendTelegram('mS2')
    } else {
      sendTelegram('mS3')
    }
  },IBIS_TERMINAL_RECEIVE_INTERVAL * 1000)
}
main()