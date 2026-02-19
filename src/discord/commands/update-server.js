const crypto = require('crypto');
const {
    SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder,
    ButtonBuilder, ButtonStyle, ButtonInteraction, ModalBuilder,
    TextInputBuilder, LabelBuilder, TextDisplayBuilder, StringSelectMenuOptionBuilder,
    TextInputStyle, MessageFlags, EmbedBuilder
} = require('discord.js');
const UTILITY = require('../cmnd_resources.js');
const { cleanInput, cleanIntegerInput } = UTILITY.CLEANERS;
const { USER_MANAGER,
    SERVER_MANAGER
} = UTILITY.DATABASE;
const { RANKS } = UTILITY.DATABASE.SCHEMA;



//const interactions = new Map();

const argumentedInteractions = new Map();
const PAGE_ONE = 'edit-server-page-one-submit';
const OPEN_PAGE_TWO = 'open_page_two';
const PAGE_TWO = 'edit-server-page-two-submit';


function buildSimpleTextInput(label, customId, value) {

    return new LabelBuilder()
        .setLabel(label)
        .setTextInputComponent(
            new TextInputBuilder()
                .setCustomId(customId)
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
                .setValue(value || "")
        );
}

function buildTrueFalseSelectLabel(label, customId, defaultValue) {

    const trueOption = new StringSelectMenuOptionBuilder()
        .setLabel('TRUE')
        .setValue('true')
        .setDefault(defaultValue === true);

    const falseOption = new StringSelectMenuOptionBuilder()
        .setLabel('FALSE')
        .setValue('false')
        .setDefault(defaultValue === false);

    const select = new StringSelectMenuBuilder()
        .setCustomId(customId)
        .setRequired(true)
        .addOptions(trueOption, falseOption);

    return new LabelBuilder()
        .setLabel(label)
        .setStringSelectMenuComponent(select);
}



function buildServerEditForm(serverRecord, inputtedName) {

    const fullForm = createServerEditForm();

    let serverNameLabel;
    let panelIDLabel;
    let serverIpLabel;
    let modpackURLLabel;
    let modpackVersionLabel;
    let modLoaderLabel;
    let minecraftVersionLabel;

    let whitelistRequired;
    let hidden;

    let part_one = new ModalBuilder().setCustomId(PAGE_ONE + ":" + fullForm.id);
    let part_two = new ModalBuilder().setCustomId(PAGE_TWO + ":" + fullForm.id);

    if (!serverRecord) {

        //no Server record found, create new entry form
        part_one.setTitle('Add Server');
        part_two.setTitle('Add Server - Part 2');
        serverNameLabel = inputtedName || "";
        serverIpLabel = ".farwater.de";
        modpackURLLabel = "https://modrinth.com/modpack/";
        modpackVersionLabel = "1.0.0";
        modLoaderLabel = "fabric";
        minecraftVersionLabel = "1.21.1";
        whitelistRequired = true;
        hidden = true;

    } else {

        part_one.setTitle('Modify Server');
        part_two.setTitle('Modify Server - Part 2');
        serverNameLabel = serverRecord.name;
        panelIDLabel = serverRecord.panelID;
        serverIpLabel = serverRecord.ipAddress;
        modpackURLLabel = serverRecord.modpackURL;
        modpackVersionLabel = serverRecord.modpackVersion;
        modLoaderLabel = serverRecord.modLoader;
        minecraftVersionLabel = serverRecord.minecraftVersion;
        whitelistRequired = serverRecord.whitelistRequired;
        hidden = serverRecord.hidden;

    }

    part_one.addLabelComponents(
        buildSimpleTextInput("Server Name", "name", serverNameLabel),
        buildSimpleTextInput("Server IP", "ip", serverIpLabel),
        buildSimpleTextInput("Modpack Version", "modpack_version", modpackVersionLabel),
        buildTrueFalseSelectLabel("Is whitelist enabled?", "whitelist_required", whitelistRequired),
        buildTrueFalseSelectLabel("Is server hidden?", "hidden", hidden),
    );

    part_two.addLabelComponents(
        buildSimpleTextInput("Modpack URL", "modpack_url", modpackURLLabel),
        buildSimpleTextInput("Panel ID", "panel", panelIDLabel),
        buildSimpleTextInput("Mod Loader", "mod_loader", modLoaderLabel),
        buildSimpleTextInput("Minecraft Version", "minecraft_version", minecraftVersionLabel),
        buildSimpleTextInput("Authentication Key", "auth_key", "").setDescription("A new key has been generated in the panel log."),
    );

    fullForm.page_two = part_two;

    return part_one;
}

const modifyKeys = [];
function createAuthEntry(serverName) {
    key = {
        serverName,
        authKey: crypto.randomBytes(8).toString('hex'),
        createdAt: Math.floor(Date.now() / 1000)
    };
    modifyKeys.push(key);
    return key;
}


let formIndex = 1;//not 0 because that would be a "falsy" value.
const activeForms = [];

function createServerEditForm() {

    const formId = formIndex;
    formIndex++;

    const form = {
        id: formId,
        page_two: null,
        serverName: null,//form 1 repsonses
        serverIp: null,
        modpackVersion: null,
        whitelistRequired: null,
        hidden: null,//form 2 responses do not require saving
    }

    activeForms.push(form);

    return form;
}

function getFormById(id) { return activeForms.find(f => f.id === id); }



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

            const serverName = cleanInput(interaction.options.getString('server_name', true));

            if (serverName.length === 0) {
                return await interaction.reply({
                    content: "Invalid server name provided.",
                    flags: MessageFlags.Ephemeral,
                });
            }

            const timestamp = Math.floor(Date.now() / 1000);

            let containsPending = false;
            modifyKeys.forEach(entry => {
                if (entry.createdAt + 300 < timestamp) {//expire keys after 5 minutes
                    modifyKeys.splice(modifyKeys.indexOf(entry), 1);
                }

                if (entry.serverName === serverName) {
                    containsPending = true;
                    return;
                }
            });
            if (containsPending) {
                return await interaction.reply({
                    content: "A modify request for this server is already pending. \nCheck the panel log for the authentication key.",
                    flags: MessageFlags.Ephemeral,
                });
            }

            const authEntry = createAuthEntry(serverName);

            console.log(`\x1b[34mModify request for server with name ${serverName}.\x1b[0m \nAuthentication key: \x1b[33m${authEntry.authKey}\x1b[0m`);

            interaction.client.submissions_channel.send({
                content: 'Modify request for server with name ' + serverName + '.\nAuthentication key: ' + authEntry.authKey
            });

            const serverRecord = await SERVER_MANAGER.findServer(serverName);

            if (!serverRecord) {
                console.log(`No existing record for server ${serverName} found. A new record will be created.`);
            }

            const part_one = buildServerEditForm(serverRecord, serverName);


            return await interaction.showModal(part_one);

        } else {
            return await interaction.reply({
                content: "You do not have permission to use this command.",
                flags: MessageFlags.Ephemeral,
            });
        }
    },
};

argumentedInteractions.set(PAGE_ONE,
    async (interaction, dirtyFormId) => {

        if (!interaction.isModalSubmit()) {
            console.error("Interaction is not a modal submit!");
            return;
        }
        if (!await USER_MANAGER.isAdmin(interaction.user.id)) {
            return await interaction.reply({
                content: "You do not have permission to use this command.",
                flags: MessageFlags.Ephemeral,
            });
        }

        const formId = cleanIntegerInput(dirtyFormId);
        if (!formId) {
            console.error(`\x1b[31mInvalid form ID:\x1b[0m ${dirtyFormId}`);
            return await interaction.reply({
                content: "An error occurred while processing the form. Invalid form ID.",
                flags: MessageFlags.Ephemeral,
            });
        }

        const form = getFormById(formId);
        if (!form) {
            console.error(`\x1b[31mForm with ID ${formId} not found!`);
            return await interaction.reply({
                content: "An error occurred while processing the form. No form ID found.",
                flags: MessageFlags.Ephemeral,
            });
        }

        let name = cleanInput(interaction.fields.getTextInputValue('name'));
        if (!name || name.length === 0) {
            activeForms.remove(form);
            return await interaction.reply({
                content: "Invalid server name provided.",
                flags: MessageFlags.Ephemeral,
            });
        }

        form.serverName = name;
        form.serverIp = interaction.fields.getTextInputValue('ip');
        form.modpackVersion = interaction.fields.getTextInputValue('modpack_version');
        form.whitelistRequired = interaction.fields.getStringSelectValues('whitelist_required')[0] === 'true';
        form.hidden = interaction.fields.getStringSelectValues('hidden')[0] === 'true';

        await interaction.reply({
            content: "Continue to page 2",
            flags: MessageFlags.Ephemeral,
            components: [
                new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId(`${OPEN_PAGE_TWO}:${formId}`)
                        .setLabel("Next")
                        .setStyle(ButtonStyle.Primary)
                )
            ]
        });

    }
);

argumentedInteractions.set(OPEN_PAGE_TWO,
    async (interaction, dirtyFormId) => {

        if (!interaction.isButton()) {
            console.error("Interaction is not a button!");
            return;
        }

        const formId = cleanIntegerInput(dirtyFormId);
        if (!formId) {
            console.error(`\x1b[31mInvalid form ID:\x1b[0m ${dirtyFormId}`);
            return await interaction.reply({
                content: "An error occurred while processing the form. Invalid form ID.",
                flags: MessageFlags.Ephemeral,
            });
        }

        const form = getFormById(formId);
        if (!form) {
            console.error(`\x1b[31mForm with ID ${formId} not found!`);
            return await interaction.reply({
                content: "An error occurred while processing the form. No form ID found.",
                flags: MessageFlags.Ephemeral,
            });
        }

        return await interaction.showModal(form.page_two);
    }
);

argumentedInteractions.set(PAGE_TWO,
    async (interaction, dirtyFormId) => {

        if (!interaction.isModalSubmit()) {
            console.error("Interaction is not a modal submit!");
            return;
        }
        if (!await USER_MANAGER.isAdmin(interaction.user.id)) {
            return await interaction.reply({
                content: "You do not have permission to use this command.",
                flags: MessageFlags.Ephemeral,
            });
        }

        const formId = cleanIntegerInput(dirtyFormId);
        if (!formId) {
            console.error(`\x1b[31mInvalid form ID:\x1b[0m ${dirtyFormId}`);
            return await interaction.reply({
                content: "An error occurred while processing the form. Invalid form ID.",
                flags: MessageFlags.Ephemeral,
            });
        }

        const form = getFormById(formId);
        if (!form) {
            console.error(`\x1b[31mForm with ID ${formId} not found!`);
            return await interaction.reply({
                content: "An error occurred while processing the form. No form ID found.",
                flags: MessageFlags.Ephemeral,
            });
        }

        const modpack_url = interaction.fields.getTextInputValue('modpack_url');
        const panel_id = interaction.fields.getTextInputValue('panel');
        const mod_loader = interaction.fields.getTextInputValue('mod_loader');
        const minecraft_version = interaction.fields.getTextInputValue('minecraft_version');

        const auth = interaction.fields.getTextInputValue('auth_key');

        const authEntryIndex = modifyKeys.findIndex(entry => entry.authKey === auth);

        if (authEntryIndex === -1) {
            return await interaction.reply({
                content: "Invalid authentication key. Promotion request denied.",
                flags: MessageFlags.Ephemeral,
            });
        }

        const oldServerName = modifyKeys.splice(authEntryIndex, 1)[0].serverName;

        const serverRecord = await SERVER_MANAGER.modifyServer(
            oldServerName,
            form.serverName,
            panel_id,
            form.serverIp,
            modpack_url,
            form.modpackVersion,
            mod_loader,
            minecraft_version,
            form.whitelistRequired,
            form.hidden
        );


        if (!serverRecord) {
            const errmsg = oldServerName ? `Failed to modify server with name ${oldServerName}.` : `Failed to create server with name ${form.serverName}.`;
            console.error(`\x1b[31m${errmsg}\x1b[0m`);
            return await interaction.reply({
                content: errmsg,
                flags: MessageFlags.Ephemeral,
            });
        }

        console.log(`Successfully ${oldServerName ? "modified" : "created"} server with name ${serverRecord.name}.`);
        return await interaction.reply({
            content: `Server with name ${serverRecord.name} has been successfully ${oldServerName ? "modified" : "created"}.`
        });

    }
);

module.exports.argwidgets = argumentedInteractions;
