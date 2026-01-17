import { Model, Table, Column, DataType, ForeignKey, PrimaryKey } from 'sequelize-typescript';
import { BasisVersion } from './BasisVersion';

@Table({
    tableName: 'REC_SEL',
    timestamps: false
})
export class RecSel extends Model {
    @PrimaryKey
    @ForeignKey(() => BasisVersion)
    @Column(DataType.INTEGER)
    BASIS_VERSION!: number;

    @PrimaryKey
    @Column({
        type: DataType.INTEGER,
        defaultValue: 1
    })
    BEREICH_NR!: number;

    @PrimaryKey
    @Column(DataType.INTEGER)
    ONR_TYP_NR!: number; // Origin Type

    @PrimaryKey
    @Column(DataType.INTEGER)
    ORT_NR!: number; // Origin ID

    @PrimaryKey
    @Column(DataType.INTEGER)
    SEL_ZIEL!: number; // Dest ID

    @PrimaryKey
    @Column(DataType.INTEGER)
    SEL_ZIEL_TYP!: number; // Dest Type

    @Column(DataType.INTEGER)
    SEL_FZT?: number; // Travel Time

    @Column(DataType.INTEGER)
    SEL_LAENGE?: number; // Distance (Custom/Common specific)

    @Column(DataType.INTEGER)
    FGR_NR?: number; // Fahrgast Group (Optional, def 0)
}
