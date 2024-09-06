import { BelongsTo, Column, DataType, ForeignKey, HasMany, Model, PrimaryKey, Table } from "sequelize-typescript";
import { Stop } from "./Stop";


@Table({ 
  timestamps: false,
  tableName: 'stop_distances'
})
export class StopDistance extends Model {
    @PrimaryKey
    @ForeignKey(() => Stop)
    @Column({
      type: DataType.STRING,
      field: 'origin_stop_id'
    })
    origin_stop_id!: string;
  
    @PrimaryKey
    @ForeignKey(() => Stop)
    @Column({
      type: DataType.STRING,
      field: 'destination_stop_id'
    })
    destination_stop_id!: string;
  
    @Column(DataType.DOUBLE)
    distance!: number;
  
    @BelongsTo(() => Stop, {
      foreignKey: 'origin_stop_id',
      as: 'originStop'
    })
    originStop!: Stop;
  
    @BelongsTo(() => Stop, {
      foreignKey: 'destination_stop_id',
      as: 'destinationStop'
    })
    destinationStop!: Stop;
    @Column(DataType.INTEGER)
    time!: number
}
