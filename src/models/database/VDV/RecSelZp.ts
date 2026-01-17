import { Model, Table, Column, DataType, ForeignKey, PrimaryKey } from 'sequelize-typescript';
import { BasisVersion } from './BasisVersion';
import { RecSel } from './RecSel';

@Table({
    tableName: 'REC_SEL_ZP',
    timestamps: false
})
export class RecSelZp extends Model {
    @PrimaryKey
    @ForeignKey(() => BasisVersion)
    @Column(DataType.INTEGER)
    BASIS_VERSION!: number;

    // Keys matching REC_SEL (Primary Key part of REC_SEL must be present here as FK)
    @PrimaryKey
    @Column({
        type: DataType.INTEGER,
        defaultValue: 1
    })
    BEREICH_NR!: number;

    @PrimaryKey
    @ForeignKey(() => RecSel)
    @Column(DataType.INTEGER)
    ONR_TYP_NR!: number;

    @PrimaryKey
    @ForeignKey(() => RecSel)
    @Column(DataType.INTEGER)
    ORT_NR!: number;

    @PrimaryKey
    @ForeignKey(() => RecSel)
    @Column(DataType.INTEGER)
    SEL_ZIEL!: number;

    @PrimaryKey
    @ForeignKey(() => RecSel)
    @Column(DataType.INTEGER)
    SEL_ZIEL_TYP!: number;

    @PrimaryKey
    @Column(DataType.INTEGER)
    LFD_NR!: number; // Sequence number of intermediate point

    @Column(DataType.DECIMAL(10, 0))
    ZP_POS_LAENGE?: number;

    @Column(DataType.DECIMAL(10, 0))
    ZP_POS_BREITE?: number;

    @Column(DataType.INTEGER)
    ZP_DISTANZ?: number; // Distance from start or previous point? Often cumulative or delta.

}
