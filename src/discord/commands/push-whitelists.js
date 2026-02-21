
const {
	SlashCommandBuilder, MessageFlags
} = require('discord.js');
const UTILITY = require('../cmnd_resources.js');
const { USER_MANAGER, SERVER_MANAGER } = UTILITY.DATABASE;



module.exports = {
    data: new SlashCommandBuilder().setName('push-whitelists')
        .setDescription('Updates all whitelists'),
    async execute(interaction) {

        if (await USER_MANAGER.isStaff(interaction.user.id)) {

            await interaction.deferReply({
                content: "Sending whitelist updates...."
            });

            const reply = await SERVER_MANAGER.attemptWhitelist();

            return await interaction.editReply({
                content: reply
            })

        } else {
            return await interaction.reply({
                content: "You do not have permission to use this command.",
                flags: MessageFlags.Ephemeral,
            });
        }
    },
};