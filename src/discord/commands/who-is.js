const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const UTILITY = require('../cmnd_resources.js');
const { USER_MANAGER } = UTILITY.DATABASE;
const { cleanInput } = UTILITY.CLEANERS;

const timedOutUsers = [];

module.exports = {
	data: new SlashCommandBuilder()
		.setName('who-is')
		.setDescription('Look up a user')
		.addSubcommand(sub =>
			sub.setName('discord')
				.setDescription('Look up a user by Discord account')
				.addUserOption(opt =>
					opt.setName('user')
						.setDescription('The Discord user to look up')
						.setRequired(true)
				)
		)
		.addSubcommand(sub =>
			sub.setName('mc_name')
				.setDescription('Look up a user by Minecraft username')
				.addStringOption(opt =>
					opt.setName('username')
						.setDescription('The Minecraft username')
						.setRequired(true)
				)
		),

	async execute(interaction) {

		const activatorId = interaction.user.id;

		if (!USER_MANAGER.isStaff(activatorId)) {

			const existing = timedOutUsers.find(k => k.id === activatorId);

			const now = Math.floor(Date.now() / 1000);

			if (existing) {
				if (existing.time + 7 > now) {
					return interaction.reply({
						content: "You are on cooldown for this command.",
						ephemeral: true
					});
				}
				existing.time = now;

			} else {

				const key = {
					id: activatorId,
					time: now
				};
				timedOutUsers.push(key);
			}
		}

		const sub = interaction.options.getSubcommand();

		let USER;
		if (sub === 'discord') {
			USER = await USER_MANAGER.find(interaction.options.getUser('user').id);
		}

		if (sub === 'mc_name') {
			const username = cleanInput(interaction.options.getString('username'));
			if (!username) {
				return interaction.reply({ content: "Invalid Minecraft username provided.", ephemeral: true });
			}
			USER = await USER_MANAGER.findByGameName(username);
		}

		if (!USER) {
			return interaction.reply({ content: "User not found.", ephemeral: true });
		}

		const embed = new EmbedBuilder()
			.setColor('#263669')
			.setTitle(USER.name)
			.addFields(
				{ name: 'Discord', value: `<@!${USER.discordID}>` },
				{ name: 'Ingame Name', value: `${USER.mcName}` }
			)
			.setThumbnail(`https://mc-heads.net/Head/${USER.mcUuid}`)
			.setImage(`https://mc-heads.net/body/${USER.mcUuid}/100`);

		return interaction.reply({ embeds: [embed] });
	}
};
