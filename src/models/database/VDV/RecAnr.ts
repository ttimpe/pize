import { BelongsTo, Column, DataType, ForeignKey, Model, PrimaryKey, Table } from "sequelize-typescript";
import { BasisVersion } from "./BasisVersion";

@Table({
    tableName: 'REC_ANR',
    timestamps: false
})
export class RecAnr extends Model {
    @PrimaryKey
    @Column(DataType.INTEGER)
    ANR_NR!: number;

    @Column(DataType.STRING(200))
    ANR_TEXT!: string;

    @Column(DataType.STRING(255))
    ANR_DATEI?: string;

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
