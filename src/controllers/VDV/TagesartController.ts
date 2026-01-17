import { Router, Request, Response } from "express";
import { RecTagesart } from "../../models/database/VDV/RecTagesart";

export class TagesartController {
    public router: Router = Router();

    constructor() {
        this.router.get('/', this.getAll);
        this.router.get('/:id', this.getOne);
    }

    getAll = async (req: Request, res: Response) => {
        try {
            const types = await RecTagesart.findAll();
            res.json(types);
        } catch (error) {
            res.status(500).send(error);
        }
    }

    getOne = async (req: Request, res: Response) => {
        try {
            const { id } = req.params;
            const type = await RecTagesart.findOne({
                where: { TAGESART_NR: id }
            });
            if (type) {
                res.json(type);
            } else {
                res.status(404).send('Not found');
            }
        } catch (error) {
            res.status(500).send(error);
        }
    }
}
