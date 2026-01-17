import { BelongsTo, Column, DataType, ForeignKey, Model, PrimaryKey, Table } from "sequelize-typescript";
import { BasisVersion } from "./BasisVersion";
import { RecOrt } from "./RecOrt";
// import { Stop } from "../Stop"; // Removed dependency

@Table({
    timestamps: false,
    tableName: 'REC_HP'
})
export class RecHp extends Model {
    @PrimaryKey
    @ForeignKey(() => RecOrt)
    @Column(DataType.INTEGER)
    ORT_NR!: number;

    @PrimaryKey
    @Column({
        type: DataType.INTEGER,
        defaultValue: 1
    })
    ONR_TYP_NR!: number;

    @BelongsTo(() => RecOrt, {
        foreignKey: 'ORT_NR',
        targetKey: 'ORT_NR',
        as: 'recOrt'
    })
    recOrt!: RecOrt;

    @PrimaryKey
    @Column(DataType.INTEGER)
    HALTEPUNKT_NR!: number;

    @Column(DataType.STRING(40))
    ZUSATZ_INFO?: string;

    @Column(DataType.STRING(40))
    DHID!: string;

    @PrimaryKey
    @ForeignKey(() => BasisVersion)
    @Column({
        type: DataType.INTEGER,
        defaultValue: 1
    })
    BASIS_VERSION!: number;

    @BelongsTo(() => BasisVersion, { foreignKey: 'BASIS_VERSION', targetKey: 'BASIS_VERSION', constraints: false })
    basisVersion?: BasisVersion;

    // @BelongsTo(() => Stop, { foreignKey: 'DHID', targetKey: 'id' })
    // stop?: Stop;
}
