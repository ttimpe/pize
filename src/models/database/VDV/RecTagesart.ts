import { BelongsTo, Column, DataType, ForeignKey, Model, PrimaryKey, Table } from "sequelize-typescript";
import { BasisVersion } from "./BasisVersion";

@Table({
    timestamps: false,
    tableName: 'REC_TAGESART'
})
export class RecTagesart extends Model {
    @PrimaryKey
    @Column(DataType.INTEGER)
    TAGESART_NR!: number;

    @Column(DataType.STRING(40))
    TAGESART_TEXT?: string;

    @PrimaryKey
    @ForeignKey(() => BasisVersion)
    @Column({
        type: DataType.INTEGER,
        defaultValue: 1
    })
    BASIS_VERSION!: number;

    @BelongsTo(() => BasisVersion, { foreignKey: 'BASIS_VERSION', targetKey: 'BASIS_VERSION', constraints: false })
    basisVersion?: BasisVersion;
}
