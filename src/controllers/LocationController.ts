import { IBISController } from "./IBISController";
import { DeviceConfig } from '../models/devices/DeviceConfig';
import { Util } from "../util";
import { TelegramGenerator } from "../IBISTelegramGenerator";
import { Op } from "sequelize";
import { RecSel } from "../models/database/VDV/RecSel";
import { LidVerlauf } from "../models/database/VDV/LidVerlauf";

class LocationController {
  private latitude: number
  private longitude: number

  impulsesSinceReset: number
  private IMPULSES_PER_KILOMETER = 4000;
  private FANGRADIUS = 50; // Increased fangradius for testing
  ibisController: IBISController

  private announcementAlreadyPlayed: boolean = false

  possibleNextStopDistances: RecSel[] = []
  public currentDistLastStop: number = 0;
  public currentDistNextStop: number = 0;
  private deviceConfig: DeviceConfig = require('../../device_config.json')



  constructor() {
  }

  // Interrupt wenn Wegimpuls
  wiInterrupt() {
    // Util.log("wiInterrupt called"); // Verbose logging
    this.impulsesSinceReset++;
    this.updateDistances();
  }

  // Türkontakt Interrupt
  tkInterrupt() {
    // Aktuelle Hst zur Basis der aktuellen Position machen
    this.impulsesSinceReset = 0;
  }
  // Ortsbaken-Interupt - OB lesen, Position setzen, WI-Zähler nullen
  obInterrupt() {

  }

  async onSetRoute() {
    console.log('[onSetRoute] Called! Resetting impulses and loading distances for first stop.');
    this.impulsesSinceReset = 0;
    // VDV: Initialize location logic for first stop
    if (this.ibisController.currentStops && this.ibisController.currentStops.length > 0) {
      Util.log(`[onSetRoute] Current stops count: ${this.ibisController.currentStops.length}`);
      Util.log(`[onSetRoute] First stop: ${this.ibisController.currentStops[0].stop?.recOrt?.ORT_NAME || 'Unknown'} (${this.ibisController.currentStops[0].ORT_NR})`);
      Util.log("Initializing LocationController for VDV Route: " + (this.ibisController.currentStops[0].stop?.recOrt?.ORT_NAME || 'Unknown'));
      // Load distances for first stop AND notify IBIS to advance stopIndex to 1 (Next Stop)
      // This ensures upcomingStop points to Stop 1, which matches the RecSel target from Stop 0
      await this.arriveAtStop(this.ibisController.currentStops[0], true);
    } else {
      console.log('[onSetRoute] No current stops available!');
    }
  }

  async arriveAtStop(routeStop: LidVerlauf, notifyIBIS: boolean = true) {
    if (routeStop) {
      if (!(routeStop instanceof LidVerlauf)) {
        Util.log("LocationController: Invalid stop type (not LidVerlauf). Skipping.");
        return;
      }

      // Handle LidVerlauf (VDV)
      const ortName = routeStop.stop?.recOrt?.ORT_NAME || 'Unknown';
      const ortNr = routeStop.ORT_NR;

      Util.log(`LocationController: Arrived at stop: ${ortName} (${ortNr}). NotifyIBIS: ${notifyIBIS}`);
      this.impulsesSinceReset = 0;
      if (notifyIBIS) {
        this.ibisController.arriveAtStop(routeStop);
      }
      this.possibleNextStopDistances = await this.getPossibleNextStops(routeStop)
      this.announcementAlreadyPlayed = false;
      this.updateDistances();
    }
  }

  updateDistances() {
    let traveledMetersSinceLastStop = this.impulsesSinceReset / this.IMPULSES_PER_KILOMETER * 1000;

    // Always update distance from last stop
    this.currentDistLastStop = Math.round(traveledMetersSinceLastStop);

    if (this.ibisController.upcomingStop && this.possibleNextStopDistances.length > 0) {
      // Find RecSel that points to upcoming stop
      // Strict VDV Logic
      const upcomingStop = this.ibisController.upcomingStop;

      if (!(upcomingStop instanceof LidVerlauf)) {
        // Should not happen if everything is typed correctly, but safe guard
        this.currentDistNextStop = 0;
        return false;
      }

      // Logic for Start (Index 0): Look ahead to Stop 1
      const isStartStop = this.ibisController.stopIndex === 0;
      const targetStop = isStartStop && this.ibisController.currentStops.length > 1
        ? this.ibisController.currentStops[1]
        : upcomingStop;

      const upcomingOrtNr = targetStop.ORT_NR;

      // Util.log(`[RecSel Debug] Looking for SEL_ZIEL=${upcomingOrtNr} in ${this.possibleNextStopDistances.length} entries`);
      if (this.possibleNextStopDistances.length > 0) {
        // Util.log(`[RecSel Debug] Available targets: ${this.possibleNextStopDistances.map(s => s.SEL_ZIEL).join(', ')}`);
      }

      let nextStop = this.possibleNextStopDistances.find((sel: RecSel) => {
        // Debugging types
        // Util.log(`[RecSel Check] Comparing target ${sel.SEL_ZIEL} (Type: ${typeof sel.SEL_ZIEL}) with upcoming ${upcomingOrtNr} (Type: ${typeof upcomingOrtNr})`);
        return sel.SEL_ZIEL == upcomingOrtNr; // Loose equality just in case
      });

      if (nextStop == undefined) {
        Util.log(`[LocationController] No dist match: ORT_NR=${upcomingOrtNr} not in targets [${this.possibleNextStopDistances.map(s => s.SEL_ZIEL).join(',')}]`);
        Util.log(`[RecSel Debug] ❌ NO MATCH found for ORT_NR ${upcomingOrtNr}`);
        this.currentDistNextStop = 0;
        return false
      }

      let distanceToNextStop = (nextStop.SEL_LAENGE || 0) - traveledMetersSinceLastStop;

      // Update distance to next stop
      this.currentDistNextStop = Math.round(distanceToNextStop);

      Util.log("distance to next stop: ", distanceToNextStop)

      if (distanceToNextStop <= this.FANGRADIUS) {
        this.arriveAtStop(this.ibisController.upcomingStop);
      } else if (distanceToNextStop <= this.deviceConfig.announcement_distance_before_next_stop && this.announcementAlreadyPlayed == false) {
        this.ibisController.playAnnouncementForRouteStop(this.ibisController.upcomingStop)
        this.announcementAlreadyPlayed = true
      }

      // Departure Logic (Fangradius) for Start Stop
      if (isStartStop && nextStop.SEL_LAENGE) {
        const traveled = (nextStop.SEL_LAENGE || 0) - distanceToNextStop;
        if (traveled > this.FANGRADIUS) {
          Util.log(`Departure detected: Traveled ${traveled}m from Start > ${this.FANGRADIUS}m.`);
          this.ibisController.advanceFromStart();
        }
      }
    } else {
      // No upcoming stop or no distance data available
      this.currentDistNextStop = 0;
    }
  }

  private async getPossibleNextStops(routeStop: LidVerlauf): Promise<RecSel[]> {
    if (!routeStop) return [];

    const currentOrtNr = routeStop.ORT_NR;

    try {
      console.log(`[getPossibleNextStops] Querying RecSel with ORT_NR = ${currentOrtNr}`);
      let possibleStops = await RecSel.findAll({
        where: {
          ORT_NR: currentOrtNr
        }
      });
      console.log(`[getPossibleNextStops] Query returned ${possibleStops.length} entries`);
      if (possibleStops.length > 0) {
        console.log(`[getPossibleNextStops] SEL_ZIEL values: ${possibleStops.map(s => `${s.SEL_ZIEL} (${s.SEL_LAENGE}m)`).join(', ')}`);
      }
      Util.log(`Found ${possibleStops.length} possible next stops via REC_SEL for ORT_NR ${currentOrtNr}`)
      return possibleStops;
    } catch (e) {
      console.error("Error fetching RecSel:", e);
      return [];
    }
  }

  queryIRIS() {
    if (this.deviceConfig.IRIS_A) {

    }
    if (this.deviceConfig.IRIS_B) {

    }
  }
  simulateDrive(speed: number, distance: number) {
    if (speed <= 0) return;

    // Distance in Meters. Speed in km/h.
    // 1 impulse per (1000m / IMPULSES_PER_KILOMETER) meters.
    const metersPerImpulse = 1000 / this.IMPULSES_PER_KILOMETER;
    const impulsesNeeded = Math.ceil(distance / metersPerImpulse);

    // Speed km/h -> m/s
    const speedMs = speed / 3.6;

    // Time for TOTAL distance
    // const totalSeconds = distance / speedMs;

    // Time between impulses (seconds) = metersPerImpulse / speedMs
    const intervalSeconds = metersPerImpulse / speedMs;
    const intervalMs = intervalSeconds * 1000;

    Util.log(`Simulating Drive: Distance=${distance}m, Speed=${speed}km/h (${speedMs.toFixed(2)}m/s).`)
    Util.log(`  -> Impulses Needed: ${impulsesNeeded}, Interval: ${intervalMs.toFixed(2)}ms`);

    let count = 0;

    let interval = setInterval(() => {
      if (count >= impulsesNeeded) {
        clearInterval(interval);
        Util.log("Simulation finished.");
        return;
      } else {
        Util.log(`Simulate pulse ${count}/${impulsesNeeded}`);
        this.wiInterrupt();
        count++;
      }
    }, intervalMs);
  }

}
export { LocationController }