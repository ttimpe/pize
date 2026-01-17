const { Sequelize, DataTypes } = require('sequelize');

const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: '../ifesx-backend/test.sqlite3',
    logging: false
});

const RecLid = sequelize.define('RecLid', {
    BASIS_VERSION: { type: DataTypes.INTEGER, primaryKey: true },
    LI_NR: { type: DataTypes.INTEGER, primaryKey: true },
    STR_LI_VAR: { type: DataTypes.STRING(6), primaryKey: true },
    LI_KUERZEL: DataTypes.STRING(6),
    LIDNAME: DataTypes.STRING(100),
    ROUTEN_NR: DataTypes.INTEGER
}, { tableName: 'REC_LID', timestamps: false });

async function check() {
    try {
        const variants = await RecLid.findAll({
            where: { LI_KUERZEL: '1' }
        });
        console.log(`Found ${variants.length} variants for Line 1:`);
        variants.forEach(v => {
            console.log(`- Variant: ${v.STR_LI_VAR}, RoutenNr: ${v.ROUTEN_NR}, Name: ${v.LIDNAME}`);
        });

        const specific = await RecLid.findOne({
            where: { LI_KUERZEL: '1', ROUTEN_NR: 1 }
        });

        if (specific) {
            console.log("\nFound Match for Line 1, Route 1!");
            console.log(JSON.stringify(specific.toJSON(), null, 2));
        } else {
            console.log("\nNO Match for Line 1, Route 1 using LI_KUERZEL='1'. Checking LI_NR match...");
            // Also check by LI_NR directly if LI_KUERZEL failed (though they should align)
            const byNr = await RecLid.findOne({
                where: { LI_NR: 1, ROUTEN_NR: 1 }
            });
            if (byNr) {
                console.log("\nFound Match for Line 1 (LI_NR=1), Route 1!");
                console.log(JSON.stringify(byNr.toJSON(), null, 2));
            } else {
                console.log("Still no match by LI_NR=1.");
            }
        }

    } catch (e) {
        console.error(e);
    } finally {
        await sequelize.close();
    }
}

check();
