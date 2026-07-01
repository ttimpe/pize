// MTT Controller - Mobile Touch Terminal API and static hosting
import express, { Express, Request, Response } from "express";
import { IBISController } from "./IBISController";
import { Util } from "../util";
import { RecFrt } from "../models/database/VDV/RecFrt";
import { RecLid } from "../models/database/VDV/RecLid";
import { LidVerlauf } from "../models/database/VDV/LidVerlauf";
import { RecZnr } from "../models/database/VDV/RecZnr";
import { RecHp } from "../models/database/VDV/RecHp";
import { RecOrt } from "../models/database/VDV/RecOrt";
import { Firmenkalender } from "../models/database/VDV/Firmenkalender";
import { Op } from "sequelize";

export class MTTController {
    ibisController: IBISController

    constructor(ibisController: IBISController, app: Express) {
        this.ibisController = ibisController

        // Serve static MTT files
        const mttDistPath = require('path').join(process.cwd(), 'mtt_ui', 'dist');
        app.use('/mtt', express.static(mttDistPath));

        // Fallback for SPA routing
        app.get('/mtt/*', (req, res) => {
            res.sendFile(require('path').join(mttDistPath, 'index.html'));
        });

        // API: Get all trips for today
        app.get('/api/mtt/trips', async (req: Request, res: Response) => {
            try {
                const trips = await this.getTripsForToday();
                res.json({ trips });
            } catch (error) {
                Util.log(`MTT: Error getting trips: ${error}`);
                res.status(500).json({ error: 'Failed to load trips' });
            }
        });

        // API: Get route stops for a specific line/trip
        app.get('/api/mtt/route/:lineNr/:kurs', async (req: Request, res: Response) => {
            try {
                const lineNr = parseInt(req.params.lineNr);
                const kurs = parseInt(req.params.kurs);

                const stops = await this.getRouteStops(lineNr, kurs);
                res.json({ stops });
            } catch (error) {
                Util.log(`MTT: Error getting route: ${error}`);
                res.status(500).json({ error: 'Failed to load route' });
            }
        });

        // API: Search trips
        app.get('/api/mtt/search', async (req: Request, res: Response) => {
            try {
                const query = req.query.q as string;
                const trips = await this.searchTrips(query);
                res.json({ trips });
            } catch (error) {
                Util.log(`MTT: Error searching trips: ${error}`);
                res.status(500).json({ error: 'Search failed' });
            }
        });

        // API: Get current state (active line/trip)
        app.get('/api/mtt/state', async (_req: Request, res: Response) => {
            try {
                res.json({
                    line: this.ibisController?.linie,
                    kurs: this.ibisController?.kurs,
                    destination: this.ibisController?.ziel,
                    currentStops: this.ibisController?.currentStops?.map(s => ({
                        name: s.stop?.recOrt?.ORT_REF_ORT_NAME || s.stop?.recOrt?.ORT_NAME,
                        time: this.formatTime(s.plannedArrival)
                    }))
                });
            } catch (error) {
                Util.log(`MTT: Error getting state: ${error}`);
                res.status(500).json({ error: 'Failed to get state' });
            }
        });

        // API: Set line/trip
        app.post('/api/mtt/select', async (req: Request, res: Response) => {
            try {
                const { lineNr, kurs } = req.body;

                // TODO: Implement IBIS telegram to set line/kurs
                // For now, just acknowledge
                Util.log(`MTT: Selecting line ${lineNr}, kurs ${kurs}`);

                res.json({ success: true });
            } catch (error) {
                Util.log(`MTT: Error selecting trip: ${error}`);
                res.status(500).json({ error: 'Failed to select trip' });
            }
        });

        Util.log('MTT Controller initialized');
    }

    /**
     * Get all trips for today
     */
    private async getTripsForToday(): Promise<any[]> {
        try {
            // Get current operational day + active BASIS_VERSION (offset/time-travel aware, VDV 452)
            const betriebstag = this.ibisController.getOperationalDayInfo().betriebstag;
            const basisVersion = await this.ibisController.getActiveBasisVersion();

            const kalender = await Firmenkalender.findOne({ where: { BETRIEBSTAG: betriebstag, BASIS_VERSION: basisVersion } });
            const tagesartNr = kalender ? kalender.TAGESART_NR : 1;

            Util.log(`MTT: Getting trips for Tagesart ${tagesartNr}, BASIS_VERSION ${basisVersion}`);

            // Get all trips for today
            const trips = await RecFrt.findAll({
                where: {
                    BASIS_VERSION: basisVersion,
                    TAGESART_NR: tagesartNr,
                    FRT_START: {
                        [Op.not]: null
                    }
                },
                include: [{
                    model: RecLid,
                    required: true
                }],
                order: [['FRT_START', 'ASC']],
                limit: 50
            });

            // Format trips
            const formattedTrips = await Promise.all(trips.map(async (trip) => {
                // Exakte Variante der Fahrt verwenden (REC_LID-PK: LI_NR, STR_LI_VAR, BASIS_VERSION),
                // damit nicht eine beliebige Variante der Linie getroffen wird.
                const line = await RecLid.findOne({ where: { LI_NR: trip.LI_NR, STR_LI_VAR: trip.STR_LI_VAR || '', BASIS_VERSION: basisVersion } });

                // Get destination from route
                const routeStops = await LidVerlauf.findAll({
                    where: {
                        LI_NR: trip.LI_NR,
                        STR_LI_VAR: trip.STR_LI_VAR || '',
                        BASIS_VERSION: basisVersion
                    },
                    include: [{
                        model: RecZnr,
                        as: 'destination'
                    }],
                    order: [['LI_LFD_NR', 'DESC']],
                    limit: 1
                });

                const destination = routeStops[0]?.destination?.ZNR_TEXT || 'Unbekannt';
                const stopCount = await LidVerlauf.count({
                    where: {
                        LI_NR: trip.LI_NR,
                        STR_LI_VAR: trip.STR_LI_VAR || '',
                        BASIS_VERSION: basisVersion,
                        PRODUKTIV: true
                    }
                });

                return {
                    line: line?.LI_KUERZEL || trip.LI_NR.toString(),
                    destination,
                    startTime: this.formatTime(trip.FRT_START),
                    kurs: trip.FRT_FID,
                    stopCount,
                    lineNr: trip.LI_NR,
                    strLiVar: trip.STR_LI_VAR
                };
            }));

            return formattedTrips;
        } catch (error) {
            Util.log(`MTT: Error in getTripsForToday: ${error}`);
            return [];
        }
    }

    /**
     * Get route stops for a line/trip
     */
    private async getRouteStops(lineNr: number, kurs: number): Promise<any[]> {
        try {
            const basisVersion = await this.ibisController.getActiveBasisVersion();

            // Find the trip
            const trip = await RecFrt.findOne({
                where: {
                    LI_NR: lineNr,
                    FRT_FID: kurs,
                    BASIS_VERSION: basisVersion
                }
            });

            if (!trip) {
                Util.log(`MTT: Trip not found: line ${lineNr}, kurs ${kurs}`);
                return [];
            }

            // Get route stops
            const stops = await LidVerlauf.findAll({
                where: {
                    LI_NR: lineNr,
                    STR_LI_VAR: trip.STR_LI_VAR || '',
                    BASIS_VERSION: basisVersion
                },
                include: [{
                    model: RecHp,
                    as: 'stop',
                    include: [{
                        model: RecOrt,
                        as: 'recOrt'
                    }]
                }],
                order: [['LI_LFD_NR', 'ASC']]
            });

            // Format stops
            const formattedStops = stops.map(stop => ({
                name: stop.stop?.recOrt?.ORT_REF_ORT_NAME || stop.stop?.recOrt?.ORT_NAME || 'Unbekannt',
                time: null // Time calculation would require trip start time and fahrzeiten
            }));

            return formattedStops;
        } catch (error) {
            Util.log(`MTT: Error in getRouteStops: ${error}`);
            return [];
        }
    }

    /**
     * Search trips by line number or destination
     */
    private async searchTrips(query: string): Promise<any[]> {
        try {
            // Try to parse as line number
            const lineNr = parseInt(query);

            if (!isNaN(lineNr)) {
                // Search by line number
                const trips = await this.getTripsForToday();
                return trips.filter(trip => trip.lineNr === lineNr);
            } else {
                // Search by destination
                const trips = await this.getTripsForToday();
                return trips.filter(trip =>
                    trip.destination.toLowerCase().includes(query.toLowerCase())
                );
            }
        } catch (error) {
            Util.log(`MTT: Error in searchTrips: ${error}`);
            return [];
        }
    }

    /**
     * Format seconds since midnight as HH:MM
     */
    private formatTime(secondsSinceMidnight: number | undefined | null): string {
        if (secondsSinceMidnight === undefined || secondsSinceMidnight === null) {
            return '';
        }

        const hours = Math.floor(secondsSinceMidnight / 3600);
        const minutes = Math.floor((secondsSinceMidnight % 3600) / 60);

        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    }
}
