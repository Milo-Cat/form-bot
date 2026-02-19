const { Op } = require('sequelize');
const {User, ADMIN_RANKS, WhitelistApplication, Infraction, Punishment, StaffMember} = require('../schema.js');
const { all } = require('sequelize/lib/operators');

function appendAge(record) {

    const ageDate = new Date(
        Date.now() - Date.parse(record.birthdate)
    );
    const age = Math.abs(ageDate.getFullYear() - 1970);
    record.age = age;
    return record;
}

const dateMinusYears = (years) => {
    const now = new Date();
    now.setFullYear(now.getFullYear() - years);
    return now;
}
module.exports.dateMinusYears = dateMinusYears;

module.exports.createUser = async (name, discordID, age, email) => {

    const birthdate = dateMinusYears(age);

    const newbie = await User.create({
        name: name,
        discordID: discordID,
        birthdate: birthdate,
        email: email
    });
    await newbie.save();
    appendAge(newbie);
    console.log("Created new user '" + name + "' with id: " + newbie.get('id'));
    return newbie;
}

module.exports.getOrCreate = async (name, discordID, age, email, mcUuid, mcName) => {

    const birthdate = dateMinusYears(age);

    const [user, created] = await User.findOrCreate({
        where: {discordID: discordID},
        defaults: {
            name: name,
            birthdate: birthdate,
            email: email,
            mcUuid: mcUuid,
            mcName: mcName,
        }
    });

    if (created) {
        console.log("Created new user '" + name + "' with id: " + user.get('id'));
        await user.save();
        appendAge(user);
    }

    return user;
}

module.exports.find = async (discordID) => {

    return appendAge(await User.findOne({
        where: {
            discordID: discordID
        }
    }));

}

module.exports.findById = async (ID) => {

    return appendAge(await User.findOne({
        where: {
            id: ID
        }
    }));

}

module.exports.findByGameName = async (mc_name) => {

    return appendAge(await User.findOne({
        where: {
            mcName: mc_name
        }
    }));

}


let AdminIDs = [];
let StaffIDs = [];


module.exports.findAdmin = async (discordID) => {

    const staff = await StaffMember.findOne({
         include: [{ 
            model: User, 
            where: { discordID: discordID } 
        }]
    });

    return staff;
}

module.exports.promoteAdmin = async (userID, rank, discordID) => {

    console.log(`Promoting user ${discordID} to rank ${rank}...`);

    let staff = await StaffMember.findOne({
        where: { userID: userID } 
    });

    if (staff) {
        staff.rank = rank;
    } else {
        staff = await StaffMember.create({
            userID: userID,
            rank: rank,
        });
    }
    await staff.save();

    if(ADMIN_RANKS.includes(rank)) {
        AdminIDs.push(discordID);
    }

    StaffIDs.push(discordID);

    return staff;
}

module.exports.demoteAdmin = async (userID) => {

    await StaffMember.destroy({ where: { userId: userID } });

    AdminIDs = AdminIDs.filter(id => id !== userID);
    StaffIDs = StaffIDs.filter(id => id !== userID);

    return;
}

module.exports.collectAdminDiscordIDs = async () => {//to be ran at startup;

    console.log(`Collecting staff from the database...`);

    const allStaff = await StaffMember.findAll({
         include: [{ 
            model: User
        }] 
    });

    StaffIDs = allStaff.map(staff => staff.User.discordID);

    const allAdmins = await StaffMember.findAll({
        where: {
            rank: {
                [Op.in]: ADMIN_RANKS
            }
        },
         include: [{ 
            model: User
        }] 
    });

    console.log(`Collected ${allAdmins} admins from the database.`);

    AdminIDs = allAdmins.map(admin => admin.User.discordID);

    return AdminIDs;
}

module.exports.isAdmin = (discordID) => {
    return AdminIDs.includes(discordID);
}

module.exports.isStaff = (discordID) => {
    return StaffIDs.includes(discordID);
}


//createUser("TestUser", "`1234567890`", "2000-01-01", "test@eg.com");
//running twice will cause UNIQUE constraint error on discordID and email