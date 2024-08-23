
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
import { SpecialCharacter } from './models/database/SpecialCharacter';

import readline from 'readline';
import { IBISTelegram } from './extensions/IBISTelegram';
import { MFDController } from './controllers/MFDController';


let ibisController: IBISController
let portString: string
let rl: any



async function askForInput() {
  readline.cursorTo(process.stdout, 0, process.stdout.rows - 1);
  readline.clearLine(process.stdout, 0);
  readline.clearScreenDown(process.stdout);
  for await (const line of rl) {
    console.log("SENDING", line)
    ibisController.sendTelegram(line);

  }
}





function main() {

  if (process.argv.length === 3) {

    portString = process.argv[2]
    rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    })
    askForInput();
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
    Announcement,
    SpecialCharacter
  ])
  sequelize.sync();
  // Init terminal(s)
  
  
  ibisController = new IBISController(portString, 10)
  let mfdController = new MFDController(ibisController);
    
  } else {
    console.error('ERROR: Please specify serial port')
  }
  

}
main()