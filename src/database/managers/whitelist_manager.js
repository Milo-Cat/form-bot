const { Op } = require('sequelize');
const {User, Server, WhitelistApplication, ServerPlayerWhitelist} = require('../schema.js');


module.exports.submit = async (UserId, ServerId) => {


    console.log(`Submitting whitelist entry for userID ${UserId} on server ${ServerId}`);
    const [whitelist_entry, created] = await ServerPlayerWhitelist.findOrCreate({
        where: {
            UserId: UserId,
            ServerId: ServerId
        }
    });
    if(created) {
        await whitelist_entry.save();
    }

    return whitelist_entry;
}

module.exports.implementAll = async (ServerId) => {
    await ServerPlayerWhitelist.update(
        { implemented: true }, 
        { where: { ServerID: ServerId, implemented: false } }
    );
    return;
}

module.exports.implementSpecific = async (ServerId, UserId) => {
    await ServerPlayerWhitelist.update(
        { implemented: true }, 
        { where: { ServerID: ServerId, UserID: UserId } }
    );
    return;
}