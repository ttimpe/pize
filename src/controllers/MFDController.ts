// this class provides an API and static web hosting for MFD data
import express, { Express, Request, Response } from "express";
import { IBISController } from "./IBISController";
import { Util } from "../util";


export class MFDController {
ibisController: IBISController
constructor(ibisController: IBISController, app: Express) {
    // MFD static data
    this.ibisController = ibisController
    
    app.use('/mfd', express.static('mfd_root'));
    app.get('/api/tripData', (req: Request, res: Response) => {
        res.json( {
            "line": this.ibisController?.linie,
            "route": this.ibisController?.route,
            "kurs": this.ibisController?.kurs,
            "destination": this.ibisController?.ziel,
            "stopIndex": this.ibisController?.stopIndex
        })
    })
   
}

}
