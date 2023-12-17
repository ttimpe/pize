import { Stop } from './models/Stop';
import { Trip } from './models/Trip';
import { sequelize } from './sequelize';

import { Agency } from './models/Agency';
import { Route } from './models/Route';

import { SerialPort } from 'serialport';
import { ReadlineParser } from '@serialport/parser-readline'

const IBIS_SEND_INTERVAL = 10
const IBIS_TERMINAL_RECEIVE_INTERVAL = 0.5

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
  console.log('out > '+ signedTelegram)
}



function onReceiveTelegram(telegram: string) {
  console.log('in > ' + telegram)

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
  
  setInterval(() => {
    sendTelegram('mS2')
  },IBIS_TERMINAL_RECEIVE_INTERVAL * 1000)
}
main()