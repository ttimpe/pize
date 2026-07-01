import { Table, Column, Model, DataType, PrimaryKey, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { BasisVersion } from './BasisVersion';
import { RecZnr } from './RecZnr';

@Table({
    tableName: 'REC_LID',
    timestamps: false
})
export class RecLid extends Model {
    @PrimaryKey
    @Column(DataType.INTEGER)
    LI_NR!: number; // Was LID_NR

    @Column(DataType.STRING(6))
    LI_KUERZEL!: string; // Was STR_LID

    @PrimaryKey
    @Column(DataType.STRING(6))
    STR_LI_VAR!: string; // P3

    @Column(DataType.INTEGER)
    ROUTEN_NR?: number; // Optional

    // VDV 452: von ifesx geliefert, bisher ignoriert
    @Column(DataType.INTEGER)
    LI_RI_NR?: number; // Richtung: 1 = Hin, 2 = Rück

    @Column(DataType.INTEGER)
    BEREICH_NR?: number; // Bereich der Linie

    @Column(DataType.INTEGER)
    ROUTEN_ART?: number;

    @Column(DataType.INTEGER)
    LINIEN_CODE?: number;

    @Column(DataType.STRING(100))
    LIDNAME!: string; // Was LIN_NAME

    @Column(DataType.STRING(128))
    LinienID?: string; // T-LID

    @PrimaryKey
    @Column({
        type: DataType.INTEGER,
        defaultValue: 1
    })
    BASIS_VERSION!: number; // VDV 452: Teil des PK (BASIS_VERSION, LI_NR, STR_LI_VAR)

    // Getters for compatibility map new fields to old property names if I want to avoid refactoring controller everywhere?
    // No, better refactor controller.
    get STR_LID(): string { return this.LI_KUERZEL; }
    get LID_NR(): number { return this.LI_NR; }
    get LIN_NAME(): string { return this.LIDNAME; }

    @BelongsTo(() => BasisVersion, { foreignKey: 'BASIS_VERSION', targetKey: 'BASIS_VERSION', constraints: false })
    basisVersion?: BasisVersion;
}
