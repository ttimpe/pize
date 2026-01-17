import { SpecialCharacter } from './models/database/SpecialCharacter';

class Vehicle {
    private static instance: Vehicle

    private constructor() { }

    public static getInstance(): Vehicle {
        if (!Vehicle.instance) {
            Vehicle.instance = new Vehicle()
        }
        return Vehicle.instance
    }

    public direction?: number
    public stopIndex: number = 0
    public courseNumber: number = 0
    public specialCharacter?: SpecialCharacter




}
export { Vehicle }