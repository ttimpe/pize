const { Sequelize, DataTypes } = require('sequelize');

const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: '../ifesx-backend/test.sqlite3',
    logging: false
});

const LidVerlauf = sequelize.define('LidVerlauf', {
    BASIS_VERSION: { type: DataTypes.INTEGER, primaryKey: true },
    LI_NR: { type: DataTypes.INTEGER, primaryKey: true },
    STR_LI_VAR: { type: DataTypes.STRING(6), primaryKey: true },
    LI_LFD_NR: { type: DataTypes.INTEGER, primaryKey: true },
    ORT_NR: DataTypes.INTEGER
}, { tableName: 'LID_VERLAUF', timestamps: false });

async function check() {
    try {
        const stops = await LidVerlauf.findAll({
            where: { LI_NR: 1, STR_LI_VAR: '001' }
        });
        console.log(`Found ${stops.length} stops for LI_NR=1, STR_LI_VAR='001'.`);
        stops.forEach(s => console.log(`- Seq ${s.LI_LFD_NR}: Ort ${s.ORT_NR}`));

        if (stops.length === 0) {
            console.log("Checking for ANY stops for LI_NR=1...");
            const anyStops = await LidVerlauf.findAll({ where: { LI_NR: 1 }, limit: 5 });
            anyStops.forEach(s => console.log(`- Found stop for var '${s.STR_LI_VAR}': Seq ${s.LI_LFD_NR}`));
        }

    } catch (e) {
        console.error(e);
    } finally {
        await sequelize.close();
    }
}

check();
