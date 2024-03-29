import { Column, DataType, Model, PrimaryKey, Table } from "sequelize-typescript";



@Table({ 
  timestamps: false,
  tableName: 'lines'
})
export class Line extends Model {
  @PrimaryKey
  @Column(DataType.STRING)
  id!: string
  @Column(DataType.STRING)
  number!: string
  @Column(DataType.INTEGER)
  public type!: number
  @Column(DataType.STRING)
  public text_color!: string
  @Column(DataType.STRING)
  public color!: string
}



