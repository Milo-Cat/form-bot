const crypto = require('crypto');
const {
    SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder,
    ButtonBuilder, ButtonStyle, ButtonInteraction, ModalBuilder,
    TextInputBuilder, LabelBuilder, TextDisplayBuilder, StringSelectMenuOptionBuilder,
    TextInputStyle, MessageFlags, EmbedBuilder,
    messageLink
} = require('discord.js');
const UTILITY = require('../../cmnd_resources.js');
const { cleanInput, cleanIntegerInput } = UTILITY.CLEANERS;
const { USER_MANAGER,
    SERVER_MANAGER
} = UTILITY.DATABASE;
const { RANKS } = UTILITY.DATABASE.SCHEMA;

const { textFieldMap, boolFieldMap, getInteractId, getModalSubmitId,
    textActionRowOne, textActionRowTwo, boolActionRow } = require('./editable-fields.js');

const { timestamp, initialiseEditor, findPanel, cleanOldPanels, removePanel } = require('./panels_backend.js')

async function cleanPanels() {
    const oldPanels = cleanOldPanels();
    for (const panel of oldPanels) {
        await panel.message.editReply({
            content: "Editor Expired!",
            embeds: [],
            components: []
        });
    }
}

const interactions = new Map();

for (const field of textFieldMap.values()) {
    interactions.set(
        getInteractId(field),
        async (interaction) => await fieldEditOpen(interaction, field)
    );
    interactions.set(
        getModalSubmitId(field),
        async (interaction) => {
            return await fieldEditSubmit(interaction, field)
        }
    );
}
for (const field of boolFieldMap.values()) {
    interactions.set(
        getInteractId(field),
        async (interaction) => await toggleField(interaction, field)
    );
}

const noPanelMsg = {
    content: "You do not currently have any edit panels open.",
    flags: MessageFlags.Ephemeral,
}

async function fieldEditOpen(interaction, field) {
    cleanPanels();
    const panel = findPanel(interaction.user.id);
    if (!panel) return await interaction.reply(noPanelMsg);

    const fieldState = panel.getFieldState(field.id);
    if (!fieldState) return console.log(`FieldState ${field.id} not found!`);

    return await interaction.showModal(
        field.buildModal(fieldState.value)
    );
}

async function toggleField(interaction, field) {
    if (!interaction.isButton()) return console.log("Not a button!");

    cleanPanels();
    const panel = findPanel(interaction.user.id);
    if (!panel) return await interaction.reply(noPanelMsg);

    const fieldState = panel.getFieldState(field.id) || null;
    if (!fieldState) return console.log(`FieldState ${field.id} not found!`);

    interaction.deferUpdate();

    if (fieldState.value) {//not doing the better solution just in-case
        fieldState.value = false;
    } else {
        fieldState.value = true;
    }

    const embed = buildEmbed(panel.server ? false : true, panel.serverName, panel.fieldStates);

    await interaction.message.edit({
        embeds: [embed],
        components: interaction.message.components
    })

}

async function fieldEditSubmit(interaction, field) {
    cleanPanels();

    if (!interaction.isModalSubmit()) {
        console.error("Interaction is not a modal submit!");
        return;
    };

    const panel = findPanel(interaction.user.id);
    if (!panel) return await interaction.reply(noPanelMsg);

    const fieldState = panel.getFieldState(field.id);
    if (!fieldState) return console.log(`FieldState ${field.id} not found!`);

    let input = interaction.fields.getTextInputValue('value');

    if (field.id === 'server_name') {
        input = cleanInput(input).toLowerCase();
    }
    if (input.length == 0) return await interaction.reply({ content: "Given input invalid!", flags: MessageFlags.Ephemeral });
    fieldState.value = input;



    const embed = buildEmbed(panel.server ? false : true, panel.serverName, panel.fieldStates);


    await panel.message.edit({
        embeds: [embed],
        components: panel.message.components
    });
    await interaction.deferUpdate();


}


class FieldState {
    constructor(field, value) {
        this.field = field;
        this.value = value;
    }
}

//region command
module.exports = {
    data: new SlashCommandBuilder()
        .setName('edit-server')
        .setDescription('Edit an existing server entry or create a new one.')
        .addStringOption(option =>
            option.setName('server_name')
                .setDescription('Server Name')
                .setRequired(true)),
    async execute(interaction) {


        if (await USER_MANAGER.isAdmin(interaction.user.id)) {

            const serverName = cleanInput(interaction.options.getString('server_name', true)).toLowerCase();

            if (serverName.length === 0) {
                return await interaction.reply({
                    content: "Invalid server name provided.",
                    flags: MessageFlags.Ephemeral,
                });
            }

            cleanPanels();
            if (findPanel(interaction.user.id)) {
                return await interaction.reply({
                    content: "You are already editing a server.",
                    flags: MessageFlags.Ephemeral,
                });
            }

            const message = await interaction.deferReply({
                content: "Opening editor...",
            });

            const server = await SERVER_MANAGER.findServer(serverName);

            const fieldStates = [];

            for (const field of textFieldMap.values()) {
                const value = server ? server[field.record] :
                    field.id === 'server_name' ? serverName : field.defaultValue;//sets a default value

                fieldStates.push(new FieldState(field, value));
            }
            for (const field of boolFieldMap.values()) {
                const value = server ? server[field.record] : field.defaultValue;//sets a default value
                fieldStates.push(new FieldState(field, value));
            }

            const embed = buildEmbed(server ? false : true, serverName, fieldStates);

            const editor = initialiseEditor(serverName, interaction.user.id, server, fieldStates);

            editor.message = await interaction.editReply({
                content: `Editor will expire in <t:${editor.closesAt}:R>`,
                embeds: [embed],
                components: [
                    textActionRowOne,
                    textActionRowTwo,
                    boolActionRow,
                    submitActionRow
                ]
            });


        } else {
            return await interaction.reply({
                content: "You do not have permission to use this command.",
                flags: MessageFlags.Ephemeral,
            });
        }
    },
};

//endregion command

//region submit and cancel

const EDIT_AUTH = "server_edit_auth";
const EDIT_SUBMIT = "server_edit_submit_all";
const EDIT_CANCEL = "server_edit_cancel";

const submitActionRow = new ActionRowBuilder();
submitActionRow.addComponents(
    new ButtonBuilder()
        .setCustomId(EDIT_AUTH)
        .setLabel("Submit Changes")
        .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
        .setCustomId(EDIT_CANCEL)
        .setLabel("Cancel")
        .setStyle(ButtonStyle.Danger)
)



const AuthModal = new ModalBuilder()
    .setCustomId(EDIT_SUBMIT)
    .setTitle("Enter Auth Key");

AuthModal.addLabelComponents(
    new LabelBuilder()
        .setLabel("Auth Key")
        .setDescription("Key can be found in the panel log")
        .setTextInputComponent(
            new TextInputBuilder()
                .setCustomId('value')
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
        )
);

interactions.set(EDIT_AUTH,
    async (interaction) => {
        cleanPanels();
        if (!interaction.isButton()) return console.log("Not a button!");
        const panel = findPanel(interaction.user.id);
        if (!panel) return await interaction.reply(noPanelMsg);
        return await interaction.showModal(
            AuthModal
        );
    }
)

interactions.set(EDIT_SUBMIT,
    async (interaction) => {
        cleanPanels();

        if (!interaction.isModalSubmit()) {
            console.error("Interaction is not a modal submit!");
            return;
        };

        const panel = findPanel(interaction.user.id);
        if (!panel) return await interaction.reply(noPanelMsg);

        let input = interaction.fields.getTextInputValue('value');

        if(panel.authKey !== input){
            return await interaction.reply({ content: "Invalid Auth Key!", flags: MessageFlags.Ephemeral })
        }

        const name = panel.getFieldState('server_name').value;
        const title = panel.getFieldState('server_title').value;
        const ipAddress = panel.getFieldState('server_ip').value;
        const description = panel.getFieldState('server_description').value;
        const modpackVersion = panel.getFieldState('modpack_version').value;

        const modpackURL = panel.getFieldState('modpack_url').value;
        const modLoader = panel.getFieldState('mod_loader').value;
        const minecraftVersion = panel.getFieldState('minecraft_version').value;
        const panelID = panel.getFieldState('panel_id').value;

        const whitelistRequired = panel.getFieldState('whitelist_required').value;
        const hidden = panel.getFieldState('server_hidden').value;


        SERVER_MANAGER.modifyServer(panel.serverName,
            name, title, description, panelID, ipAddress,
            modpackURL, modpackVersion, modLoader,
            minecraftVersion, whitelistRequired, hidden
        );


        await panel.message.edit({
            content: `Editor Closed - Changes Saved`,
            embeds: panel.message.embeds,
            components: []
        });
        await interaction.deferUpdate();

        removePanel(panel);
    }
)
interactions.set(EDIT_CANCEL,
    async (interaction) => {
        cleanPanels();
        if (!interaction.isButton()) return console.log("Not a button!");


        const panel = findPanel(interaction.user.id);
        if (!panel) return await interaction.reply(noPanelMsg);

        removePanel(panel);

        await interaction.message.edit({
            content: `Editor Closed - Changes Discarded`,
            embeds: [],
            components: []
        });
    }
)



function buildEmbed(newServer, serverName, fieldStates) {
    const title = newServer ? `Create Server` : `Edit Server: ${serverName}`;

    const embedFields = [];
    for (const state of fieldStates.values()) {
        embedFields.push({
            name: state.field.displayTitle,
            value: `${state.value}`
        })
    }

    try {
        return new EmbedBuilder()
            .setColor('#1539da')
            .setTitle(title)
            .addFields(
                ...embedFields
            )
            .setThumbnail(`https://raw.githubusercontent.com/farwater-create/Farwater-FancyMenu-Resources/refs/heads/main/common/image/logo_280.png`);
    } catch (e) {
        console.error(e);
    }
}

module.exports.widgets = interactions;