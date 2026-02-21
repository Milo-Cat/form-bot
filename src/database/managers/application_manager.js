const { Op } = require('sequelize');
const {User, Server, WhitelistApplication, Infraction, Punishment, initializeDatabase} = require('../schema.js');
const {dateMinusYears} = require('./user_manager.js');

module.exports.submit = async (name, userId, serverId, age, applicationReason) => {

    console.log(`Submitting application for user ${name}, userID ${userId}, server ${serverId}, age ${age}, reason: ${applicationReason}`);
    const oldApplication = await WhitelistApplication.findOne({
        where: {
            userID: userId,
            serverID: serverId,
            status: { [Op.in]: ['pending', 'approved'] }
        }
    });

    if (oldApplication) {
        console.log("Error: Pending application found!");
        return null;//user already has a pending or approved application for this server
    };

    const application = await WhitelistApplication.create({
        userID: userId,
        serverID: serverId,
        birthdate: dateMinusYears(age),
        applicationReason: applicationReason,
    });
    await application.save();
    console.log(`Application saved for user ${name}.    ID: ${application.get('id')}`);
    return application;
}

module.exports.update = async (id, reject, reason, admin) => {

    const application = await WhitelistApplication.findByPk(id);
    if (!application) {
        console.error(`Application with ID ${id} not found.`);
        return null;
    }

    application.reviewedAt = new Date();
    application.reviewedBy = admin;
    application.status = reject ? 'rejected' : 'approved';
    application.applicationReason = reason;
    await application.save();

    return application;
}