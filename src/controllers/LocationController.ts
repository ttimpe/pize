import { IBISController } from "./IBISController";
//import { init } from 'raspi';
//import { DigitalInput, DigitalOutput, PULL_UP } from 'raspi-gpio';
import { RouteStop } from "../models/database/RouteStop";
import { StopDistance } from "../models/database/StopDistance";
import { Stop } from "../models/database/Stop";
import { DeviceConfig } from '../models/devices/DeviceConfig';
import { Util } from "../util";
import { TelegramGenerator } from "../IBISTelegramGenerator";

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

    onSetRoute() {
        this.impulsesSinceReset = 0;
        if (this.ibisController.route) {
            this.arriveAtStop(this.ibisController.route.stops[0])
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