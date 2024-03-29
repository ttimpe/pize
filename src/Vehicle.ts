import { Destination } from "./models/database/Destination"
import { Line } from "./models/database/Line"
import { Route } from "./models/database/Route"
import { RouteStop } from "./models/database/RouteStop"
import { Stop } from "./models/database/Stop"
import { StopInformation } from "./models/database/StopInformation"

class Vehicle {
    private static instance: Vehicle
    
    private constructor() {}

    public static getInstance(): Vehicle {
        if (!Vehicle.instance) {
            Vehicle.instance = new Vehicle()
        }
        return Vehicle.instance
    }

    public line?: Line
    public route?: Route
    public direction?: number
    public destination?: Destination
    public stopIndex: number = 0
    public courseNumber: number = 0


    get upcomingStop(): RouteStop {
        return this.route.stops[this.stopIndex]
    }
    async setLine(lineNumber: string): Promise<boolean> {
        const line = await Line.findOne({
            where: {
                number: lineNumber
            }
        })
        if (line) {
            this.line = line
            return true
        }
        return false
    }

    async setRoute(routeNumber: number): Promise<boolean> {
        if (this.line) {
            const route = await Route.findOne({
                where: {
                    line_id: this.line.id,
                    route_id: routeNumber.toString()
                },
                include: [RouteStop, Destination, {
                    model: RouteStop,
                    include: [Stop, {
                        model: Stop,
                        include: [StopInformation], // Include the associated Stop model
                      },], // Include the associated Stop model
                  }]
            })
            if (route) {
                console.log(route)
                console.log(route.routeDestination)
                this.route = route
                this.destination = route.routeDestination
                return true
            } else {
                return false
            }
        }
        return false
    }
    
    setDirection(direction: number) {
        this.direction = direction
    }

    async setDestination(destinationNumber: number): Promise<boolean> {
        const destination = await Destination.findOne({
            where: {
                number: destinationNumber
            }
        })
        if (destination) {
            this.destination = destination
            return true
        } else {
            return false
        }
    }
    setCourseNumber(courseNumber: number) {
        this.courseNumber = courseNumber
        // If we also have a line, let's go find a valid schedule
    }

    skipStop() {
        this.stopIndex = this.stopIndex + 1
    }


}
export { Vehicle }