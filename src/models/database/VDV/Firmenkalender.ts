import { Table, Column, Model, DataType, PrimaryKey } from 'sequelize-typescript';

@Table({
    tableName: 'FIRMENKALENDER',
    timestamps: false
})
export class Firmenkalender extends Model {
    @PrimaryKey
    @Column(DataType.INTEGER)
    BASIS_VERSION!: number;

    @PrimaryKey
    @Column(DataType.INTEGER)
    BETRIEBSTAG!: number;

    @Column(DataType.STRING(255))
    BETRIEBSTAG_TEXT?: string;

    @Column(DataType.INTEGER)
    TAGESART_NR!: number;
}
