import { SpecialCharacter } from './models/database/SpecialCharacter';
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
    public specialCharacter?: SpecialCharacter

  


}
export { Vehicle }