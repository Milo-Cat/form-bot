const {
    SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder,
    ButtonBuilder, ButtonStyle, ButtonInteraction, ModalBuilder,
    TextInputBuilder, LabelBuilder, TextDisplayBuilder, StringSelectMenuOptionBuilder,
    TextInputStyle, MessageFlags, EmbedBuilder,
    messageLink
} = require('discord.js');
const UTILITY = require('../cmnd_resources.js');
const { cleanInput, cleanIntegerInput } = UTILITY.CLEANERS;
const { USER_MANAGER,
    SERVER_MANAGER
} = UTILITY.DATABASE;
const OPEN_FORM_ID = 'whitelist-open';

module.exports = {
	data: new SlashCommandBuilder().setName('print-bot-explanation').setDescription('Shows the public panel for the bot.'),
	async execute(interaction) {

        if(! await USER_MANAGER.isAdmin(interaction.user.id)){
            return await interaction.reply({
                content: "You do not have permission to use this command.",
                flags: MessageFlags.Ephemeral,
            });
        }

        await interaction.reply({
                content: ``,
                embeds: [embed],
                components: [
				new ActionRowBuilder().addComponents(
					new ButtonBuilder()
						.setCustomId(OPEN_FORM_ID)
						.setLabel('APPLY FOR WHITELIST')
						.setStyle(ButtonStyle.Primary)
				)
			]
        });

	},
};


const embed = new EmbedBuilder()
        .setColor('#03cffe')
        .setTitle('---------------------------------')
        .setDescription(`
            ## Welcome to Farwater!

            ### A Minecraft community focused on the Create Mod.
            
            This is a bot help page for explaining the application process
            and the various commands we have for exploring the server.

            We hope you enjoy your stay!


            --------------------------------------
            `)
        .addFields(
            { name: ' /list-public-servers', value: `
                Shows a list of all the servers anyone can apply to.
                This list includes all of the server details,
                such as IP and Modpack.
                Note: the command response is visible to everyone.
                ` },
            { name: '/whitelist-apply', value: `
                Opens an application form for you to input your MC details
                and specify the server you wish to apply to.
                Alternatively, you can press the button below.
                ` },
            { name: '/who-is', value: `
                Used for looking up who's discord belongs to who's MC name.
                You can input either an MCname or a Discord Id.
                ` },
            { name: '/list', value: `
                List the players currently online for a specific server.
                Each game server has it's own bot,
                so be sure to check the command description.
                ` },
            { name: 'Help & Tickets', value: `
                <#1060997835304218655>
                Here you can open up a private help chat with our staff.

                If your question is more general, our friendly community
                will help you out!
                ` },
            { name: '/list-my-servers', value: `
                Shows a list of all the servers you have access to.
                Ranks sometimes give early access to our servers,
                this command lets you view all the servers you can apply to.
                Note: the command response is only visible to you.
                ` },
        )
        .setThumbnail(`https://raw.githubusercontent.com/farwater-create/Farwater-FancyMenu-Resources/refs/heads/main/common/image/logo_280.png`);
