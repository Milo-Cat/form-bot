const { SlashCommandBuilder, MessageFlags, EmbedBuilder } = require('discord.js');
const UTILITY = require('../cmnd_resources.js');
const { USER_MANAGER } = UTILITY.DATABASE;
const { cleanInput, cleanIntegerInput } = UTILITY.CLEANERS;

module.exports = {
	data: new SlashCommandBuilder()
		.setName('force-register')
				.setDescription('manually register a user')
				.addUserOption(opt =>
					opt.setName('user')
						.setDescription('User to sign up')
						.setRequired(true)
				)
				.addStringOption(opt =>
					opt.setName('age')
						.setDescription('Users age')
						.setRequired(true)
				)
				.addStringOption(opt =>
					opt.setName('mc_name')
						.setDescription('Minecraft username')
						.setRequired(true)
				),

	async execute(interaction) {

		if (await USER_MANAGER.isAdmin(interaction.user.id)) {

		const user = interaction.options.getUser('user');
		const age = cleanIntegerInput(interaction.options.getString('age'));
		const mc_name = cleanInput(interaction.options.getString('mc_name'));

		if(!age) {
			return await interaction.reply({
				content: "Invalid age provided.",
				flags: MessageFlags.Ephemeral,
			});
		}

		if(!mc_name) {
			return await interaction.reply({
				content: "Invalid Minecraft username provided.",
				flags: MessageFlags.Ephemeral,
			});
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
		if (!uuid) {
			return await interaction.followUp({
				content: `Could not find a MC account with the name ${mc_name}.`,
				flags: MessageFlags.Ephemeral,
			});
		}

		
		let record;
		try {
			record = await USER_MANAGER.getOrCreate(
				user.username,
				user.id,
				age,
				"EMAIL PLACEHOLDER", //TODO: add email input to form
				uuid,
				mc_name
			);


			record.id;

		} catch (e) {
			console.error(`Error creating logging: ` + e);
			return await interaction.followUp({
				content: `An error occurred while registering user.`,
				flags: MessageFlags.Ephemeral,
			});
		}

		return await interaction.reply({
				embeds: [new EmbedBuilder().setColor('#1539da')
								.setTitle(`User registered successfully!`)
								.addFields(
            						{ name: 'Discord', value: `<@${user.id}>` },
									{ name: 'MC Name', value: `${mc_name}` },
            						{ name: 'MC UUID', value: `${uuid}` },
									{ name: 'Age', value: `${age}` },
        				)],
				flags: MessageFlags.SuppressNotifications,
			});

		} else {
			return await interaction.reply({
				content: "You do not have permission to use this command.",
				flags: MessageFlags.Ephemeral,
			});
		}
	}
};
