
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
import { DeviceConfig } from './models/devices/DeviceConfig';
import { LocationController } from './controllers/LocationController';
import { StopDistance } from './models/database/StopDistance';
import express, { Express, Request, Response } from "express";
import { Util } from './util';
import { AudioController } from './controllers/AudioController';
import bodyParser, { BodyParser } from 'body-parser'
import { WebSocketServer } from 'ws';
import { RadioController } from './controllers/RadioController';
import { Meldung } from './models/database/Meldung';



let ibisController: IBISController
let portString: string
let rl: any

let websocket: WebSocketServer;
let isConnectedToITCS: boolean = false


function main() {
  let segfaultHandler = require('node-segfault-handler');
  segfaultHandler.registerHandler();
  if (process.argv.length === 3) {

    portString = process.argv[2]
 /*   rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    })
    askForInput();*/
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
    SpecialCharacter,
    StopDistance,
    Meldung
  ])
  // Init terminal(s)
  
  const deviceConfig: DeviceConfig = require('../device_config.json')
  
  websocket = new WebSocketServer({ port: 1815 });

  
  var cors = require('cors');
  let app = express()



  app.use(cors());
  app.use( bodyParser.json() );       // to support JSON-encoded bodies
  app.use(bodyParser.urlencoded({     // to support URL-encoded bodies
    extended: true
  })); 
  (async () => {
    try {
      await sequelize.sync(); // Wait for the database sync
      app.listen(2000, () => {
        Util.log('Listening for clients on port 2000');
      });
    } catch (error) {
      console.error("Initialization failed:", error);
    }
  })();
  

  const audioController = new AudioController()
  let locationController = new LocationController(ibisController);

  ibisController = new IBISController(portString, 10, websocket, locationController)
  ibisController.audioController = audioController
  if (deviceConfig.MFD == true) {
    let mfdController = new MFDController(ibisController, app);
  }

  if (deviceConfig.RADIO.enabled == true) {
    let radioController = new RadioController('vehicle', ibisController)
    ibisController.radioController = radioController
    radioController.startListening()
  }


  //if (deviceConfig.use_gpio == true && deviceConfig.GPIO_PINOUT != undefined) {
  //}
  app.use('/tfs', express.static('diag_root'));

  app.get('/diag', (req: Request, res: Response) => {
    res.json({
      "linie": ibisController.linie,
      "kurs": ibisController.kurs,
      "route": ibisController.route,
      "upcoming_stop": ibisController.upcomingStop,
      "impulses_since_reset": locationController.impulsesSinceReset,
      "possible_next_stop_distances": locationController.possibleNextStopDistances
    })
  })
  app.get('/diag/wi', (req: Request, res: Response) => {
    const impulses = parseInt((req.query.impulses as string));
    Util.log('Received ', impulses, " from diags");
    for (var i=0; i<impulses; i++) {
      locationController.wiInterrupt();
    }
    res.json({ "counter": locationController.impulsesSinceReset })
  })


  app.post('/diag/sendTelegram', (req: Request, res: Response) => {
    const telegram = req.body.telegram;
    res.send('sent telegram: ' + telegram);

    ibisController.sendTelegram((telegram as IBISTelegram))
  })
  

  } else {
    console.error('ERROR: Please specify serial port')
  }


}
main()