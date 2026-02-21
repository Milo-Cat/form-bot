
const {DataTypes, Sequelize} = require('sequelize');

const ADMIN_RANKS = [
    'Admin',
    'Senior Admin',
    'Owner',
    'Founder',
];

const STAFF_RANKS = [
    'TrialMod',
    'Moderator',
    'Retired',
    ...ADMIN_RANKS
];

// https://sequelize.org/api/v6/class/src/sequelize.js~sequelize#instance-constructor-constructor
/*const sequelize = new Sequelize(
    'mr_cog', //database name
    'username', //username
    null, //password
    {
        host: process.env.DATABASE_HOST,
        dialect: 'mariadb'
    }
)*/

const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: 'database.db'
});


function normalizeBirthdate(value) {
    if (!value) return null;

    const d = new Date(value);
    d.setDate(1); // force day to 1

    return d.toISOString().slice(0, 10); // YYYY-MM-DD
}


//region tables

/*
By default, Sequelize automatically adds
the attributes createdAt and updatedAt to
every model, using the data type
DataTypes.DATE
Those attributes are automatically managed as well
*/
/*
Sequelize automatically adds an
auto-incremented integer attribute
called id as primary key
if none is specified.
*/
//region User
const User = sequelize.define(
    'User',
    {
        // Model attributes are defined here
        name: {
            type: DataTypes.STRING,
            allowNull: false,
            // allowNull defaults to true
        },
        birthdate: {
            type: DataTypes.DATEONLY,
            allowNull: false,
            set(value) {
                this.setDataValue('birthdate', normalizeBirthdate(value));
            }
        },
        discordID: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true,
        },
        mcUuid: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true,
        },
        mcName: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true,
        },
        email: {
            type: DataTypes.STRING,
            allowNull: true,
            unique: false,//todo allow duplicates for testing
        },
        rank: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
        }


    },
    {
        // Other model options go here
        timestamps: true,// enables createdAt and updatedAt
        createdAt: 'registeredAt',
        freezeTableName: true,
    },
);

//region WhitelistApplication
const WhitelistApplication = sequelize.define(
    'WhitelistApplication',
    {
        userID: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        serverID: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        birthdate: {
            type: DataTypes.DATEONLY,
            allowNull: false,
            set(value) {
                this.setDataValue('birthdate', normalizeBirthdate(value));
            },
        },
        applicationReason: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        reviewedAt: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        status: {
            type: DataTypes.ENUM('pending', 'approved', 'rejected'),
            allowNull: false,
            defaultValue: 'pending',
        },
        rejectReason: {
            type: DataTypes.TEXT,
            allowNull: false,
            defaultValue: 'REQUIREMENTS NOT MET',
        },
        staffReviewerID: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        messageID: {
            type: DataTypes.STRING,
            allowNull: true,
        },
    },
    {
        timestamps: true,
        freezeTableName: true,
    },
);

//region Server
const Server = sequelize.define(
    'Server',
    {
        name: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true,
        },
        title: {
            type: DataTypes.STRING,
            allowNull: false,
            defaultValue: 'Server Title'
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        panelID: {
            type: DataTypes.STRING(8),
        },
        ipAddress: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true,
        },
        modpackURL: {
            type: DataTypes.TEXT,
            allowNull: false,
        },
        modpackVersion: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        minecraftVersion: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        modLoader: {
            type: DataTypes.STRING,
            allowNull: false,
            defaultValue: 'fabric',
        },
        whitelistRequired: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true,
        },
        hidden: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
        },
    },
    {
        timestamps: true,
        freezeTableName: true,
    },
);

//region Rank
const Rank = sequelize.define(
    'Rank',
    {
        name: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: false,
        },
    },
    {
        timestamps: false,
        freezeTableName: true,
    },
);

//region Infraction
const Infraction = sequelize.define(
    'Infraction',
    {
        userID: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        reason: {
            type: DataTypes.TEXT,
            allowNull: false,
        },
        staffIssuerID: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
    },
    {
        timestamps: true,
        freezeTableName: true,
        createdAt: 'dateIssued',
    },
);

//region Punishment
const Punishment = sequelize.define(
    'Punishment',
    {
        type: {
            type: DataTypes.ENUM('ban', 'timeout'),//todo potentially add more?
            allowNull: false,
        },
        reason: {
            type: DataTypes.TEXT,
            allowNull: false,
        },
        infractionID: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        serverID: { //NULL for discord
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        endsAt: {
            type: DataTypes.DATE,
            allowNull: true, //null for permanent
        },
        status: {
            type: DataTypes.ENUM('PendingAction', 'Active', 'TimedOut', 'Revoked'),
            allowNull: false,
            defaultValue: 'PendingAction',
        },
    },
    {
        timestamps: true,
        freezeTableName: true,
        createdAt: 'dateIssued',
    },
);

//region StaffMember
const StaffMember = sequelize.define(
    'StaffMember',
    {
        userID: {
            type: DataTypes.INTEGER,
            allowNull: false,
            unique: true,
            primaryKey: true,
        },
        rank: {
            type: DataTypes.ENUM(...STAFF_RANKS),
            allowNull: false,
            defaultValue: 'TrialMod',
        },
        notes: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
    },
    {
        timestamps: true,
        freezeTableName: true
    },
);

//region ServerPlayerWhitelist
const ServerPlayerWhitelist = sequelize.define(
  'ServerPlayerWhitelist',
  {
    UserId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      references: {
        model: User,
        key: 'id',
      },
    },
    ServerId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      references: {
        model: Server,
        key: 'id',
      },
    },
    implemented: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
  },
  {
    timestamps: false,
    freezeTableName: true,
  }
);


//endregion


//region relations

User.belongsToMany(Server, {through: ServerPlayerWhitelist});
Server.belongsToMany(User, {through: ServerPlayerWhitelist});

ServerPlayerWhitelist.belongsTo(User, { foreignKey: 'UserId' });
ServerPlayerWhitelist.belongsTo(Server, { foreignKey: 'ServerId' });

User.hasMany(ServerPlayerWhitelist, { foreignKey: 'UserId' });
Server.hasMany(ServerPlayerWhitelist, { foreignKey: 'ServerId' });


WhitelistApplication.belongsTo(User, {foreignKey: 'userID', as: 'Applicant'});
User.hasMany(WhitelistApplication, {foreignKey: 'userID', as: 'Applications'});

WhitelistApplication.belongsTo(StaffMember, {foreignKey: 'staffReviewerID', as: 'Reviewer'});
StaffMember.hasMany(WhitelistApplication, {foreignKey: 'staffReviewerID', as: 'ReviewedApplications'});

WhitelistApplication.belongsTo(Server, {foreignKey: 'serverID'});
Server.hasMany(WhitelistApplication, {foreignKey: 'serverID'});

Infraction.belongsTo(StaffMember, {foreignKey: 'userID', as: 'Offender'});
StaffMember.hasMany(Infraction, {foreignKey: 'userID', as: 'Offenses'});


Punishment.belongsTo(Infraction, {foreignKey: 'infractionID'});
Infraction.hasMany(Punishment, {foreignKey: 'infractionID'});

Punishment.belongsTo(Server, {foreignKey: 'serverID'});
Server.hasMany(Punishment, {foreignKey: 'serverID'});

Infraction.belongsTo(StaffMember, {foreignKey: 'staffIssuerID', as: 'Issuer'});
StaffMember.hasMany(Infraction, {foreignKey: 'staffIssuerID', as: 'IssuedInfractions'});

StaffMember.belongsTo(User, {foreignKey: 'userID'});
User.hasOne(StaffMember, {foreignKey: 'userID'});

Server.belongsToMany(Rank, {through: 'ServerViewableToRank'});
Rank.belongsToMany(Server, {through: 'ServerViewableToRank'});

User.belongsToMany(Rank, {through: 'UserRanks'});
Rank.belongsToMany(User, {through: 'UserRanks'});


//endregion


//region sync
// Syncing the models with the database


const initializeDatabase = async () => {
    try {
        await sequelize.authenticate();
        console.log('Connection established');

        await sequelize.sync();
        console.log('Tables synced');
        console.log('Database Ready');

    } catch (err) {
        console.error('Connection failed:', err);
        return false;
    }

    return true;
}

//endregion

// `sequelize.define` also returns the model
console.log(User === sequelize.authenticate()); // true


module.exports = {
    STAFF_RANKS,
    ADMIN_RANKS,
    User,
    WhitelistApplication,
    Server,
    Rank,
    Infraction,
    Punishment,
    StaffMember,
    ServerPlayerWhitelist,
    initializeDatabase,
}