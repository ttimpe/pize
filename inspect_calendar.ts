
import { Sequelize } from 'sequelize-typescript';

const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: './test.sqlite3'
});

async function inspectTable() {
    try {
        await sequelize.authenticate();
        const [results, metadata] = await sequelize.query("PRAGMA table_info(FIRMENKALENDER);");
        console.log("FIRMENKALENDER columns:", results);
    } catch (error) {
        console.error('Error:', error);
    }
}

inspectTable();
