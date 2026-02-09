
import { Sequelize } from 'sequelize-typescript';

const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: './test.sqlite3'
});

async function sampleData() {
    try {
        await sequelize.authenticate();
        const [calendarRows, _] = await sequelize.query("SELECT * FROM FIRMENKALENDER LIMIT 5;");
        console.log("FIRMENKALENDER Sample:", calendarRows);

        const [tagesartRows, __] = await sequelize.query("SELECT * FROM MENGE_TAGESART LIMIT 5;");
        console.log("MENGE_TAGESART Sample:", tagesartRows);
    } catch (error) {
        console.error('Error:', error);
    }
}

sampleData();
