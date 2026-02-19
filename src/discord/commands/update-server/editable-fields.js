const {
    SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder,
    ButtonBuilder, ButtonStyle, ButtonInteraction, ModalBuilder,
    TextInputBuilder, LabelBuilder, TextDisplayBuilder, StringSelectMenuOptionBuilder,
    TextInputStyle, MessageFlags, EmbedBuilder
} = require('discord.js');

const textFieldMap = new Map();
const boolFieldMap = new Map();

const textActionRowOne = new ActionRowBuilder();
const textActionRowTwo = new ActionRowBuilder();
const boolActionRow = new ActionRowBuilder();

function getInteractId(field){
    return `server_edit_${field.id}`;
}

function getModalSubmitId(field){
    return `server_edit_submit_${field.id}`;
}

class Field {
    constructor(id, record, displayTitle, description, defaultValue, buttonText) {
        this.id = id;
        this.record = record;
        this.displayTitle = displayTitle;
        this.description = description;
        this.defaultValue = defaultValue;
        this.buttonText = buttonText;
    }

    getType() { return null }
}
class TextField extends Field {
    constructor(...args) {
        super(...args);
        textFieldMap.set(this.id, this);

        const button = new ButtonBuilder()
						.setCustomId(getInteractId(this))
						.setLabel(this.buttonText)
						.setStyle(ButtonStyle.Secondary);
        
        if(textActionRowOne.components.length < 4){
            textActionRowOne.addComponents(button);
        } else {
            textActionRowTwo.addComponents(button);
        }

    }

    buildModal(initialValue) {
        const value = initialValue || this.defaultValue || "";
        const input = new LabelBuilder()
            .setLabel(this.displayTitle)
            .setDescription(this.description)
            .setTextInputComponent(
                new TextInputBuilder()
                    .setCustomId('value')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true)
                    .setValue(value)
            );

        const modal = new ModalBuilder()
            .setCustomId(getModalSubmitId(this))
            .setTitle(this.displayTitle);

        modal.addLabelComponents(input);
        return modal;
    }

    valueGetter(interaction) {
        interaction.fields.getTextInputValue('value');
    }

    getType() { return 'text' }
}
class BoolField extends Field {
    constructor(...args) {
        super(...args);
        boolFieldMap.set(this.id, this);

        boolActionRow.addComponents(
            new ButtonBuilder()
				.setCustomId(getInteractId(this))
				.setLabel(this.buttonText)
				.setStyle(ButtonStyle.Secondary)
        );
    }
    getType() { return 'bool' }
}

new TextField('server_name', 'name', 'Server Name', 'The name of the server.', '', 'Edit Name');
new TextField('server_ip', 'ipAddress', 'Server IP', 'The IP address of the server.', '.farwater.de', 'Edit IP');
new TextField('server_description', 'description', 'Server Description', 'Do I need to describe descriptions?', 'A Farwater Server', 'Edit Description');
new TextField('modpack_version', 'modpackVersion', 'Modpack Version', 'The version of the modpack.', '1.0.0', 'Edit Pack Version');

new TextField('modpack_url', 'modpackURL', 'Modpack URL', 'The URL of the modpack.', 'https://modrinth.com/modpack/', 'Edit Pack Link');
new TextField('mod_loader', 'modLoader', 'Mod Loader', 'Forge/Fabric/NeoForge/ect', 'Fabric', 'Edit Mod Loader');
new TextField('minecraft_version', 'minecraftVersion', 'Minecraft Version', 'The version of Minecraft the server is running.', '1.21.1', 'Edit MC version');
new TextField('panel_id', 'panelID', 'Panel ID', 'Can be found in the URL of the server panel.', '', 'Edit Panel ID');

new BoolField('whitelist_required', 'whitelistRequired', 'Whitelist Enabled', 'Is the whitelist enabled for this server?', 'true', 'Toggle Whitelist');
new BoolField('server_hidden', 'hidden', 'Hidden from public', 'Is this server hidden for applications and viewing?', 'true', 'Toggle Hidden');


module.exports = {
    textFieldMap,
    boolFieldMap,
    Field,
    getInteractId,
    getModalSubmitId,
    textActionRowOne,
    textActionRowTwo,
    boolActionRow
};