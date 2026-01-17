const { Sequelize, DataTypes } = require('sequelize');

const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: '../ifesx-backend/test.sqlite3',
    logging: false
});

const RecLid = sequelize.define('RecLid', {
    LI_NR: { type: DataTypes.INTEGER, primaryKey: true },
    LI_KUERZEL: DataTypes.STRING,
    STR_LI_VAR: DataTypes.STRING,
    ROUTEN_NR: DataTypes.INTEGER,
    LIDNAME: DataTypes.STRING
}, { tableName: 'REC_LID', timestamps: false });

async function check() {
    try {
        const variants = await RecLid.findAll({
            where: { LI_KUERZEL: '1' }
        });
        console.log(`Found ${variants.length} variants for LI_KUERZEL='1':`);
        variants.forEach(v => {
            console.log(`- LI_NR: ${v.LI_NR}, STR_LI_VAR: '${v.STR_LI_VAR}', ROUTEN_NR: ${v.ROUTEN_NR}`);
        });

    } catch (e) {
        console.error(e);
    } finally {
        await sequelize.close();
    }
}

check();
