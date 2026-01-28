
import { RecLid } from './models/database/VDV/RecLid';
import { BasisVersion } from './models/database/VDV/BasisVersion';
import { Sequelize } from 'sequelize-typescript';

const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: './test.sqlite3',
    models: [RecLid, BasisVersion], // Only load RecLid for this test
    logging: false
});

async function checkLid() {
    try {
        await sequelize.authenticate();
        console.log('Connection has been established successfully.');
        await sequelize.sync();

        const lines = await RecLid.findAll({
            where: {
                LI_KUERZEL: ['1', '001']
            }
        });
        console.log(`Found ${lines.length} matching lines.`);
        lines.forEach(l => {
            console.log(`LID_NR: ${l.LID_NR}, STR_LID: '${l.STR_LID}', LI_KUERZEL: '${l.LI_KUERZEL}', LIDNAME: '${l.LIDNAME}'`);
        });

    } catch (error) {
        console.error('Unable to connect to the database:', error);
    }
}

checkLid();
