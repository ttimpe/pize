import { Table, Column, Model, DataType, PrimaryKey, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { BasisVersion } from './BasisVersion';

@Table({
    tableName: 'REC_ZNR',
    timestamps: false
})
export class RecZnr extends Model {
    @PrimaryKey
    @Column(DataType.INTEGER)
    ZNR_NR!: number;

    @Column(DataType.STRING(160))
    ZNR_TEXT!: string;

    @Column(DataType.STRING(10))
    ZNR_KUERZEL?: string;

    @Column(DataType.STRING(44))
    FAHRERKURZTEXT?: string;

    @Column(DataType.STRING(160))
    SEITENTEXT?: string;

    @Column(DataType.STRING(68))
    ZNR_CODE?: string;

    @Column({
        type: DataType.INTEGER,
        defaultValue: 1
    })
    BASIS_VERSION!: number;

    @BelongsTo(() => BasisVersion, { foreignKey: 'BASIS_VERSION', targetKey: 'BASIS_VERSION', constraints: false })
    basisVersion?: BasisVersion;

    get number(): number { return this.ZNR_NR; }
    get name(): string { return this.ZNR_TEXT; }
}
