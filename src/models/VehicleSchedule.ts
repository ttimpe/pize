import { Column, DataType, HasMany, Model, PrimaryKey, Table } from "sequelize-typescript"
//import { Trip } from "./Trip"
@Table({ 
    timestamps: false,
    tableName: 'schedules'
})


export class VehicleSchedule extends Model {
    @PrimaryKey
    @Column(DataType.INTEGER)
    id!: number
    @Column(DataType.INTEGER)
    number?: number
    @Column(DataType.INTEGER)
    daytype?: number
    @Column(DataType.INTEGER)
    departureTime?: number
    @Column(DataType.INTEGER)
    arrivalTime?: number
   /* @HasMany(() => Trip)
    trips: Trip[] = []*/
}