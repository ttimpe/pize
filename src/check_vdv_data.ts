
import { RecLid } from './models/database/VDV/RecLid';
import { RecFrt } from './models/database/VDV/RecFrt';
import { LidVerlauf } from './models/database/VDV/LidVerlauf';
import { RecOrt } from './models/database/VDV/RecOrt';
import { RecHp } from './models/database/VDV/RecHp';
import { BasisVersion } from './models/database/VDV/BasisVersion';
import { Sequelize } from 'sequelize-typescript';

const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: '../ifesx-backend/test.sqlite3',
    models: [RecLid, RecFrt, LidVerlauf, RecOrt, RecHp, BasisVersion]
});

async function checkData() {
    await sequelize.sync();

    console.log("Checking Line 1...");
    // Try finding Line 1 (as "1" or "001")
    let line = await RecLid.findOne({ where: { STR_LID: '1' } });
    if (!line) line = await RecLid.findOne({ where: { STR_LID: '001' } });

    if (line) {
        console.log(`Found Line: ${line.STR_LID} (ID: ${line.LID_NR})`);

        console.log("Checking Trips for Line...");
        const trips = await RecFrt.findAll({
            where: { LI_NR: line.LID_NR, LI_KU_NR: 1 } // Kurs 1
        });
        console.log(`Found ${trips.length} trips for Kurs 1.`);

        if (trips.length > 0) {
            const trip = trips[0]; // Just check first one
            console.log(`Checking Stop Sequence for Trip(Line Variant: ${trip.STR_LI_VAR})...`);

            const stops = await LidVerlauf.findAll({
                where: { LI_NR: line.LID_NR, STR_LI_VAR: trip.STR_LI_VAR },
                include: [{
                    model: RecHp,
                    as: 'stop',
                    include: [{
                        model: RecOrt,
                        as: 'recOrt'
                    }]
                }]
            });
            console.log(`Found ${stops.length} stops in sequence.`);
            if (stops.length > 0) {
                // Use correct alias 'stop' and 'recOrt'
                const firstOne = stops[0];
                const stopNode = firstOne.stop;
                const ortNode = stopNode?.recOrt;

                console.log(`First Stop Obj: `, stopNode ? "Found" : "Missing");
                console.log(`Ort Obj: `, ortNode ? "Found" : "Missing");

                if (ortNode) {
                    console.log(`First Stop: ${ortNode.ORT_NAME} (Nr: ${ortNode.ORT_NR})`);
                    console.log(`Last 3 digits of ORT_NR: ${ortNode.ORT_NR % 1000} `);
                }
            }
        }
    } else {
        console.log("Line 1 not found.");
    }
}

checkData();
