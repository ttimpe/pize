import { IBISController } from "./IBISController";
//import { init } from 'raspi';
//import { DigitalInput, DigitalOutput, PULL_UP } from 'raspi-gpio';
import { RouteStop } from "../models/database/RouteStop";
import { StopDistance } from "../models/database/StopDistance";
import { Stop } from "../models/database/Stop";
import { DeviceConfig } from '../models/devices/DeviceConfig';
import { Util } from "../util";
import { TelegramGenerator } from "../IBISTelegramGenerator";
import { Route } from "../models/database/Route";
import { Op } from "sequelize";

class LocationController {
    private latitude: number
    private longitude: number

    impulsesSinceReset: number
    private IMPULSES_PER_KILOMETER = 4000;
    private FANGRADIUS = 10;
    ibisController: IBISController

    private announcementAlreadyPlayed: boolean = false

    possibleNextStopDistances: StopDistance[] = []
    private deviceConfig: DeviceConfig = require('../../device_config.json')

    

    constructor() {
        
        
    }

    // Interrupt wenn Wegimpuls
    wiInterrupt() {
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
    async checkStopDistancesForRouteObject(route: Route): Promise<boolean> {
         // Ensure route.stops is loaded
    // Ensure route.stops is loaded
    if (!route.stops) {
        await route.reload({
          include: [{
            model: RouteStop,
            required: true
          }]
        })
      }
    
      if (!route.stops || route.stops.length < 2) {
        Util.log(`⚠️ Route "${route.route_id}" has fewer than 2 stops.`)
        return false
      }
    
      // Sort by sequence
      const sortedStops = route.stops.sort((a, b) => a.sequence_number - b.sequence_number)
      const consecutivePairs = []
    
      for (let i = 0; i < sortedStops.length - 1; i++) {
        consecutivePairs.push({
          origin_stop_id: sortedStops[i].stop_id,
          destination_stop_id: sortedStops[i + 1].stop_id
        })
      }
    
      // Load existing StopDistance entries
      const existing = await StopDistance.findAll({
        where: {
          [Op.or]: consecutivePairs
        }
      })
    
      const existingKeys = new Set(
        existing.map(e => `${e.origin_stop_id}-${e.destination_stop_id}`)
      )
    
      const missing = consecutivePairs.filter(({ origin_stop_id, destination_stop_id }) =>
        !existingKeys.has(`${origin_stop_id}-${destination_stop_id}`)
      )
    
      if (missing.length === 0) {
        Util.log(`✅ Route "${route.route_id}": all consecutive StopDistance entries are present.`)
        return true
      }
    
      // Load missing stops for nicer output
      const stopIds = Array.from(new Set(missing.flatMap(p => [p.origin_stop_id, p.destination_stop_id])))
      const stops = await Stop.findAll({
        where: {
          id: stopIds
        }
      })
    
      const stopMap = new Map(stops.map(stop => [stop.id, stop.name]))
    
      Util.log(`❌ Route "${route.route_id}" is missing ${missing.length} consecutive StopDistance entries:`)
      for (const { origin_stop_id, destination_stop_id } of missing) {
        const originName = stopMap.get(origin_stop_id) || origin_stop_id
        const destinationName = stopMap.get(destination_stop_id) || destination_stop_id
        Util.log(`  • ${originName} → ${destinationName}`)
      }
    
      return false
      }
      
      

    async onSetRoute() {
        this.impulsesSinceReset = 0;
        if (this.ibisController.route) {
            await this.checkStopDistancesForRouteObject(this.ibisController.route)

            this.arriveAtStop(this.ibisController.route.stops[0])
            // Überprüfen, ob Abstände alle existieren:

        }

    }
    async arriveAtStop(routeStop: RouteStop) {
        if (routeStop) {
            this.impulsesSinceReset = 0;
            this.ibisController.arriveAtStop(routeStop);
            this.possibleNextStopDistances = await this.getPossibleNextStops(routeStop)
            this.announcementAlreadyPlayed = false;
        }
    }



    updateDistances() {
        let traveledMetersSinceLastStop = this.impulsesSinceReset / this.IMPULSES_PER_KILOMETER * 1000;
        if (this.ibisController.route) {

        let nextStop = this.possibleNextStopDistances.filter((stopDistance: StopDistance) => {
            if (stopDistance.destination_stop_id == this.ibisController.upcomingStop.stop_id) {
                return true
            } else {
                return false
            }
        })[0]
        if (nextStop == undefined) {
            Util.log('NO NEXT STOP FOUND')
        }

        let distanceToNextStop = nextStop.distance - traveledMetersSinceLastStop;
        Util.log("distance to next stop: ", distanceToNextStop)
        if (distanceToNextStop <= this.FANGRADIUS) {
            this.arriveAtStop(this.ibisController.upcomingStop);
        } else if (distanceToNextStop <= this.deviceConfig.announcement_distance_before_next_stop && this.announcementAlreadyPlayed == false) {
            this.ibisController.playAnnouncementForRouteStop(this.ibisController.upcomingStop)
            this.announcementAlreadyPlayed = true

        }
    }
    }

    private async getPossibleNextStops(routeStop: RouteStop) {
       let possibleStops = await StopDistance.findAll( { where: {
            origin_stop_id: routeStop.stop.id
        }})
        Util.log('possible next stops', possibleStops)
        return possibleStops;
    }

    queryIRIS() {
        if (this.deviceConfig.IRIS_A) {

        }
        if (this.deviceConfig.IRIS_B) {
            
        }
    }
    simulateDrive(speed: number, distance: number) {
        const impulsesNeeded = distance / 1000 * this.IMPULSES_PER_KILOMETER;
        const totalSeconds = (distance / speed) * 3600; // total time in seconds
        const intervalMs = (totalSeconds / impulsesNeeded) * 1000; // time between impulses in ms
    
        let count = 0;
    
        let interval = setInterval(() => {
            if (count >= impulsesNeeded) {
                clearInterval(interval);
                return;
            } else {
                this.wiInterrupt();
                count++;
            }
        }, intervalMs);
    }
    
}
export { LocationController }