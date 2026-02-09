
import { Sequelize } from 'sequelize-typescript';

const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: './test.sqlite3'
});

async function listTables() {
    try {
        await sequelize.authenticate();
        console.log('Connection has been established successfully.');
        const [results, metadata] = await sequelize.query("SELECT name FROM sqlite_master WHERE type='table';");
        console.log("Tables in database:", results);
    } catch (error) {
        console.error('Unable to connect to the database:', error);
    }
}

listTables();
