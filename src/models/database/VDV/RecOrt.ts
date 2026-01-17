import { BelongsTo, Column, DataType, ForeignKey, HasMany, Model, PrimaryKey, Table } from "sequelize-typescript";
import { BasisVersion } from "./BasisVersion";
import { RecHp } from "./RecHp";

@Table({
    tableName: 'REC_ORT',
    timestamps: false
})
export class RecOrt extends Model {
    @PrimaryKey
    @Column(DataType.INTEGER)
    ORT_NR!: number;

    @PrimaryKey
    @Column({
        type: DataType.INTEGER,
        defaultValue: 1
    })
    ONR_TYP_NR!: number;

    @Column(DataType.STRING(40))
    ORT_NAME!: string;

    @Column(DataType.INTEGER)
    ORT_REF_ORT?: number;

    @Column(DataType.INTEGER)
    ORT_REF_ORT_TYP?: number;

    @Column(DataType.INTEGER)
    ORT_REF_ORT_LangNr?: number;

    @Column(DataType.STRING(8))
    ORT_REF_ORT_KUERZEL?: string;

    @Column(DataType.STRING(40))
    ORT_REF_ORT_NAME?: string;

    @Column(DataType.INTEGER)
    ZONE_WABE_NR?: number;

    @Column(DataType.DECIMAL(10, 0))
    ORT_POS_LAENGE?: number;

    @Column(DataType.DECIMAL(10, 0))
    ORT_POS_BREITE?: number;

    @Column(DataType.DECIMAL(10, 0))
    ORT_POS_HOEHE?: number;

    @Column(DataType.INTEGER)
    ORT_RICHTUNG?: number;

    @Column(DataType.INTEGER)
    HAST_NR_LOKAL?: number;

    @Column(DataType.INTEGER)
    HST_NR_NATIONAL?: number;

    @Column(DataType.STRING(30))
    HST_NR_INTERNATIONAL?: string;

    @PrimaryKey
    @ForeignKey(() => BasisVersion)
    @Column({
        type: DataType.INTEGER,
        defaultValue: 1
    })
    BASIS_VERSION!: number;

    @BelongsTo(() => BasisVersion, { foreignKey: 'BASIS_VERSION', targetKey: 'BASIS_VERSION', constraints: false })
    basisVersion?: BasisVersion;

    @HasMany(() => RecHp)
    recHps?: RecHp[];

    // Self-reference for Parent Place
    @BelongsTo(() => RecOrt, { foreignKey: 'ORT_REF_ORT', targetKey: 'ORT_NR', as: 'parentOrt', constraints: false })
    parentOrt?: RecOrt;

    // Self-reference for Sub-Places
    @HasMany(() => RecOrt, { foreignKey: 'ORT_REF_ORT', sourceKey: 'ORT_NR', as: 'subOrts', constraints: false })
    subOrts?: RecOrt[];
}
