import { Model, Table, Column, DataType, ForeignKey, PrimaryKey } from 'sequelize-typescript';
import { BasisVersion } from './BasisVersion';

@Table({
    tableName: 'SEL_FZT_FELD',
    timestamps: false
})
export class SelFztFeld extends Model {
    @PrimaryKey
    @ForeignKey(() => BasisVersion)
    @Column({
        type: DataType.INTEGER,
        defaultValue: 1
    })
    BASIS_VERSION!: number;

    @PrimaryKey
    @Column({
        type: DataType.INTEGER,
        defaultValue: 1
    })
    BEREICH_NR!: number;

    @PrimaryKey
    @Column({
        type: DataType.INTEGER,
        defaultValue: 1
    })
    FGR_NR!: number;

    @PrimaryKey
    @Column(DataType.INTEGER)
    ONR_TYP_NR!: number;

    @PrimaryKey
    @Column(DataType.INTEGER)
    ORT_NR!: number;

    @PrimaryKey
    @Column(DataType.INTEGER)
    SEL_ZIEL!: number;

    @PrimaryKey
    @Column(DataType.INTEGER)
    SEL_ZIEL_TYP!: number;

    // Travel time in seconds between ORT_NR and SEL_ZIEL
    @Column(DataType.INTEGER)
    SEL_FZT?: number;
}
