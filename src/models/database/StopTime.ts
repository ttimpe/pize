import { BelongsTo, Column, DataType, ForeignKey, HasOne, Model, NotNull, PrimaryKey, Table } from "sequelize-typescript";
import { Trip } from "./Trip";
import { RouteStop } from "./RouteStop";
@Table({ 
    timestamps: false,
    tableName: 'stop_times'
})

export class StopTime extends Model {
    @PrimaryKey
    @Column(DataType.INTEGER)
    id!: number
    @Column(DataType.INTEGER)
    arrivalTime?: number
    @Column(DataType.INTEGER)
    departureTime?: number
    @BelongsTo(() => Trip, {
      foreignKey: 'trip_id',
      targetKey: 'id'
    })
    trip!: Trip
    @ForeignKey(() => RouteStop)
    @Column(DataType.INTEGER)
    route_stop_id!: number;
    @BelongsTo(() => RouteStop, {
      foreignKey: 'route_stop_id',
      targetKey: 'id'
    })
    stop!: RouteStop;
    @ForeignKey(() => Trip)
    @Column(DataType.INTEGER)
    trip_id!: number
}