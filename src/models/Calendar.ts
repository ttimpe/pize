import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../sequelize';

interface CalendarAttributes {
  service_id: string;
  monday: number;
  tuesday: number;
  wednesday: number;
  thursday: number;
  friday: number;
  saturday: number;
  sunday: number;
  start_date: string;
  end_date: string;
}

interface CalendarCreationAttributes extends Optional<CalendarAttributes, 'service_id'> {}

class Calendar extends Model<CalendarAttributes, CalendarCreationAttributes> implements CalendarAttributes {
  service_id!: string;
  monday!: number;
  tuesday!: number;
  wednesday!: number;
  thursday!: number;
  friday!: number;
  saturday!: number;
  sunday!: number;
  start_date!: string;
  end_date!: string;
  
  // Additional methods or properties can be added here
}

Calendar.init(
  {
    service_id: {
      type: DataTypes.STRING,
      primaryKey: true,
      allowNull: false,
    },
    monday: DataTypes.INTEGER,
    tuesday: DataTypes.INTEGER,
    wednesday: DataTypes.INTEGER,
    thursday: DataTypes.INTEGER,
    friday: DataTypes.INTEGER,
    saturday: DataTypes.INTEGER,
    sunday: DataTypes.INTEGER,
    start_date: DataTypes.STRING,
    end_date: DataTypes.STRING,
  },
  {
    sequelize,
    modelName: 'calendar',
    timestamps: false,
  }
);

export { Calendar };
