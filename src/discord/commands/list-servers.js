const {
    SlashCommandBuilder, EmbedBuilder
} = require('discord.js');
const UTILITY = require('../cmnd_resources.js');
const { USER_MANAGER,
    SERVER_MANAGER
} = UTILITY.DATABASE;


const { FABRIC, FORGE, NEOFORGE, MODRINTH, CURSEFORGE } = require('../emojis.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('list-servers')
        .setDescription('Lists out the servers you can view and apply to'),
        
    async execute(interaction) {

        const [_, servers] = await Promise.all([
            interaction.deferReply({
                content: "Fetching servers..."
            }),
            getServers(interaction)
        ]);

        if (servers.length === 0) {
            return await interaction.editReply({
				content: `Error - No servers found. \nPlease contact an Admin`
			});
        }

        const embeds = []

        for(const server of servers){
            embeds.push(
                buildEmbed(server)
            );
        }

        return await interaction.editReply({
				content: "Available servers:",
                embeds: embeds
		});
    }
};

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


function buildEmbed(server) {

    const text = [
        server.description,
        "",
        `Minecraft Version: ${server.modpackVersion} ${formatLoader(server.modLoader)}`,
        `IP: \`${server.ipAddress}\``,
        `Modpack Link: ${formatLink(server.modpackURL)}  V${server.modpackVersion}`,
        //server.whitelistRequired ? "```diff\n+ Whitelist not required\n```" : "```diff\n- Whitelist required\n```"
    ];
    if (server.hidden) {
        text.push("NOT PUBLICALLY AVAILABLE!")
    }

    return new EmbedBuilder()
        .setColor('#1539da')
        .setTitle(server.title)
        .setDescription(text.join("\n"));
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
    switch (true) {
        case input.startsWith("https://modrinth.com"):
            return `${MODRINTH} [Modrinth](<${packLink}>)`;

        case input.startsWith("https://www.curseforge.com/"):
            return `${CURSEFORGE} [Curseforge](<${packLink}>)`;

        default:
            return `[Link](<${packLink}>)`;
    }

}