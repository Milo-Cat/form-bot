const { Op } = require('sequelize');
const {User, Server, WhitelistApplication, Infraction, Punishment, StaffMember} = require('../schema.js');


module.exports.findServer = async (serverName) => {

    return await Server.findOne({
        where: { name: serverName } 
    });
}

module.exports.modifyServer = async (old_name, name, panelID, ipAddress, modpackURL, modpackVersion, modLoader, minecraftVersion, whitelistRequired, hidden) => {

    let server;
    if(old_name) {
        server = await this.findServer(old_name);
    }

    if (server) {
        //update existing server
        server.name = name;
        server.panelID = panelID;
        server.ipAddress = ipAddress;
        server.modpackURL = modpackURL;
        server.modpackVersion = modpackVersion;
        server.modLoader = modLoader;
        server.minecraftVersion = minecraftVersion;
        server.whitelistRequired = whitelistRequired;
        server.hidden = hidden;
        console.log(`Modified server ${name}`);
    } else {
        server = await Server.create({
            name: name,
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

module.exports.getCachedServers = () => {return serverCache;}


module.exports.isServerHiddenToUser = async (server, user) => {

    if(!server.hidden) return false;

    const hiddenServers = user.hiddenServers;
    if (!hiddenServers || !Array.isArray(hiddenServers)) return false;

    return hiddenServers.includes(server.name);
}