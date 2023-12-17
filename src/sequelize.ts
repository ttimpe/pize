import { Sequelize } from 'sequelize';

const sequelize = new Sequelize({
    dialect:'sqlite',
    storage: '/Users/tobias/Developer/gtfs/gtfs.sqlitedb' // Change this connection string as needed
})
export { sequelize };
