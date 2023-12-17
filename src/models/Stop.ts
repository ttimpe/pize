import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../sequelize';

interface StopAttributes {
  stop_id: string;
  stop_code: string | null;
  stop_name: string;
  stop_desc: string | null;
  stop_lat: number | null;
  stop_lon: number | null;
  zone_id: string | null;
  stop_url: string | null;
  location_type: number | null;
  parent_station: string | null;
}

interface StopCreationAttributes extends Optional<StopAttributes, 'stop_id'> {}

class Stop extends Model<StopAttributes, StopCreationAttributes> implements StopAttributes {
  stop_id!: string;
  stop_code!: string | null;
  stop_name!: string;
  stop_desc!: string | null;
  stop_lat!: number | null;
  stop_lon!: number | null;
  zone_id!: string | null;
  stop_url!: string | null;
  location_type!: number | null;
  parent_station!: string | null;
  
  // Additional methods or properties can be added here
}

Stop.init(
  {
    stop_id: {
      type: DataTypes.STRING,
      primaryKey: true,
      allowNull: false,
    },
    stop_code: DataTypes.STRING,
    stop_name: DataTypes.STRING,
    stop_desc: DataTypes.STRING,
    stop_lat: DataTypes.FLOAT,
    stop_lon: DataTypes.FLOAT,
    zone_id: DataTypes.STRING,
    stop_url: DataTypes.STRING,
    location_type: DataTypes.INTEGER,
    parent_station: DataTypes.STRING,
  },
  {
    sequelize,
    modelName: 'stops',
    timestamps: false,
  }
);

export { Stop };
