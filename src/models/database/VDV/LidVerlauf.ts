import { Table, Column, Model, DataType, PrimaryKey, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { RecLid } from './RecLid';
import { RecHp } from './RecHp';
import { RecZnr } from './RecZnr';
import { RecAnr } from './RecAnr';
import { BasisVersion } from './BasisVersion';
import { RecOrt } from './RecOrt';

@Table({
    tableName: 'LID_VERLAUF',
    timestamps: false
})
export class LidVerlauf extends Model {
    // P1
    @PrimaryKey
    @ForeignKey(() => BasisVersion)
    @Column({
        type: DataType.INTEGER,
        defaultValue: 1
    })
    BASIS_VERSION!: number;

    // P4
    @PrimaryKey
    @Column(DataType.INTEGER)
    LI_LFD_NR!: number;

    // P2
    @PrimaryKey
    @ForeignKey(() => RecLid)
    @Column(DataType.INTEGER)
    LI_NR!: number;

    // P3
    @PrimaryKey
    @Column(DataType.STRING(6))
    STR_LI_VAR!: string;

    @ForeignKey(() => RecHp)
    @Column(DataType.INTEGER)
    ONR_TYP_NR!: number;

    @ForeignKey(() => RecOrt)
    @Column(DataType.INTEGER)
    ORT_NR!: number;

    // HALTEPUNKT_NR removed from model

    @Column(DataType.INTEGER)
    ZNR_NR?: number;

    @Column(DataType.INTEGER)
    ANR_NR?: number;

    @Column(DataType.INTEGER)
    EINFANGBEREICH?: number;

    @Column(DataType.BOOLEAN)
    LI_KNOTEN?: boolean;

    @Column(DataType.BOOLEAN)
    PRODUKTIV?: boolean;

    @Column(DataType.BOOLEAN)
    EINSTEIGEVERBOT?: boolean;

    @Column(DataType.BOOLEAN)
    AUSSTEIGEVERBOT?: boolean;

    @Column(DataType.BOOLEAN)
    INNERORTSVERBOT?: boolean;

    @Column(DataType.BOOLEAN)
    BEDARFSHALT?: boolean;

    @BelongsTo(() => BasisVersion, { foreignKey: 'BASIS_VERSION', targetKey: 'BASIS_VERSION', constraints: false })
    basisVersion?: BasisVersion;

    @BelongsTo(() => RecLid, { foreignKey: 'LI_NR', targetKey: 'LI_NR' })
    line?: RecLid;

    @BelongsTo(() => RecOrt, { foreignKey: 'ORT_NR', targetKey: 'ORT_NR' })
    recOrt?: RecOrt;

    // Stop association via HALTEPUNKT_NR removed per VDV optimization
    // Use JOIN with REC_HP on ORT_NR + ONR_TYP_NR if specific stop point is needed,
    // though in VDV 452 LID_VERLAUF mainly relies on ORT_NR. 
    // We keep the property for runtime mapping in controller.
    stop?: RecHp;

    @BelongsTo(() => RecZnr, { foreignKey: 'ZNR_NR', targetKey: 'ZNR_NR' })
    destination?: RecZnr;

    @BelongsTo(() => RecAnr, { foreignKey: 'ANR_NR', targetKey: 'ANR_NR' })
    announcement?: RecAnr;

    // Computed at runtime: planned arrival time in seconds since midnight
    plannedArrival?: number;
}
