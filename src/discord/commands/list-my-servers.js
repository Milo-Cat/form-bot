const {
    SlashCommandBuilder, EmbedBuilder, MessageFlags
} = require('discord.js');
const UTILITY = require('../cmnd_resources.js');
const { USER_MANAGER,
    SERVER_MANAGER
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
        servers = SERVER_MANAGER.allServers();
    } else {
        servers = SERVER_MANAGER.gatherViewableServers(user);
    }

    return servers;
}


function buildEmbed(server, showInternalName) {
    
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

    /*const text = [,
        showInternalName && server.name,
        `\`\`\`\n${server.description}\n\`\`\``,
        "",
        `Minecraft Version: ${server.modpackVersion} ${formatLoader(server.modLoader)}`,
        `IP: \`${server.ipAddress}\``,
        `Modpack Link: ${formatLink(server.modpackURL)}  V${server.modpackVersion}`,
        //server.whitelistRequired ? "```diff\n+ Whitelist not required\n```" : "```diff\n- Whitelist required\n```"
    ].filter(Boolean);
    if (server.hidden) {
        text.push("NOT PUBLICALLY AVAILABLE!")
    }*/

    const embed = new EmbedBuilder()
        .setColor('#1539da')
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
            return ":fabric: Fabric";
        case 'forge':
            return ":forge: Forge";
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