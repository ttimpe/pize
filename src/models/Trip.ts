import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../sequelize';

interface TripAttributes {
  trip_id: string;
  route_id: string;
  service_id: string;
  trip_headsign: string | null;
  direction_id: number | null;
  block_id: string | null;
  shape_id: string | null;
}

interface TripCreationAttributes extends Optional<TripAttributes, 'trip_id'> {}

class Trip extends Model<TripAttributes, TripCreationAttributes> implements TripAttributes {
  trip_id!: string;
  route_id!: string;
  service_id!: string;
  trip_headsign!: string | null;
  direction_id!: number | null;
  block_id!: string | null;
  shape_id!: string | null;
  
  // Additional methods or properties can be added here
}

Trip.init(
  {
    trip_id: {
      type: DataTypes.STRING,
      primaryKey: true,
      allowNull: false,
    },
    route_id: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    service_id: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    trip_headsign: DataTypes.STRING,
    direction_id: DataTypes.INTEGER,
    block_id: DataTypes.STRING,
    shape_id: DataTypes.STRING,
  },
  {
    sequelize,
    modelName: 'trips',
    timestamps: false,
  }
);

export { Trip };
