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
        if (this.ibisController.route) {
        return res.json(this.ibisController.route);
        } else {
            return res.json( {})
        }
    })
    this.app.listen(2000, () => {
        Util.log('Listening for clients on port 2000');
    })
}

}
