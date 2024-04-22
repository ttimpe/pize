import * as SpecialCharacter from './SpecialCharacter';
import * as Destination from './Destination';
 import { BelongsTo, Column, DataType, ForeignKey, HasMany, HasOne, Model, PrimaryKey, Table } from "sequelize-typescript";
import * as RouteStop from "./RouteStop";
import * as Line from './Line';


@Table({
  timestamps: false,
  tableName: 'routes'
})
export class Route extends Model {
  @ForeignKey(() => Line.Line)
  @Column(DataType.STRING)
  line_id!: string;
  @Column(DataType.STRING)
  route_id!: string;
  @Column(DataType.INTEGER)
  direction!: number;
  @Column(DataType.INTEGER)
  @BelongsTo(() => Destination.Destination, { foreignKey: 'destination_id', targetKey: 'id' , as: 'routeDestination' })
  destination!: Destination.Destination
  @HasMany(() => RouteStop.RouteStop) // 'route_id' is the foreign key in RouteStop model
  stops!: RouteStop.RouteStop[];
  @Column(DataType.INTEGER)
  @BelongsTo(() => SpecialCharacter.SpecialCharacter, { foreignKey: 'special_character', targetKey: 'id' , as: 'routeSpecialCharacter' })
  specialCharacter!: SpecialCharacter.SpecialCharacter
}
