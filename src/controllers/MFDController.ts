// this class provides an API and static web hosting for MFD data
import express, { Express, Request, Response } from "express";
import { IBISController } from "./IBISController";
import { Util } from "../util";
import { LidVerlauf } from "../models/database/VDV/LidVerlauf";
import { RecLid } from "../models/database/VDV/RecLid";
import { RecFrt } from "../models/database/VDV/RecFrt";
import { Firmenkalender } from "../models/database/VDV/Firmenkalender";
import { RecOrt } from "../models/database/VDV/RecOrt";
import { SelFztFeld } from "../models/database/VDV/SelFztFeld";
import { Op, QueryTypes } from "sequelize";


export class MFDController {
    ibisController: IBISController
    constructor(ibisController: IBISController, app: Express) {
        // MFD static data
        this.ibisController = ibisController

        app.use('/mfd', express.static('mfd_root'));
        app.get('/api/tripData', async (_req: Request, res: Response) => {
            const stops = this.ibisController?.currentStops || [];
            const stopsWithConnections = await Promise.all(stops.map(async (s) => {
                const departures = s.ORT_NR ? await this.getConnectionDepartures(s.ORT_NR) : [];
                return {
                    ...s.toJSON(),
                    stop: s.stop,
                    destination: s.destination,
                    announcement: s.announcement,
                    plannedArrival: s.plannedArrival,
                    connectionLines: departures
                }
            }));

            const nextTrip = this.ibisController?.nextTrip;
            let nextTripInfo = null;
            if (nextTrip) {
                const basisVersion = await this.ibisController.getActiveBasisVersion();
                // Get destination text for next trip (last productive stop)
                const nextTripStops = await LidVerlauf.findAll({
                    where: { LI_NR: nextTrip.LI_NR, STR_LI_VAR: nextTrip.STR_LI_VAR, BASIS_VERSION: basisVersion },
                    order: [['LI_LFD_NR', 'DESC']],
                    limit: 1
                });
                const nextDestName = nextTripStops.length > 0
                    ? (nextTripStops[0].stop?.recOrt?.ORT_REF_ORT_NAME || nextTripStops[0].stop?.recOrt?.ORT_NAME)
                    : "Unbekannt";

                nextTripInfo = {
                    line: nextTrip.LI_NR,
                    lineKuerzel: (await RecLid.findOne({ where: { LI_NR: nextTrip.LI_NR, BASIS_VERSION: basisVersion } }))?.LI_KUERZEL,
                    destination: nextDestName,
                    isSameLine: nextTrip.LI_NR === this.ibisController?.linie?.LI_NR
                };
            }

            // Connection view data: if we are close to the next stop
            let currentConnections = [];
            const upcomingStop = this.ibisController?.upcomingStop;
            if (upcomingStop && this.ibisController.distanceToNextStop <= 50) {
                currentConnections = await this.getConnectionDepartures(upcomingStop.ORT_NR);
            }

            res.json({
                "line": this.ibisController?.linie,
                "route": this.ibisController?.route,
                "kurs": this.ibisController?.kurs,
                "destination": this.ibisController?.ziel,
                "stopIndex": this.ibisController?.stopIndex,
                "distanceToNextStop": this.ibisController?.distanceToNextStop,
                "infoMessage": this.ibisController?.infoMessage,
                "nextTrip": nextTripInfo,
                "currentConnections": currentConnections,
                "tripStartTime": this.ibisController?.currentTrip?.FRT_START,
                "betriebstag": (this.ibisController as any)?.currentBetriebstag || this.ibisController?.getOperationalDayInfo()?.betriebstag,
                "currentStops": stopsWithConnections
            })
        })

    }

    /**
     * Get connection departures for a given stop (ORT_NR)
     * Returns up to 6 next departures including time, line and destination
     */
    private async getConnectionDepartures(ortNr: number): Promise<Array<{ time: string, lineNumber: string, destination: string, type: 'stadtbahn' | 'bus' }>> {
        try {
            const currentBetriebstag = (this.ibisController as any)?.currentBetriebstag;
            const opInfo = (this.ibisController as any)?.getOperationalDayInfo(currentBetriebstag) || { betriebstag: 0, secondsSinceStart: 0 };
            const currentSeconds = opInfo.secondsSinceStart;
            const tagesartNr = (this.ibisController as any)?.tagesartNr !== -1 ? (this.ibisController as any)?.tagesartNr : 1;
            const basisVersion = await this.ibisController.getActiveBasisVersion();

            const currentOrt = await RecOrt.findOne({ where: { ORT_NR: ortNr, BASIS_VERSION: basisVersion } });
            if (!currentOrt) return [];

            const parentOrtNr = currentOrt.ORT_REF_ORT || currentOrt.ORT_NR;

            // Query logic:
            // 1. Find trips passing through this parent stop on this day
            // 2. Window: FRT_START within -30min to +2h of now
            const startTime = currentSeconds - 1800; // Look back slightly for late trips
            const endTime = currentSeconds + 7200;

            // 1. Find all line variants (LI_NR, STR_LI_VAR) that pass through the stop (ID or ParentID)
            const passingRoutes = await LidVerlauf.findAll({
                where: { BASIS_VERSION: basisVersion },
                include: [{
                    model: RecOrt,
                    required: true,
                    where: {
                        [Op.or]: [
                            { ORT_NR: parentOrtNr },
                            { ORT_REF_ORT: parentOrtNr }
                        ]
                    }
                }],
                attributes: ['LI_NR', 'STR_LI_VAR', 'LI_LFD_NR']
            });

            console.log(`[MFD] ORT ${ortNr} (Parent ${parentOrtNr}): Found ${passingRoutes.length} passing routes.`);

            if (passingRoutes.length === 0) return [];

            // Group by LI_NR + STR_LI_VAR to avoid duplicates in IN clause (though Op.or handles arrays)
            // We need to know the stop_sequence for each variant at this stop to calculate arrival later
            const routeMap = new Map<string, number>(); // "LI_NR:STR_LI_VAR" -> stop_sequence
            const orConditions: any[] = [];

            passingRoutes.forEach(route => {
                const key = `${route.LI_NR}:${route.STR_LI_VAR}`;
                if (!routeMap.has(key)) {
                    routeMap.set(key, route.LI_LFD_NR);
                    orConditions.push({
                        LI_NR: route.LI_NR,
                        STR_LI_VAR: route.STR_LI_VAR
                    });
                }
            });

            // 2. Find Trips (RecFrt) that match these variants and time window
            const trips = await RecFrt.findAll({
                where: {
                    BASIS_VERSION: basisVersion,
                    TAGESART_NR: tagesartNr,
                    FRT_START: { [Op.between]: [startTime, endTime] },
                    [Op.or]: orConditions
                },
                include: [
                    { model: RecLid, required: true } // For LI_KUERZEL
                ],
                order: [['FRT_START', 'ASC']],
                limit: 40
            });

            console.log(`[MFD] Found ${trips.length} raw trips for time window ${startTime}-${endTime} (Tagesart ${tagesartNr})`);

            const currentLineKuerzel = this.ibisController?.linie?.LI_KUERZEL;
            const validDepartures = [];

            // 3. Process trips and find destinations
            for (const trip of trips) {
                const row = trip as any;
                row.LI_KUERZEL = trip.line?.LI_KUERZEL;

                if (row.LI_KUERZEL === currentLineKuerzel) {
                    // console.log(`[MFD] Skipping connection on same line: ${row.LI_KUERZEL}`);
                    continue;
                }

                const stopSequence = routeMap.get(`${trip.LI_NR}:${trip.STR_LI_VAR}`) || 1;
                row.stop_sequence = stopSequence;
                // Optimization: if stop_sequence is 1, arrival = FRT_START
                let stopArrival = row.FRT_START;
                if (row.stop_sequence > 1) {
                    // Fetch all segments up to this stop
                    const sequence = await LidVerlauf.findAll({
                        where: { LI_NR: row.LI_NR, STR_LI_VAR: row.STR_LI_VAR, BASIS_VERSION: basisVersion, LI_LFD_NR: { [Op.lte]: row.stop_sequence } },
                        order: [['LI_LFD_NR', 'ASC']]
                    });

                    for (let i = 1; i < sequence.length; i++) {
                        const prev = sequence[i - 1];
                        const curr = sequence[i];
                        const fzt = await SelFztFeld.findOne({
                            where: {
                                BASIS_VERSION: basisVersion,
                                ORT_NR: prev.ORT_NR,
                                ONR_TYP_NR: prev.ONR_TYP_NR || 1, // Assumption
                                SEL_ZIEL: curr.ORT_NR,
                                SEL_ZIEL_TYP: curr.ONR_TYP_NR || 1,
                                FGR_NR: row.FGR_NR || 1
                            }
                        });
                        stopArrival += fzt?.SEL_FZT || 60;
                    }
                }

                if (stopArrival < currentSeconds) continue; // Past

                // Find Destination
                let destinationName = "Unknown";
                const lastStop = await LidVerlauf.findOne({
                    where: { LI_NR: trip.LI_NR, STR_LI_VAR: trip.STR_LI_VAR, BASIS_VERSION: basisVersion },
                    order: [['LI_LFD_NR', 'DESC']],
                    include: [{ model: RecOrt, required: false }]
                });

                // Fallback: Check if LidVerlauf has destination relation or just use ORT_NAME
                if (lastStop && lastStop.stop?.recOrt) {
                    destinationName = lastStop.stop.recOrt.ORT_NAME;
                } else if (lastStop) {
                    // Manual fetch if relation not perfect
                    const ort = await RecOrt.findOne({ where: { ORT_NR: lastStop.ORT_NR, BASIS_VERSION: basisVersion } });
                    if (ort) destinationName = ort.ORT_NAME;
                }

                validDepartures.push({
                    stopArrival,
                    lineNumber: row.LI_KUERZEL,
                    destination: destinationName,
                    type: (parseInt(row.LI_KUERZEL) >= 1 && parseInt(row.LI_KUERZEL) <= 4) ? 'stadtbahn' : 'bus'
                });
            }

            console.log(`[MFD] Found ${validDepartures.length} trips passed time/line filter.`);

            // Sort by calculated arrival
            validDepartures.sort((a, b) => a.stopArrival - b.stopArrival);

            // De-duplicate lines (keep closest)
            const seenLines = new Set();
            const finalDepartures = [];
            for (const dep of validDepartures) {
                if (finalDepartures.length >= 6) break;
                if (seenLines.has(dep.lineNumber + dep.destination)) continue;

                // Format relative time or absolute HH:MM
                const hours = Math.floor(dep.stopArrival / 3600) % 24;
                const minutes = Math.floor((dep.stopArrival % 3600) / 60);
                const timeStr = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;

                finalDepartures.push({
                    time: timeStr,
                    lineNumber: dep.lineNumber,
                    destination: dep.destination,
                    type: dep.type as any
                });
                seenLines.add(dep.lineNumber + dep.destination);
            }

            return finalDepartures;
        } catch (error) {
            Util.log(`Error fetching connection departures for ORT_NR ${ortNr}: ${error}`);
            return [];
        }
    }

}
