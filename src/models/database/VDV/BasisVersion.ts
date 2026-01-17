import { Column, DataType, HasMany, Model, PrimaryKey, Table } from "sequelize-typescript"


@Table({
    timestamps: false,
    tableName: 'MENGE_BASIS_VERSIONEN'
})
export class BasisVersion extends Model {
    // Benutztv für REST-API IDs
    @PrimaryKey
    @Column(DataType.UUID)
    id!: string
    @Column(DataType.INTEGER)
    BASIS_VERSION!: number
    @Column(DataType.STRING)
    BASIS_VERSION_TEXT!: string
}
