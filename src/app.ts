import { Stop } from './models/Stop';
import { Trip } from './models/Trip';
import { sequelize } from './sequelize';

import { Agency } from './models/Agency';
import { Route } from './models/Route';

import { SerialPort } from 'serialport';
import { ReadlineParser } from '@serialport/parser-readline'
import { Button } from './enums/buttons'
import { InputMode } from './enums/inputMode'


const IBIS_SEND_INTERVAL = 10
const IBIS_TERMINAL_RECEIVE_INTERVAL = 1

let currentInputMode :InputMode = InputMode.None
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

function onPressLinieKurs() {
  writeTextToTerminal(0,'LINIE-KURS:     ')
  currentInputMode = InputMode.LinieKurs
}

function onPressRoute() {
  writeTextToTerminal(0,'ROUTE        :  ')
  currentInputMode = InputMode.Route
}

function onReceiveTelegram(telegram: string) {
  telegram = telegram.substring(1)
  console.log('in > ' + telegram)
  // Check if terminal input

  if (telegram.startsWith('m')) {
    if (currentInputMode == InputMode.None) {
    switch (telegram[1]) {
      case Button.None:
        break;
      case Button.IFISStop:

        break;
      case Button.Besetzung:

        break;
      case Button.UhrzeitDatum:
        writeTextToTerminal(0, '01-01-2000 00:00')
        break;
      case Button.NaechsteHaltestelle:
        break;
      case Button.HstNr:
        writeTextToTerminal(0,'HALTEST.NR.:')

        break;
      case Button.Richtung:
        writeTextToTerminal(0,'RICHTUNG:')
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
  if (currentInputMode == InputMode.LinieKurs) {
    if (telegram.startsWith('m?')) {
      line = telegram.substring(2, 5)
      course = telegram.substring(6,8)
      sendTelegram('l' + line)
      sendTelegram('k' + course)
      onPressRoute()
    }
  }
  if (currentInputMode == InputMode.Route) {
    if (telegram.startsWith('m?')) {
      route = telegram.substring(2, 5)
      sendTelegram('r' + route)
      currentInputMode = InputMode.None
    }
  }
  }

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
  setInterval(() => {
    
    if (currentInputMode == InputMode.LinieKurs) {
      sendTelegram('mS3')
    }
    if (currentInputMode == InputMode.Route) {
      sendTelegram('mS3')
    }

    if (currentInputMode == InputMode.None) {
      sendTelegram('mS2')
    }
  },IBIS_TERMINAL_RECEIVE_INTERVAL * 1000)
}
main()