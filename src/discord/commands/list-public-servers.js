const {
    SlashCommandBuilder, EmbedBuilder
} = require('discord.js');
const { handleListServersCommand } = require('./list-my-servers.js');
const UTILITY = require('../cmnd_resources.js');
const {
    SERVER_MANAGER
} = UTILITY.DATABASE;



module.exports = {
    data: new SlashCommandBuilder()
        .setName('list-public-servers')
        .setDescription('Lists out publically avalable servers'),
        
    async execute(interaction) {

        const [_, servers] = await Promise.all([
            interaction.deferReply({
                content: "Fetching servers..."
            }),
            SERVER_MANAGER.gatherUnhiddenServers()
        ]);

        return await handleListServersCommand(servers, interaction, false);
    }
};