import { Table, Column, Model, DataType, PrimaryKey } from 'sequelize-typescript';

/**
 * VDV 452 – BASIS_VER_GUELTIGKEIT
 *
 * Ordnet jedem Betriebstag (`VER_GUELTIGKEIT`, Format YYYYMMDD) die an diesem Tag
 * gültige `BASIS_VERSION` zu. Damit lässt sich anhand des (ggf. per Zeit-Offset
 * simulierten) Datums die aktive Datenversion bestimmen.
 *
 * PK laut XSD (VDV452_v1.5.xsd): VER_GUELTIGKEIT.
 */
@Table({
    tableName: 'BASIS_VER_GUELTIGKEIT',
    timestamps: false
})
export class BasisVerGueltigkeit extends Model {
    @PrimaryKey
    @Column(DataType.INTEGER)
    VER_GUELTIGKEIT!: number; // Betriebstag YYYYMMDD

    @Column(DataType.INTEGER)
    BASIS_VERSION!: number;
}
