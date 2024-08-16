import { BelongsTo, Column, DataType, HasMany, Model, PrimaryKey, Table } from "sequelize-typescript"
import { StopInformation } from "./StopInformation"
import { Stop } from "./Stop"
import { RouteStop } from "./RouteStop"


@Table({
    timestamps: false,
    tableName: 'announcements'
})
export class Announcement extends Model {
    @PrimaryKey
    @Column(DataType.INTEGER)
    id!: number
    @Column(DataType.INTEGER)
    number!: number
    @Column(DataType.STRING)
    name!: string
    @Column(DataType.STRING)
    fullText!: string
    @Column(DataType.STRING)
    fileName?: string
    @HasMany(() => RouteStop)
    stops: RouteStop[]
  }