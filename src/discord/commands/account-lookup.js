const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder().setName('lookup-mc-account')
    .setDescription('Finds the Minecraft account of an associated Minecraft username')
    .addStringOption(option =>
        option.setName('mc_name')
            .setDescription('The Minecraft name to search for')
            .setRequired(true)),

	async execute(interaction) {
		// interaction.user is the object representing the User who ran the command
		// interaction.member is the GuildMember object, which represents the user in the specific guild

        const mc_name = interaction.options.getString('mc_name', true);
        const url = new URL(`https://api.ashcon.app/mojang/v2/user/${mc_name}/`);
        const resp = await fetch(url.toString());
        if (!resp.ok) {
            return await interaction.reply({
                content: `Could not find a user with the name ${mc_name}.`,
                flags: MessageFlags.Ephemeral,
            });
        }
        const data = await resp.json();
        const uuid = data.uuid;
        if (!uuid) {
            return await interaction.reply({
                content: `Could not find a user with the name ${mc_name}.`,
                flags: MessageFlags.Ephemeral,
            });
        }

        const embed = new EmbedBuilder()
                .setColor('#1539da')
                .setTitle(mc_name)
                .addFields(
                    { name: 'UUID', value: `${uuid}` },
                )
                .setThumbnail(`https://mc-heads.net/Head/${uuid}`)
                .setImage(`https://mc-heads.net/body/${uuid}/100`);

        await interaction.reply({
            embeds: [embed],
            flags: MessageFlags.Ephemeral,
        });
    },
};