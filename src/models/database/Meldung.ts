import { BelongsTo, Column, DataType, ForeignKey, HasMany, HasOne, Model, PrimaryKey, Table } from "sequelize-typescript";

@Table({
  timestamps: false,
  tableName: 'meldungen'
})
export class Meldung extends Model {
    @Column(DataType.INTEGER)
    number!: number
    @Column(DataType.STRING)
    stringValue!: string
}
