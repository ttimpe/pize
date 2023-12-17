import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../sequelize';

interface StopTimeAttributes {
  trip_id: string;
  arrival_time: string;
  departure_time: string;
  stop_id: string;
  stop_sequence: number;
  stop_headsign: string | null;
  pickup_type: number | null;
  drop_off_type: number | null;
  shape_dist_traveled: number | null;
}

interface StopTimeCreationAttributes extends Optional<StopTimeAttributes, 'trip_id' | 'stop_sequence'> {}

class StopTime extends Model<StopTimeAttributes, StopTimeCreationAttributes> implements StopTimeAttributes {
  trip_id!: string;
  arrival_time!: string;
  departure_time!: string;
  stop_id!: string;
  stop_sequence!: number;
  stop_headsign!: string | null;
  pickup_type!: number | null;
  drop_off_type!: number | null;
  shape_dist_traveled!: number | null;
  
  // Additional methods or properties can be added here
}

StopTime.init(
  {
    trip_id: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    arrival_time: DataTypes.STRING,
    departure_time: DataTypes.STRING,
    stop_id: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    stop_sequence: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    stop_headsign: DataTypes.STRING,
    pickup_type: DataTypes.INTEGER,
    drop_off_type: DataTypes.INTEGER,
    shape_dist_traveled: DataTypes.FLOAT,
  },
  {
    sequelize,
    modelName: 'stop_times',
    timestamps: false,
  }
);

export { StopTime };