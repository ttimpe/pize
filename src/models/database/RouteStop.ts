import { BelongsTo, Column, DataType, ForeignKey, HasMany, HasOne, Model, Table } from "sequelize-typescript";
import { Stop } from "./Stop";
import { Route } from "./Route";
import { Line } from "./Line";
import { Announcement } from "./Announcement";

@Table({ 
  timestamps: false,
  tableName: 'route_stops'
})
export class RouteStop extends Model {
  @Column(DataType.STRING)
  stop_id!: string;
  @Column(DataType.INTEGER)
  sequence_number!: number
  @Column(DataType.BOOLEAN)
  hasHighPlatform: boolean = false
  @Column(DataType.INTEGER)
  doorSide!: number
  @BelongsTo(() => Stop, { foreignKey: 'stop_id', targetKey: 'id' })
  stop!: Stop
  @ForeignKey(() => Route)
  @Column(DataType.INTEGER)
  route_id!: number
  @BelongsTo(() => Route)
  route!: Route
/*  @HasMany(() => StopTime, {
    foreignKey: 'route_stop_id', // Ensure the foreign key is correctly defined
    sourceKey: 'id'
  })
  stopTimes?: StopTime[]*/
  @ForeignKey(() => Announcement)
  @Column(DataType.INTEGER)
  announcement_id?: number;
  @BelongsTo(() => Announcement, { foreignKey: 'announcement_id' })
  announcement?: Announcement;

}

