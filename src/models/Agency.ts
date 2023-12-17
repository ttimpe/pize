import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../sequelize';
import { Route } from './Route';

interface AgencyAttributes {
  agency_id: string;
  agency_name: string;
  // ... other agency properties
}

interface AgencyCreationAttributes extends Optional<AgencyAttributes, 'agency_id'> {}

class Agency extends Model<AgencyAttributes, AgencyCreationAttributes> implements AgencyAttributes {
  agency_id!: string;
  agency_name!: string;
  // ... other agency properties
}

Agency.init(
  {
    agency_id: {
      type: DataTypes.STRING,
      primaryKey: true,
      allowNull: false,
    },
    agency_name: DataTypes.STRING,
    // ... other agency properties
  },
  {
    sequelize,
    modelName: 'agency',
    tableName: 'agency',
    timestamps: false,
  }
);

// Define association with Route model
Agency.hasMany(Route, {
  foreignKey: 'agency_id',
  as: 'routes',
});
// Define association with Agency model
Route.belongsTo(Agency, {
    foreignKey: 'agency_id', // The foreign key in the Route model that references the Agency model
    as: 'agency', // Alias for the association
  });
export { Agency };