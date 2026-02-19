const crypto = require('crypto');
const {
	SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder,
	ButtonBuilder, ButtonStyle, ButtonInteraction, ModalBuilder,
	TextInputBuilder, LabelBuilder, TextDisplayBuilder, StringSelectMenuOptionBuilder,
	TextInputStyle, MessageFlags, EmbedBuilder
} = require('discord.js');
const UTILITY = require('../cmnd_resources.js');
const { USER_MANAGER } = UTILITY.DATABASE;
const { STAFF_RANKS } = UTILITY.DATABASE.SCHEMA;


const interactions = new Map();
const SUBMIT_PROMOTE_MENU = 'promote-menu-submit';

//const argumentedInteractions = new Map();

function findRankIgnoreCase(lcRank) {
    return STAFF_RANKS.find(r => r.toLowerCase() === lcRank) || null;
}

const rankSelect = new StringSelectMenuBuilder()
    .setCustomId('rank')
    .setPlaceholder('Select the rank you want to assign')
    .setRequired(true)
    .addOptions(
        ...STAFF_RANKS.map(rank => new StringSelectMenuOptionBuilder()
            .setLabel(rank)
            .setValue(rank.toLowerCase())
        ), new StringSelectMenuOptionBuilder()
            .setLabel('DEMOTE')
            .setValue('demote')
    );

const authInput = new TextInputBuilder()
    .setCustomId('auth_code')
    .setStyle(TextInputStyle.Short)
    .setRequired(true);


const authInputLabel = new LabelBuilder()
    .setLabel('Authentication key')
    .setDescription('A new key has been generated in the panel log.')
    .setTextInputComponent(authInput);

const rankSelectLabel = new LabelBuilder()
    .setLabel("Specify rank to assign")
    .setStringSelectMenuComponent(rankSelect);


function buildPromotionForm(discordId) {

    const header = new TextDisplayBuilder().setContent(
        `# Promote user <@${discordId}>`
    );

    return new ModalBuilder()
        .setCustomId(SUBMIT_PROMOTE_MENU).setTitle('Apply!')
        .addTextDisplayComponents(header)
        .addLabelComponents(rankSelectLabel)
        .addLabelComponents(authInputLabel);

}

const promoteKeys = [];
function createAuthEntry(discordID) {
    key = {
        discordID,
        authKey: crypto.randomBytes(8).toString('hex'),
        createdAt: Math.floor(Date.now() / 1000)
    };
    promoteKeys.push(key);
    return key;
}


module.exports = {
    data: new SlashCommandBuilder().setName('promote-user')
        .setDescription('Promotes a user to admin status in database.')
        .addUserOption(option =>
            option.setName('discord_id')
                .setDescription('The Discord ID of the user to promote')
                .setRequired(true)),
    async execute(interaction) {

        if (await USER_MANAGER.isAdmin(interaction.user.id)) {

            const discordId = interaction.options.getUser('discord_id').id;

            const timestamp = Math.floor(Date.now() / 1000);

            let containsPending = false;
            promoteKeys.forEach(entry => {
                if (entry.createdAt + 300 < timestamp) {//expire keys after 5 minutes
                    promoteKeys.splice(promoteKeys.indexOf(entry), 1);
                }

                if (entry.discordID === discordId) {
                    containsPending = true;
                    return;
                }
            });
            if (containsPending) {
                return await interaction.reply({
                    content: "A promotion request for this user is already pending. \nCheck the panel log for the authentication key.",
                    flags: MessageFlags.Ephemeral,
                });
            }

            const authEntry = createAuthEntry(discordId);

            console.log(`\x1b[34mPromotion request for user with Discord ID ${discordId}.\x1b[0m \nAuthentication key: \x1b[33m${authEntry.authKey}\x1b[0m`);

            interaction.client.submissions_channel.send({
				content: `Promotion request for user with Discord ID ${discordId}.\nAuthentication key: ${authEntry.authKey}`
			});

            const form = buildPromotionForm(discordId);

            return await interaction.showModal(form);

        } else {
            return await interaction.reply({
                content: "You do not have permission to use this command.",
                flags: MessageFlags.Ephemeral,
            });
        }
    },
};

interactions.set(SUBMIT_PROMOTE_MENU,
    async (interaction) => {
        if (!interaction.isModalSubmit()) {
			console.error("\x1b[31mInteraction is not a modal submit!\x1b[0m");
			return;
		}
        if(!await USER_MANAGER.isAdmin(interaction.user.id)) {
            return await interaction.reply({
                content: "You do not have permission to use this command.",
                flags: MessageFlags.Ephemeral,
            });
        }

        const auth = interaction.fields.getTextInputValue('auth_code');
        let rank = interaction.fields.getStringSelectValues('rank')[0];

        if (rank !== 'demote') {
            console.log("Selected rank:", rank);
            rank = findRankIgnoreCase(rank);
            if (!rank) {
                console.error(`\x1b[31mInvalid rank selected: ${rank}\x1b[0m`);
                return await interaction.reply({
                    content: "Invalid rank selected. Promotion failed.",
                    flags: MessageFlags.Ephemeral,
                });
            }
        }

        const authEntryIndex = promoteKeys.findIndex(entry => entry.authKey === auth);

        if (authEntryIndex === -1) {
            return await interaction.reply({
                content: "Invalid authentication key. Promotion request denied.",
                flags: MessageFlags.Ephemeral,
            });
        }

        const discordId = promoteKeys.splice(authEntryIndex, 1)[0].discordID;

        const user = await USER_MANAGER.find(discordId);

        if (!user) {
            console.error(`\x1b[31mNo user with Discord ID ${discordId} found in database! \nPromotion request failed.\x1b[0m`);
            return await interaction.reply({
                content: "No user with the specified Discord ID was found in the database. \nPromotion request failed.",
                flags: MessageFlags.Ephemeral,
            });
        }
        
        if (rank === 'demote') {
            await USER_MANAGER.demoteAdmin(user.id);
            return await interaction.reply({
                content: `User <@!${discordId}> has been demoted!`,
                flags: MessageFlags.SuppressNotifications,
            });
        }

        await USER_MANAGER.promoteAdmin(user.id, rank, discordId);

        return await interaction.reply({
            content: `User <@!${discordId}> has been promoted to ${rank}!`,
            flags: MessageFlags.SuppressNotifications,
        });

    }
);

module.exports.widgets = interactions;
