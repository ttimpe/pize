// this class provides an API and static web hosting for MFD data
import express, { Express, Request, Response } from "express";
import { IBISController } from "./IBISController";
import { Util } from "../util";


export class MFDController {
app: Express = express()
ibisController: IBISController
constructor(ibisController: IBISController) {
    // MFD static data
    this.ibisController = ibisController
    this.app.use('/mfd', express.static('mfd_root'));
    this.app.get('/api/tripData', (req: Request, res: Response) => {
        res.json( {
            "line": this.ibisController?.linie,
            "route": this.ibisController?.route,
            "kurs": this.ibisController?.kurs,
            "destination": this.ibisController?.ziel,
            "stopIndex": this.ibisController?.stopIndex
        })
    })
    this.app.listen(2000, () => {
        Util.log('Listening for clients on port 2000');
    })
}

}
