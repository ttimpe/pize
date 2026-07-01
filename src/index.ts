
import { TerminalDisplayMode } from './enums/IBISTerminalDisplayMode'

import { IBISTerminal } from './models/devices/Terminal/IBISTerminal';
import { Sequelize } from 'sequelize-typescript';
import { IBISController } from './controllers/IBISController';

import { SpecialCharacter } from './models/database/SpecialCharacter';

import readline from 'readline';
import { IBISTelegram } from './extensions/IBISTelegram';
import { MFDController } from './controllers/MFDController';
import { MTTController } from './controllers/MTTController';
import { DeviceConfig } from './models/devices/DeviceConfig';
import { LocationController } from './controllers/LocationController';
import express, { Express, Request, Response } from "express";
import { Util } from './util';
import { AudioController } from './controllers/AudioController';
import bodyParser, { BodyParser } from 'body-parser'
import { WebSocketServer } from 'ws';
import { RadioController } from './controllers/RadioController';
import { SetupController } from './controllers/SetupController';
import { defaultDeviceConfig } from './models/devices/defaultDeviceConfig';
import fs from 'fs';
import path from 'path';
import { Meldung } from './models/database/Meldung';
// VDV Models
import { BasisVersion } from './models/database/VDV/BasisVersion';
import { RecOrt } from './models/database/VDV/RecOrt';
import { RecHp } from './models/database/VDV/RecHp';
import { RecLid } from './models/database/VDV/RecLid';
import { LidVerlauf } from './models/database/VDV/LidVerlauf';
import { RecFrt } from './models/database/VDV/RecFrt';
import { RecUmlauf } from './models/database/VDV/RecUmlauf';
import { RecZnr } from './models/database/VDV/RecZnr';
import { RecAnr } from './models/database/VDV/RecAnr';
import { RecSel } from './models/database/VDV/RecSel';
import { RecOm } from './models/database/VDV/RecOm';
import { RecSelZp } from './models/database/VDV/RecSelZp';
import { SelFztFeld } from './models/database/VDV/SelFztFeld';
import { Firmenkalender } from './models/database/VDV/Firmenkalender';
import { BasisVerGueltigkeit } from './models/database/VDV/BasisVerGueltigkeit';



let ibisController: IBISController
let portString: string | undefined
let rl: any

let websocket: WebSocketServer;
let isConnectedToITCS: boolean = false

// Reassigned once the HTTP server exists; used by the setup wizard's restart button and
// the signal handlers. Falls back to a plain exit until then.
let gracefulShutdown: () => void = () => process.exit(0);


function main() {
  let segfaultHandler = require('node-segfault-handler');
  segfaultHandler.registerHandler();

  // Resilient bootstrap: a fresh device may have no config yet. Write a safe default so
  // the require() sites succeed and the web server + setup wizard come up in setup mode.
  const configPath = path.join(__dirname, '..', 'device_config.json');
  if (!fs.existsSync(configPath)) {
    Util.log('No device_config.json found - writing default template (setup mode)');
    fs.writeFileSync(configPath, JSON.stringify(defaultDeviceConfig, null, 2));
  }

  {
    // read config
    // load DB from Sequelize
    // Point to ifesx-backend DB
    const sequelize = new Sequelize({
      storage: './test.sqlite3',
      dialect: 'sqlite',
      logging: false
    })
    sequelize.addModels([
      SpecialCharacter,
      Meldung,
      // VDV
      BasisVersion,
      BasisVerGueltigkeit,
      RecOrt,
      RecHp,
      RecLid,
      LidVerlauf,
      RecFrt,
      RecUmlauf,
      RecZnr,
      RecAnr,
      RecSel,
      RecOm,
      RecSelZp,
      SelFztFeld,
      Firmenkalender
    ])
    // Init terminal(s)

    const deviceConfig: DeviceConfig = require('../device_config.json')

    // Serial port resolution: optional argv[2] override (dev/socat convenience), else the
    // configured serial_port, else none -> IBISController runs in no-serial setup mode.
    portString = process.argv[2] || deviceConfig.serial_port || undefined
    Util.log(portString ? `Using serial port: ${portString}` : 'No serial port configured (setup mode)')

    websocket = new WebSocketServer({ port: 1815 });

    var cors = require('cors');
    let app = express()



    app.use(cors());
    app.use(bodyParser.json());       // to support JSON-encoded bodies
    app.use(bodyParser.urlencoded({     // to support URL-encoded bodies
      extended: true
    }));
    (async () => {
      try {
        await sequelize.sync(); // Wait for the database sync
        await sequelize.sync(); // Wait for the database sync
        const server = app.listen(2000, '127.0.0.1', () => {
          Util.log('Listening for clients on port 2000 (localhost only)');
        });

        // Graceful shutdown handling (also invoked by the setup wizard's restart button)
        gracefulShutdown = () => {
          Util.log('Received kill signal, shutting down gracefully');

          // Close WebSocket server
          if (websocket) {
            websocket.close(() => {
              Util.log('WebSocket server closed');
            });
          }

          // Close Express server
          server.close(() => {
            Util.log('HTTP server closed');
          });

          // Close Database connection if needed (sequelize usually handles pool)
          sequelize.close().then(() => {
            Util.log('Database connection closed');
          });

          if (ibisController) {
            // Potential cleanup for ibisController if needed
          }

          process.exit(0);
        };

        process.on('SIGTERM', gracefulShutdown);
        process.on('SIGINT', gracefulShutdown);


      } catch (error) {
        console.error("Initialization failed:", error);
      }
    })();


    const audioController = new AudioController()
    let locationController = new LocationController();

    ibisController = new IBISController(portString, 10, websocket, locationController)
    locationController.ibisController = ibisController
    ibisController.audioController = audioController
    if (deviceConfig.MFD == true) {
      let mfdController = new MFDController(ibisController, app);
    }

    // Initialize MTT Controller
    let mttController = new MTTController(ibisController, app);

    if (deviceConfig.RADIO && deviceConfig.RADIO.enabled == true) {
      let radioController = new RadioController('vehicle', ibisController)
      ibisController.radioController = radioController
      radioController.startListening()
    }

    // Setup wizard + ifesx data upload (served at /setup, API under /api/setup).
    // The restart hook shuts the process down; on the Pi a supervisor brings it back,
    // locally the wizard shows a manual-restart hint and reconnects when it returns.
    new SetupController(ibisController, app, () => gracefulShutdown());


    //if (deviceConfig.use_gpio == true && deviceConfig.GPIO_PINOUT != undefined) {
    //}
    app.use('/tfs', express.static('diag_root'));

    app.get('/diag', (req: Request, res: Response) => {
      res.json({
        "linie": ibisController.linie,
        "kurs": ibisController.kurs,
        //"route": ibisController.route,
        "upcoming_stop": ibisController.upcomingStop,
        "impulses_since_reset": locationController.impulsesSinceReset,
        //"possible_next_stop_distances": locationController.possibleNextStopDistances
      })
    })
    app.get('/diag/wi', (req: Request, res: Response) => {
      const impulses = parseInt((req.query.impulses as string));
      Util.log('Received ', impulses, " from diags");
      for (var i = 0; i < impulses; i++) {
        locationController.wiInterrupt();
      }
      res.json({ "counter": locationController.impulsesSinceReset })
    })


    app.post('/diag/sendTelegram', (req: Request, res: Response) => {
      const telegram = req.body.telegram;
      res.send('sent telegram: ' + telegram);

      ibisController.sendTelegram((telegram as IBISTelegram))
    })

    app.get('/debug/test_route', async (req: Request, res: Response) => {
      Util.log("DEBUG: Setting Line 1");
      await ibisController.setLine("1");
      Util.log("DEBUG: Setting Route 1");
      const success = await ibisController.setRoute(1);
      res.json({
        success,
        line: ibisController.linie,
        stops: ibisController.currentStops.length
      });
    });

    app.get('/debug/set_line/:line', async (req: Request, res: Response) => {
      const line = req.params.line;
      Util.log(`DEBUG: Setting Line ${line}`);
      await ibisController.setLine(line);
      res.json({ line: ibisController.linie });
    });

    app.get('/debug/set_route/:route', async (req: Request, res: Response) => {
      const route = parseInt(req.params.route);
      Util.log(`DEBUG: Setting Route ${route}`);
      const success = await ibisController.setRoute(route);
      res.json({ success, stops: ibisController.currentStops.length });
    });






  }


}
main()