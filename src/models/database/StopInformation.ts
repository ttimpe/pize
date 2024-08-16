import { BelongsTo, Column, DataType, Model, Table, ForeignKey } from "sequelize-typescript";
import { Stop } from "./Stop";

@Table({ 
  timestamps: false,
  tableName: 'stop_information'
})
export class StopInformation extends Model {
  @Column(DataType.STRING)
  stop_id!: string;
  @Column(DataType.STRING)
  code!: string;
  @Column(DataType.INTEGER)
  number!: number;
  @Column(DataType.STRING)
  shortName!: string
  @BelongsTo(() => Stop, 'stop_id')
  stop!: Stop
}
