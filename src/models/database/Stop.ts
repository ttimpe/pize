import { Table, Column, Model, HasMany, DataType, PrimaryKey, HasOne, BelongsTo } from 'sequelize-typescript';
import { StopInformation } from './StopInformation';



@Table({ 
  timestamps: false,
  tableName: 'stops'
})
export class Stop extends Model {
      @PrimaryKey
      @Column(DataType.STRING)
      id!: string;
      @Column(DataType.STRING)
      parent_id!: string;
      @Column(DataType.STRING)
      name!: string;
      @Column(DataType.FLOAT)
      latitude!: number;
      @Column(DataType.FLOAT)
      longitude!: number;
      @BelongsTo(() => Stop,  { foreignKey: 'parent_id', targetKey: 'id' })
      parent?: Stop
      @HasOne(() => StopInformation, 'stop_id')
      information?: StopInformation

      get number(): number {
        if (this.information != null && this.information.number) {
          return this.information.number
        } else {
            const part = this.id.split(':')[2]
            return parseInt(part.slice(-3))
        }
      }
      

}
