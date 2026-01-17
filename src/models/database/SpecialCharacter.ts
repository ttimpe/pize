import { BelongsTo, Column, DataType, ForeignKey, HasMany, HasOne, Model, PrimaryKey, Table } from "sequelize-typescript";
// import { Route } from "./Route";


@Table({
  timestamps: false,
  tableName: 'special_characters'
})
export class SpecialCharacter extends Model {
  @Column(DataType.INTEGER)
  number!: number
  @Column(DataType.STRING)
  stringValue!: string
  // @HasMany(() => Route, { foreignKey: 'special_character_id' })
  // routes!: Route[]
}
