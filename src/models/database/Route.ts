import { Destination } from './Destination';
 import { BelongsTo, Column, DataType, ForeignKey, HasMany, HasOne, Model, PrimaryKey, Table } from "sequelize-typescript";
import { RouteStop } from "./RouteStop";
import { Line } from './Line';


@Table({
  timestamps: false,
  tableName: 'routes'
})
export class Route extends Model {
  @ForeignKey(() => Line)
  @Column(DataType.STRING)
  line_id!: string;
  @Column(DataType.STRING)
  route_id!: string;
  @Column(DataType.INTEGER)
  direction!: number;
  @ForeignKey(() => Destination)
  @Column(DataType.INTEGER)
  destination_id!: number
  @BelongsTo(() => Destination, { foreignKey: 'destination_id', targetKey: 'id' , as: 'routeDestination' })
  routeDestination!: Destination
  @HasMany(() => RouteStop) // 'route_id' is the foreign key in RouteStop model
  stops!: RouteStop[];
}
