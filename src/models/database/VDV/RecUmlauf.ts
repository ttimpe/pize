import { Model, Table, Column, DataType, ForeignKey, HasMany, PrimaryKey } from 'sequelize-typescript';
import { RecFrt } from './RecFrt';

@Table({
    tableName: 'REC_UMLAUF',
    timestamps: false
})
export class RecUmlauf extends Model {
    @PrimaryKey
    @Column(DataType.INTEGER)
    BASIS_VERSION!: number;

    @PrimaryKey
    @Column(DataType.INTEGER)
    TAGESART_NR!: number;

    @PrimaryKey
    @Column(DataType.INTEGER)
    UM_UID!: number;

    @Column(DataType.INTEGER)
    ANF_ORT?: number;

    @Column(DataType.INTEGER)
    ANF_ONR_TYP?: number;

    @Column(DataType.INTEGER)
    END_ORT?: number;

    @Column(DataType.INTEGER)
    END_ONR_TYP?: number;

    @Column(DataType.INTEGER)
    FZG_TYP_NR?: number;

    @HasMany(() => RecFrt, {
        foreignKey: 'UM_UID',
        sourceKey: 'UM_UID',
        constraints: false
    })
    trips?: RecFrt[];
}
