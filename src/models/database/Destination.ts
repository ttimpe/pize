import { Column, DataType, HasMany, Model, PrimaryKey, Table } from "sequelize-typescript"
import { Route } from "./Route"


@Table({
    timestamps: false,
    tableName: 'destinations'
})
export class Destination extends Model {
    @PrimaryKey
    @Column(DataType.INTEGER)
    id!: number
    @Column(DataType.INTEGER)
    number!: number
    @Column(DataType.STRING)
    name!: string
    @Column(DataType.STRING)
    short_name!: string
    @HasMany(() => Route, { foreignKey: 'destination_id' })
    routes!: Route[]
    @Column(DataType.STRING)
    sign_text!: string
  }
  