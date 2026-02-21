const { Op } = require('sequelize');
const { User, Server, WhitelistApplication, Infraction, Punishment, StaffMember, Rank, ServerPlayerWhitelist } = require('../schema.js');


module.exports.findServer = async (serverName) => {

    return await Server.findOne({
        where: { name: serverName }
    });
}

module.exports.modifyServer = async (old_name, name, title, description, panelID, ipAddress, modpackURL, modpackVersion, modLoader, minecraftVersion, whitelistRequired, hidden) => {

    if (!title || title.length == 0) {
        title = name;
    }

    let server;
    if (old_name) {
        server = await this.findServer(old_name);
    }

    if (server) {
        //update existing server
        server.name = name;
        server.title = title;
        server.panelID = panelID;
        server.ipAddress = ipAddress;
        server.modpackURL = modpackURL;
        server.modpackVersion = modpackVersion;
        server.modLoader = modLoader;
        server.minecraftVersion = minecraftVersion;
        server.whitelistRequired = whitelistRequired;
        server.hidden = hidden;
        server.description = description;
        console.log(`Modified server ${name}`);
    } else {
        server = await Server.create({
            name: name,
            title: title,
            description: description,
            panelID: panelID,
            ipAddress: ipAddress,
            modpackURL: modpackURL,
            modpackVersion: modpackVersion,
            modLoader: modLoader,
            minecraftVersion: minecraftVersion,
            whitelistRequired: whitelistRequired,
            hidden: hidden,
        });
        console.log(`Created server ${name}`);
    }
    await server.save();

    await this.cacheServers();//update cache after modification

    return server;
}

const serverCache = [];

module.exports.cacheServers = async () => {//to be ran at startup or when a server is added/modified

    serverCache.length = 0;//clear cache

    const servers = await Server.findAll();

    serverCache.push(...servers.map(s => s.name));

    return serverCache;
}

module.exports.getCachedServers = () => { return serverCache; }


module.exports.isServerHiddenToUser = async (server, user) => {

    if (server.hidden){

    const hiddenServers = user.hiddenServers;
    if (!hiddenServers || !Array.isArray(hiddenServers)) return false;

    return hiddenServers.includes(server.name);
    }
    return false;
}

module.exports.gatherUnhiddenServers = async () => {
    return await Server.findAll({ where: { hidden: false } });
}

module.exports.gatherViewableServers = async (user) => {//USER as in user record. Is nullable

    if(!user){
        return await this.gatherUnhiddenServers();
    }

    const userRanks = await user.getRanks();

    const userRankIds = userRanks.map(r => r.id);

    return await rankViewableServers(userRankIds);
}

async function rankViewableServers(userRankIds) {
    
    const [unhiddenServers, hiddenServers] = await Promise.all([
        Server.findAll({ where: { hidden: false } }),
        Server.findAll({
            where: { hidden: true },
            include: [{
                model: Rank,
                where: { id: userRankIds },
                through: { attributes: [] }
            }]
        })
    ]);

    const allViewable = [...unhiddenServers, ...hiddenServers];
    return allViewable;
}

module.exports.gatherUserAppliableServers = async (user) => {//USER as in user record. Is nullable
    if (!user) {
        return await this.gatherUnhiddenServers();
    }

    const [userRanks, whitelistedServers, openApplications] = await Promise.all([
        user.getRanks(),
        user.getServers(),
        WhitelistApplication.findAll({
            where: {
                status: { [Op.in]: ['pending', 'approved'] },
                userID: user.id
            }
        })
    ]);

    const userRankIds = userRanks.map(r => r.id);

    const appliedServerIds = [
        ...whitelistedServers.map(s => s.id),
        ...openApplications.map(a => a.serverID)
    ];

    const foundServers = await rankViewableServers(userRankIds);

    const allViewable = foundServers
        .filter(server => !appliedServerIds.includes(server.id));

    return allViewable;
}

module.exports.gatherAppliableServersForStaff = async (user) => {
    const [whitelistedServers, openApplications, servers] = await Promise.all([
        user.getServers(),
        WhitelistApplication.findAll({
            where: {
                status: { [Op.in]: ['pending', 'approved'] },
                userID: user.id
            }
        }),
        Server.findAll()
    ]);

    const appliedServerIds = [
        ...whitelistedServers.map(s => s.id),
        ...openApplications.map(a => a.serverID)
    ];

    return servers.filter(server => !appliedServerIds.includes(server.id));

}

module.exports.allServers = async () => {
    return await Server.findAll();
}


const { sendCommand } = require("../../panel/panel_interface.js");

module.exports.attemptWhitelist = async () => {

    const updates = [];
    const errors = [];

    const servers = await Server.findAll();

    for(const server of servers){

        const panelId = server.panelID;

        let success = await sendCommand(panelId, "x");

        if(!success){
            errors.push(`Failed to contact server ${server.name}`);
            continue;
        }

        const whitelists = await ServerPlayerWhitelist.findAll({
            where: {
                ServerId: server.id,
                implemented: false
            },
            include: [{
                    model: User,
                    attributes: ['mcName']
            }]
        });
        
        for(const entry of whitelists){
            const name = entry.User.mcName
            success = await sendCommand(panelId, `whitelist add ${name}`)
            if(success){
                updates.push(`Whitelisted ${name} on ${server.name}`);
                entry.implemented = true;
                await entry.save();
            } else {
                errors.push(`Failed to send whitelist command to ${server.name}`);
                break;
            }
        }

        updates.push(`${server.name} is up to date`)

    }

    const response = [...errors, "" , ...updates].join("\n");
    return response;
}