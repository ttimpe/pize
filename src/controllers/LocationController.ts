import { IBISController } from "./IBISController";
//import { init } from 'raspi';
//import { DigitalInput, DigitalOutput, PULL_UP } from 'raspi-gpio';
import { RouteStop } from "../models/database/RouteStop";
import { StopDistance } from "../models/database/StopDistance";
import { Stop } from "../models/database/Stop";
import { DeviceConfig } from '../models/devices/DeviceConfig';
import { Util } from "../util";
import { TelegramGenerator } from "../TelegramGenerator";

class LocationController {
    private latitude: number
    private longitude: number

    impulsesSinceReset: number
    private IMPULSES_PER_KILOMETER = 4000;
    private FANGRADIUS = 10;
    private ibisController: IBISController


    possibleNextStopDistances: StopDistance[] = []
    private deviceConfig: DeviceConfig = require('../device_config.json')

    constructor(ibisController: IBISController) {
        this.ibisController = ibisController
        
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
        this.arriveAtStop(this.ibisController.route.stops[0])


    }
    async arriveAtStop(routeStop: RouteStop) {
        this.impulsesSinceReset = 0;
        this.ibisController.arriveAtStop(routeStop);
        this.possibleNextStopDistances = await this.getPossibleNextStops(routeStop)
    }



    updateDistances() {
        let traveledMetersSinceLastStop = this.impulsesSinceReset / this.IMPULSES_PER_KILOMETER * 1000;
        
        let nextStop = this.possibleNextStopDistances.filter((stopDistance: StopDistance) => {
            if (stopDistance.destination_stop_id == this.ibisController.upcomingStop.stop_id) {
                return true
            } else {
                return false
            }
        })[0]

        let distanceToNextStop = nextStop.distance - traveledMetersSinceLastStop;
        Util.log("distance to next stop: ", distanceToNextStop)
        if (distanceToNextStop <= this.FANGRADIUS) {
            this.arriveAtStop(this.ibisController.upcomingStop);
        } else if (distanceToNextStop <= this.deviceConfig.announcement_distance_before_next_stop) {
            this.ibisController.playAnnouncementForRouteStop(this.ibisController.upcomingStop)

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
    }
}
export { LocationController }