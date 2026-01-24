import { BelongsTo, Column, DataType, ForeignKey, Model, PrimaryKey, Table } from "sequelize-typescript";
import { BasisVersion } from "./BasisVersion";
import { RecOrt } from "./RecOrt";

@Table({
    tableName: 'REC_OM',
    timestamps: false
})
export class RecOm extends Model {
    @PrimaryKey
    @ForeignKey(() => BasisVersion)
    @Column({
        type: DataType.INTEGER,
        defaultValue: 1
    })
    BASIS_VERSION!: number;

    @PrimaryKey
    @Column(DataType.INTEGER)
    ONR_TYP_NR!: number;

    @PrimaryKey
    @ForeignKey(() => RecOrt)
    @Column(DataType.INTEGER)
    ORT_NR!: number;

    @Column(DataType.STRING(6))
    ORM_KUERZEL?: string;

    @Column(DataType.INTEGER)
    ORMACODE?: number;

    @Column(DataType.STRING(40))
    ORM_TEXT?: string;

    @BelongsTo(() => BasisVersion, { foreignKey: 'BASIS_VERSION', targetKey: 'BASIS_VERSION', constraints: false })
    basisVersion?: BasisVersion;

    @BelongsTo(() => RecOrt, { foreignKey: 'ORT_NR', targetKey: 'ORT_NR', constraints: false })
    ort?: RecOrt;
}
