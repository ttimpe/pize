const { Sequelize, DataTypes, Model } = require('sequelize');

const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: '../ifesx-backend/test.sqlite3',
    logging: false
});

class RecLid extends Model { }
RecLid.init({
    LI_NR: { type: DataTypes.INTEGER, primaryKey: true },
    LI_KUERZEL: DataTypes.STRING,
    STR_LI_VAR: { type: DataTypes.STRING(6), primaryKey: true },
    ROUTEN_NR: DataTypes.INTEGER,
    LIDNAME: DataTypes.STRING,
    LinienID: DataTypes.STRING,
    BASIS_VERSION: DataTypes.INTEGER
}, { sequelize, tableName: 'REC_LID', timestamps: false });

class LidVerlauf extends Model { }
LidVerlauf.init({
    BASIS_VERSION: { type: DataTypes.INTEGER, primaryKey: true },
    LI_LFD_NR: { type: DataTypes.INTEGER, primaryKey: true },
    LI_NR: { type: DataTypes.INTEGER, primaryKey: true },
    STR_LI_VAR: { type: DataTypes.STRING(6), primaryKey: true },
    ORT_NR: DataTypes.INTEGER
}, { sequelize, tableName: 'LID_VERLAUF', timestamps: false });

async function run() {
    try {
        console.log("1. Setting Line '1'...");
        // Emulate setLine("1")
        let line = await RecLid.findOne({ where: { LI_KUERZEL: '1' } });
        if (!line) {
            console.log("Line '1' not found directly. Trying padded '001'.");
            line = await RecLid.findOne({ where: { LI_KUERZEL: '001' } });
        }

        if (!line) {
            console.error("FAILED to find Line 1.");
            return;
        }
        console.log(`VDV Line found: ${line.LI_KUERZEL} (LI_NR: ${line.LI_NR}, STR_LI_VAR: ${line.STR_LI_VAR})`);

        console.log("2. Setting Route 1...");
        const routeNumber = 1;
        // Emulate setRoute(1) logic
        const variantRecord = await RecLid.findOne({
            where: {
                LI_NR: line.LI_NR,
                ROUTEN_NR: routeNumber
            }
        });

        if (variantRecord) {
            console.log(`Found Variant for Route ${routeNumber}: ${variantRecord.STR_LI_VAR} (${variantRecord.LIDNAME})`);
            console.log(`LI_NR: ${variantRecord.LI_NR}, STR_LI_VAR: ${variantRecord.STR_LI_VAR}`);

            // Emulate loadStopSequence
            const stops = await LidVerlauf.findAll({
                where: {
                    LI_NR: variantRecord.LI_NR,
                    STR_LI_VAR: variantRecord.STR_LI_VAR
                },
                order: [['LI_LFD_NR', 'ASC']]
            });
            console.log(`Stops found: ${stops.length}`);
            if (stops.length > 0) {
                console.log("SUCCESS!");
            } else {
                console.log("FAILED: No stops found.");
            }

        } else {
            console.log(`No Variant found for Line ${line.LI_KUERZEL} / Route ${routeNumber}`);

            // Debug failure
            const allVariants = await RecLid.findAll({ where: { LI_NR: line.LI_NR } });
            console.log(`Available variants: ${allVariants.map(v => v.STR_LI_VAR + " R:" + v.ROUTEN_NR).join(', ')}`);
        }

    } catch (e) {
        console.error(e);
    } finally {
        await sequelize.close();
    }
}

run();
