import { Model, BelongsTo, Column, HasOne, PrimaryKey, DataType, Table, ForeignKey, HasMany } from "sequelize-typescript";
import { Route } from "./Route";
import { VehicleSchedule } from "./VehicleSchedule";
import { StopTime } from "./StopTime";

@Table({ 
    timestamps: false,
    tableName: 'trips'
  })
export class Trip extends Model {
    @PrimaryKey
    @Column(DataType.INTEGER)
    id!: number
    @Column(DataType.INTEGER)
    courseNumber?: number
    @Column(DataType.INTEGER)
    turnaroundMinutes?: number
    // Route
    @ForeignKey(() => Route) // Define foreign key
    @Column(DataType.INTEGER) // Adjust data type as needed
    routeId!: number; // Foreign key column referencing Route model
    @BelongsTo(() => Route)
    route?: Route;
    @BelongsTo(() => VehicleSchedule)
    schedule?: VehicleSchedule
    @ForeignKey(() => VehicleSchedule)
    @Column(DataType.INTEGER)
    schedule_id!: number
    @HasMany(() => StopTime)
    stopTimes!: StopTime[]
}