
import { Sequelize } from 'sequelize-typescript';
import { Firmenkalender } from './src/models/database/VDV/Firmenkalender';
import { BasisVersion } from './src/models/database/VDV/BasisVersion';

// Initialize Sequelize
const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: './test.sqlite3',
    models: [Firmenkalender, BasisVersion] // Removed other models to avoid circular dependencies for this test
});

async function verifyCalendar() {
    try {
        await sequelize.authenticate();
        console.log('Database connection OK.');

        const msg = await Firmenkalender.findOne();
        if (msg) {
            console.log('Sample FIRMENKALENDER Row:', msg.toJSON());
        } else {
            console.log('No rows in FIRMENKALENDER');
        }

        const rows = await Firmenkalender.findAll({ limit: 5 });
        console.log('First 5 Calendar Entries:');
        rows.forEach(r => console.log(`${r.BETRIEBSTAG} -> Tagesart ${r.TAGESART_NR} (${r.BETRIEBSTAG_TEXT})`));

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await sequelize.close();
    }
}

verifyCalendar();
