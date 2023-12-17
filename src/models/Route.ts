import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../sequelize';
import { Agency } from './Agency';

interface RouteAttributes {
  route_id: string;
  agency_id: string | null;
  route_short_name: string;
  route_long_name: string;
  route_type: number;
}

interface RouteCreationAttributes extends Optional<RouteAttributes, 'route_id'> {}


class Route extends Model<RouteAttributes, RouteCreationAttributes> implements RouteAttributes {
  route_id!: string;
  agency_id!: string | null;
  route_short_name!: string;
  route_long_name!: string;
  route_type!: number;
  
  // Additional methods or properties can be added here
}

Route.init(
  {
    route_id: {
      type: DataTypes.STRING,
      primaryKey: true,
      allowNull: false,
    },
    agency_id: DataTypes.STRING,
    route_short_name: DataTypes.STRING,
    route_long_name: DataTypes.STRING,
    route_type: DataTypes.INTEGER
  },
  {
    sequelize,
    modelName: 'routes',
    timestamps: false,
  }
);

export { Route };
