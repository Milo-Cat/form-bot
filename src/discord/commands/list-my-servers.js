const {
    SlashCommandBuilder, EmbedBuilder, MessageFlags
} = require('discord.js');
const UTILITY = require('../cmnd_resources.js');
const { USER_MANAGER,
    SERVER_MANAGER,
    APPLICATION_MANAGER
} = UTILITY.DATABASE;


const { FABRIC, FORGE, NEOFORGE, MODRINTH, CURSEFORGE } = require('../emojis.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('list-my-servers')
        .setDescription('Lists out the servers you can view and apply to'),
        
    async execute(interaction) {

        const showInternalName = USER_MANAGER.isStaff(interaction.user.id);

        const [_, servers] = await Promise.all([
            interaction.deferReply({
                content: "Fetching servers...",
                flags: MessageFlags.Ephemeral
            }),
            getServers(interaction)
        ]);

        return await this.handleListServersCommand(servers, interaction, showInternalName);
    }
};

module.exports.handleListServersCommand = async (servers, interaction, showInternalName) => {

        if (servers.length === 0) {
            return await interaction.editReply({
				content: `Error - No servers found. \nPlease contact an Admin`
			});
        }

        const embeds = []

        for(const server of servers){
            embeds.push(
                buildEmbed(server, showInternalName)
            );
        }

        return await interaction.editReply({
				content: "Available servers:",
                embeds: embeds
		});
    }

async function getServers(interaction) {
    const user = await USER_MANAGER.find(interaction.user.id);

    let servers;

    if (USER_MANAGER.isStaff(interaction.user.id)) {
        servers = await SERVER_MANAGER.allServers();
    } else {
        servers = await SERVER_MANAGER.gatherViewableServers(user);
    }

    for(const server of servers){
        const result = await APPLICATION_MANAGER.getStatus(user, server);

        console.log(result);
        if(result === 'approved'){
            server.colour = '#00c410'
        } else if(result === 'rejected') {
            server.colour = '#e63a10'
        }
        
    }


    return servers;
}


function buildEmbed(server, showInternalName) {

    const colour = server.colour || '#1539da';
    
    const embedFields = [
        {
        name: "Description",
        value: server.description
        },
        {
        name: "Minecraft Version",
        value: `${formatLoader(server.modLoader)} ${server.minecraftVersion}`
        },
        {
        name: "IP",
        value: `\`${server.ipAddress}\``
        },
        {
        name: "Modpack Link",
        value: `${formatLink(server.modpackURL)}  V${server.modpackVersion}`
        }
    ]



    let text = "";

    if(showInternalName){
        text += server.name;
    }
    if(server.hidden){
        text += "\nNOT PUBLICALLY AVAILABLE!";
    }

    const embed = new EmbedBuilder()
        .setColor(colour)
        .setTitle(server.title)
        .addFields(...embedFields);
    
    if(text.length > 0){
        embed.setDescription(text);
    }

    return embed;
}

function formatLoader(loader) {
    switch (loader) {
        case 'fabric':
            return `${FABRIC} Fabric`;
        case 'forge':
            return `${FORGE} Forge`;
        default:
            return loader;
    }
}

function formatLink(packLink) {
    if (packLink.startsWith("https://modrinth.com")) {
        return `${MODRINTH} [Modrinth](<${packLink}>)`;
    } else if (packLink.startsWith("https://www.curseforge.com/")) {
        return `${CURSEFORGE} [Curseforge](<${packLink}>)`;
    } else {
        return `[Link](<${packLink}>)`;
    }
}