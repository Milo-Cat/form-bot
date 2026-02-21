require('dotenv').config();
const { Setup, Client } = require("pterodactyl-api-wrapper").default;

Setup.setPanel("https://panel.farwater.de");

const client = new Client(process.env.PANEL_API_KEY);

module.exports.sendCommand = async (serverId, command) => {
    try {
        const response = await client.servers.sendCommand(serverId, command);
        console.log(`Command sent to ${serverId}:`, command);
        console.log("Panel response:", response);
        return true;
    } catch (err) {
        console.error("Failed to send command:", err);
        return false;
    }
}

module.exports.serverActive = async (serverId) => {
    try {
        const details = await client.servers.sendCommand(serverId, "");
        console.log(`Server ${serverId} details:`, details);
        return true;
    } catch (err) {
        console.error("Failed to get server details:", err);
        return false;
    }
}

/*
async function main() {
    try {
        const servers = await client.servers.list();
        console.log("SERVERS:");
        console.log(JSON.stringify(servers, null, 2));
    } catch (err) {
        console.error("Error fetching servers:", err);
    }
}

main();*/

