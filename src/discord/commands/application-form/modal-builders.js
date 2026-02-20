const {
	SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder,
	ButtonBuilder, ButtonStyle, ButtonInteraction, ModalBuilder,
	TextInputBuilder, LabelBuilder, TextDisplayBuilder, StringSelectMenuOptionBuilder,
	TextInputStyle, MessageFlags, EmbedBuilder
} = require('discord.js');
const {
	SERVER_MANAGER,
} = require('../../cmnd_resources.js').DATABASE;

const WHITELIST_SUBMIT_ID_FULL = 'whitelist-submit-full';
const WHITELIST_SUBMIT_ID = 'whitelist-submit';
const REJECT_REASON_ID = 'whitelist-reject-reason';


const ingameName = new TextInputBuilder()
	.setCustomId('ingameName')
	.setStyle(TextInputStyle.Short)
	.setRequired(true);

const age = new TextInputBuilder()
	.setCustomId('age')
	.setStyle(TextInputStyle.Short)
	.setMaxLength(2)
	.setRequired(true);


const ingameNameLabel = new LabelBuilder()
	.setLabel('What is your ingame name?')
	.setDescription('Your Minecraft username')
	.setTextInputComponent(ingameName);

const ageLabel = new LabelBuilder()
	.setLabel('How old are you?')
	.setDescription('Age in years.')
	.setTextInputComponent(age);


const text = new TextDisplayBuilder().setContent(
	'Text that could not fit in to a label or description\n-# Markdown can also be used',
);

function buildServerSelectOptionsLabel(servers) {
	const options = [];

	for (const server of servers) {
		options.push(
			new StringSelectMenuOptionBuilder()
				.setLabel(server.title)
				.setDescription(server.description || "...")
				.setValue(server.name)
		);
	}

	const serverSelect = new StringSelectMenuBuilder()
		.setCustomId('server')
		.setPlaceholder('Select the server you want to join')
		.setRequired(true)
		.addOptions(
			...options
		);
	
	return new LabelBuilder()
		.setLabel("Which server do you want to join?")
		.setStringSelectMenuComponent(serverSelect);
}
function buildFullApplication(user, servers) {

	const serverSelectLabel = buildServerSelectOptionsLabel(servers);

	const fullApplication = new ModalBuilder().setCustomId(WHITELIST_SUBMIT_ID_FULL).setTitle('Apply!');

	fullApplication.addLabelComponents(ingameNameLabel, serverSelectLabel, ageLabel)
		.addTextDisplayComponents(text);
	return fullApplication;
}


function buildBasicApplication(user, servers) {

	const serverSelectLabel = buildServerSelectOptionsLabel(servers);

	const userInfo = new TextDisplayBuilder().setContent(

		`# Welcome back ${user.name}!
   **Ingame Name:**
${user.mcName}

   **Age:**
${user.age}`

	);

	return new ModalBuilder()
		.setCustomId(WHITELIST_SUBMIT_ID).setTitle('Apply!')
		.addTextDisplayComponents(userInfo)
		.addLabelComponents(serverSelectLabel)
		.addTextDisplayComponents(text);

}

const rejectModal = new ModalBuilder().setCustomId(REJECT_REASON_ID).setTitle('Reject Reason');
rejectModal.addLabelComponents(
	new LabelBuilder()
		.setLabel('Reason for rejection (optional)')
		.setDescription('This reason will be shown to the applicant and logged for staff reference.')
		.setTextInputComponent(
			new TextInputBuilder()
				.setCustomId('reason')
				.setStyle(TextInputStyle.Paragraph)
				.setRequired(false)
		)
);

module.exports = {
	buildFullApplication: buildFullApplication,
	buildBasicApplication: buildBasicApplication,
	rejectModal: rejectModal,
	WHITELIST_SUBMIT_ID_FULL,
	WHITELIST_SUBMIT_ID,
}