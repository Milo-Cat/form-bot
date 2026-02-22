const {
	SlashCommandBuilder, ActionRowBuilder,
	ButtonBuilder, ButtonStyle, MessageFlags, EmbedBuilder,
	UserManager
} = require('discord.js');
require('dotenv').config();
const { cleanInput, cleanIntegerInput } = require('../../../utility/input_cleaners.js');
const {
	buildFullApplication, buildBasicApplication, rejectModal,
	WHITELIST_SUBMIT_ID_FULL, WHITELIST_SUBMIT_ID, REJECT_REASON_ID
} = require('./modal-builders.js');

const {
	USER_MANAGER,
	APPLICATION_MANAGER,
	WHITELIST_MANAGER
} = require('../../cmnd_resources.js').DATABASE;

const SUBMISSION_EMBED = require('./submission-embed.js');
const { SERVER_MANAGER } = require('../../../database/database.js');

const interactions = new Map();
const OPEN_FORM_ID = 'whitelist-open';

const argumentedInteractions = new Map();
const ACCEPT_ID = 'whitelist-accept';
const REJECT_ID = 'whitelist-reject';



module.exports = {
	data: new SlashCommandBuilder().setName('whitelist-apply').setDescription('Opens a server application form'),
	async execute(interaction) {

		return await open_application_form(interaction);

	},
};

async function open_application_form(interaction) {
	const user = await USER_MANAGER.find(interaction.user.id);

	let servers;

	if (USER_MANAGER.isStaff(interaction.user.id)) {
		servers = await SERVER_MANAGER.gatherAppliableServersForStaff(user);
	} else {
		servers = await SERVER_MANAGER.gatherUserAppliableServers(user);
	}

	if (servers.length === 0) {
		//No servers
		return await interaction.reply({
			content: "There are no Servers left for you to apply to!",
			flags: MessageFlags.Ephemeral
		});
	}

	let form;
	if (!user) {
		form = buildFullApplication(user, servers);
	} else {
		form = buildBasicApplication(user, servers);
	}

	return await interaction.showModal(form);
}

interactions.set(OPEN_FORM_ID,
	async (interaction) => {
		return await open_application_form(interaction);
	}
);

interactions.set(WHITELIST_SUBMIT_ID_FULL,
	async (interaction) => {
		if (!interaction.isModalSubmit()) {
			console.error("Interaction is not a modal submit!");
			return;
		}

		await interaction.deferReply({
			content: "Submitting...",
			flags: MessageFlags.Ephemeral,
		});

		const user = interaction.user;
		const member = interaction.member;

		console.log(`Received application from ${user.username} ${member.nickname} (${user.id})`);

		const serverName = interaction.fields.getStringSelectValues('server');
		if (!serverName || serverName.length === 0) {
			return await interaction.followUp({
				content: "Invalid server name provided.",
				flags: MessageFlags.Ephemeral,
			});
		}


		const mc_name = cleanInput(interaction.fields.getTextInputValue('ingameName'));

		const age = cleanIntegerInput(interaction.fields.getTextInputValue('age'));

		if (age === null || isNaN(age)) {
			return await interaction.followUp({
				content: `Invalid Age. <${ageInput}> \nPlease Resubmit Form with a valid age.`,
				flags: MessageFlags.Ephemeral,
			});
		}
		if (age < 13) {
			const embed = SUBMISSION_EMBED.buildAgeWarning(
				member.id,
				mc_name,
				age,
			);

			interaction.client.submissions_channel.send({
				embeds: [embed],
			});

			return await interaction.followUp({
				content: "Discord's Terms of Service require you to be at least 13 years old to use Discord. \nYour application has been rejected and this infraction has been logged.",
				flags: MessageFlags.Ephemeral,
				embeds: [embed],
			});
		}

		const server = await SERVER_MANAGER.findServer(serverName);

		if (!server) {
			return await interaction.followUp({
				content: "Selected server not found.",
				flags: MessageFlags.Ephemeral,
			});
		}

		if (!USER_MANAGER.isStaff(user.id)) {
			const reject = await SERVER_MANAGER.isServerHiddenToUser(server, user.id);
			console.log(reject);
			if (reject) {
				return await interaction.followUp({
					content: "You do not have permission to apply for this server.",
					flags: MessageFlags.Ephemeral,
				});
			}
		}

		const url = new URL(`https://api.ashcon.app/mojang/v2/user/${mc_name}/`);
		const resp = await fetch(url.toString());
		if (!resp.ok) {
			return await interaction.followUp({
				content: `Could not find a MC account with the name ${mc_name}.`,
				flags: MessageFlags.Ephemeral,
			});
		}
		const data = await resp.json();
		const uuid = data.uuid;


		const usedName = member.nickname ? member.nickname : user.username;

		let record;
		try {
			record = await USER_MANAGER.getOrCreate(
				usedName,
				user.id,
				age,
				"EMAIL PLACEHOLDER", //TODO: add email input to form
				uuid,
				mc_name
			);
			record.id;

		} catch (e) {
			console.error(`Error retreiving user record: ` + e);
			return await interaction.followUp({
				content: `An error occurred while creating your user record.`,
				flags: MessageFlags.Ephemeral,
			});
		}

		let submittedApplication;

		try {

			submittedApplication = await APPLICATION_MANAGER.submit(
				usedName,
				record.id,
				server.id,
				age,
				"REASON PLACEHOLDER", //TODO: add reason input to form. If we want it.
			);

			if (!submittedApplication) {
				return await interaction.followUp({
					content: `You already have a pending or approved application for this server!`,
					flags: MessageFlags.Ephemeral,
				});
			}

			submittedApplication.id;

		} catch (e) {
			console.error(`Error creating logging: ` + e);
			return await interaction.followUp({
				content: `An error occurred while creating your profile/application. \nPlease try again later or contact a staff member.`,
				flags: MessageFlags.Ephemeral,
			});
		}



		const embed = SUBMISSION_EMBED.buildSubmission(
			server,
			member.id,
			mc_name,
			record.age,
			uuid,
		);


		const sentMessage = await interaction.client.submissions_channel.send({
			embeds: [embed],
			components: [
				new ActionRowBuilder().addComponents(
					new ButtonBuilder()
						.setCustomId(ACCEPT_ID + ':' + submittedApplication.id)
						.setLabel('ACCEPT')
						.setStyle(ButtonStyle.Primary),
					new ButtonBuilder()
						.setCustomId(REJECT_ID + ':' + submittedApplication.id)
						.setLabel('REJECT')
						.setStyle(ButtonStyle.Secondary)
				)
			]
		});

		submittedApplication.messageID = sentMessage.id;
		await submittedApplication.save();

		interaction.followUp({
			content: "Application submitted!",
			flags: MessageFlags.Ephemeral,
			embeds: [embed],
		});

	}
);

//basic application for pre-registered users.
interactions.set(WHITELIST_SUBMIT_ID,
	async (interaction) => {

		if (!interaction.isModalSubmit()) {
			console.error("Interaction is not a modal submit!");
			return;
		}

		await interaction.deferReply({
			content: "Submitting...",
			flags: MessageFlags.Ephemeral,
		});

		const user = interaction.user;
		const member = interaction.member;

		console.log(`Received basic application from ${user.username} ${member.nickname} (${user.id})`);

		const serverName = cleanInput(interaction.fields.getStringSelectValues('server').toString().trim());
		if (!serverName || serverName.length === 0) {
			return await interaction.followUp({
				content: "Invalid server name provided.",
				flags: MessageFlags.Ephemeral,
			});
		}

		const server = await SERVER_MANAGER.findServer(serverName);

		if (!server) {
			return await interaction.followUp({
				content: "Selected server not found.",
				flags: MessageFlags.Ephemeral,
			});
		}

		if (!USER_MANAGER.isStaff(user.id)) {
			const rejec = await SERVER_MANAGER.isServerHiddenToUser(server, user.id);
			console.log(`somthn ${rejec}`);
			if (rejec) {
				return await interaction.followUp({
					content: "You do not have permission to apply for this server.",
					flags: MessageFlags.Ephemeral,
				});
			}
		}

		let record;
		try {
			record = await USER_MANAGER.find(
				user.id
			);

			if (!record) {
				throw new Error("User record not found for user " + user.name + " with ID " + user.id);
			}

		} catch (e) {
			console.error(`Error retreiving user record: ` + e);
			return await interaction.followUp({
				content: `An error occurred while retreving your user record. \nPlease try again later or contact a staff member.`,
				flags: MessageFlags.Ephemeral,
			});
		}


		const uuid = record.uuid;


		let submittedApplication;
		try {

			console.log("User applied to " + server.name);

			submittedApplication = await APPLICATION_MANAGER.submit(
				record.name,
				record.id,
				server.id,
				record.age,
				"REASON PLACEHOLDER", //TODO: add reason input to form. If we want it.
			);

			if (!submittedApplication) {
				return await interaction.followUp({
					content: `You already have a pending or approved application for this server!`,
					flags: MessageFlags.Ephemeral,
				});
			}

			submittedApplication.id;

		} catch (e) {
			console.error(`\x1b[31mError creating application: \x1b[0m` + e);
			return await interaction.followUp({
				content: `An error occurred while creating your application. \nPlease try again later or contact a staff member.`,
				flags: MessageFlags.Ephemeral,
			});
		}



		const embed = SUBMISSION_EMBED.buildSubmission(
			server,
			user.id,
			record.mcName,
			record.age,
			record.mcUuid,
		);


		const sentMessage = await interaction.client.submissions_channel.send({
			embeds: [embed],
			components: [
				new ActionRowBuilder().addComponents(
					new ButtonBuilder()
						.setCustomId(ACCEPT_ID + ':' + submittedApplication.id)
						.setLabel('ACCEPT')
						.setStyle(ButtonStyle.Primary),
					new ButtonBuilder()
						.setCustomId(REJECT_ID + ':' + submittedApplication.id)
						.setLabel('REJECT')
						.setStyle(ButtonStyle.Secondary)
				)
			]
		});

		submittedApplication.messageID = sentMessage.id;
		await submittedApplication.save();

		interaction.followUp({
			content: "Application submitted!",
			flags: MessageFlags.Ephemeral,
			embeds: [embed],
		});

	}
);

module.exports.widgets = interactions;


async function sendUserMessage(application, interaction, message) {
	const discordRec = await USER_MANAGER.findById(application.userID);

	const serverRec = await SERVER_MANAGER.findServerByID(application.serverID);

	const discordUser = await interaction.client.users.fetch(discordRec.discordID);

	await discordUser.send(`Your whitelist application to ${serverRec.title} has been ${message}`);

}

argumentedInteractions.set(ACCEPT_ID,
	async (interaction, id) => {

		const reviewerId = interaction.user.id;
		const admin = await USER_MANAGER.findAdmin(reviewerId);

		if (!admin) {
			return await interaction.reply({
				content: `You must be staff to do this!`,
				flags: MessageFlags.Ephemeral,
			});
		}


		const cleanID = cleanIntegerInput(id);

		if (cleanID === null || isNaN(cleanID)) {
			console.error(`\x1b[31mInvalid application ID:\x1b[0m ${id}`);
			return await interaction.reply({
				content: `Invalid application ID`,
				flags: MessageFlags.Ephemeral,
			});
		}


		const application = await APPLICATION_MANAGER.update(cleanID, false, null, admin.id);

		if (!application) {
			const error = `Failed to find whitelist application from id ${cleanID}`;
			console.error(error);
			return await interaction.reply({
				content: error,
			});
		}

		const message = await interaction.client.submissions_channel.messages.fetch(application.messageID);

		const oldEmbed = message.embeds[0];
		const embed = EmbedBuilder.from(oldEmbed)
			.setColor('#00c410')
			.setFields(
				...oldEmbed.fields,
				{ name: 'Reviewed By', value: `<@${reviewerId}>` }
			);

		await message.edit({
			components: [],
			embeds: [embed],
		});


		const whitelistEntry = await WHITELIST_MANAGER.submit(application.userID, application.serverID);

		if (whitelistEntry) {
			//SUCCESS
			const msg = await interaction.reply({ content: `Application approved!`, flags: MessageFlags.SuppressNotifications });
			await msg.delete();

			await sendUserMessage(application, interaction, "approved!");

			await SERVER_MANAGER.attemptWhitelist();
			
			return;
		};


		const error = `Failed to create whitelist entry for user ${application.userID} on server ${application.serverID}`;
		console.error(error);
		return await interaction.reply({
			content: error,
		});
	}
);
argumentedInteractions.set(REJECT_ID,
	async (interaction, id) => {

		const reviewerId = interaction.user.id;
		const admin = await USER_MANAGER.findAdmin(reviewerId);
		if (!admin) {
			return await interaction.reply({
				content: `You must be staff to do this!`,
				flags: MessageFlags.Ephemeral,
			});
		}

		const cleanID = cleanIntegerInput(id);

		if (cleanID === null || isNaN(cleanID)) {
			console.error(`\x1b[31mInvalid application ID:\x1b[0m ${id}`);
			return await interaction.reply({
				content: `Invalid application ID`,
				flags: MessageFlags.Ephemeral,
			});
		}

		const input = rejectModal.setCustomId(REJECT_REASON_ID + ":" + cleanID);

		await interaction.showModal(input);

	}
);
argumentedInteractions.set(REJECT_REASON_ID,
	async (interaction, id) => {

		const reviewerId = interaction.user.id;
		const admin = await USER_MANAGER.findAdmin(reviewerId);

		if (!admin) {
			return await interaction.reply({
				content: `You must be staff to do this!`,
				flags: MessageFlags.Ephemeral,
			});
		}

		const cleanID = cleanIntegerInput(id);

		if (cleanID === null || isNaN(cleanID)) {
			console.error(`\x1b[31mInvalid application ID:\x1b[0m ${id}`);
			return await interaction.reply({
				content: `Invalid application ID`,
				flags: MessageFlags.Ephemeral,
			});
		}


		let reason = interaction.fields.getTextInputValue('reason');

		if(!reason || reason.length === 0){
			reason = "No reason provided";
		}

		const application = await APPLICATION_MANAGER.update(cleanID, true, reason, admin.id);

		if (!application) return;

		const message = await interaction.client.submissions_channel.messages.fetch(application.messageID);


		const oldEmbed = message.embeds[0];
		const embed = EmbedBuilder.from(oldEmbed)
			.setColor('#e63a10')
			.setFields(
				...oldEmbed.fields,
				{ name: 'Reviewed By', value: `<@${reviewerId}>` },
				{ name: 'Rejection Reason', value: reason }
			);

		await message.edit({
			components: [],
			embeds: [embed],
		});

		const statusResponse = await interaction.reply({
			content: `Application ${id} Rejected!`,
		});

		await statusResponse.delete();
		

		await sendUserMessage(application, interaction, `rejected!\nReason: ${reason}`);

	}
);

module.exports.argwidgets = argumentedInteractions;


/*
module.exports = {
	data2: new ButtonInteraction().setName('whitelist-apply').setDescription('Replies with Pong!'),
	async execute(interaction) {
		await interaction.reply({
			content: "Choose an option and/or open the form:",
			components: [
				new ActionRowBuilder().addComponents(
					new StringSelectMenuBuilder()
						.setCustomId('my_dropdown')
						.setPlaceholder('Select something')
						.addOptions([
							{ label: 'Option A', value: 'A' },
							{ label: 'Option B', value: 'B' }
						])
				),
				new ActionRowBuilder().addComponents(
					new ButtonBuilder()
						.setCustomId('open_modal')
						.setLabel('Open Form')
						.setStyle(ButtonStyle.Primary)
				)
			]
		});


	},
};
*/