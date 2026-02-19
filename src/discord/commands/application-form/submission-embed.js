const {
    EmbedBuilder
} = require('discord.js');


module.exports.buildSubmission = (server, serverId, discord, game_name, age, game_uuid) => {
    return new EmbedBuilder()
        .setColor('#1539da')
        .setTitle('Whitelist Application')
        .addFields(
            { name: 'Server', value: `${serverId}:${server}` },
            { name: 'Discord', value: `<@!${discord}>` },
            { name: 'Ingame Name', value: `${game_name}` },
            { name: 'Age', value: `${age}` },
            { name: 'Game UUID', value: `${game_uuid}` }
        )
        .setThumbnail(`https://mc-heads.net/Head/${game_uuid}`)
        .setImage(`https://mc-heads.net/body/${game_uuid}/100`);
}

module.exports.buildAgeWarning = (discord, game_uuid, age) => {
    return new EmbedBuilder()
        .setColor('#e63a10')
        .setTitle('Underaged User Warning!')
        .addFields(
            { name: 'Age', value: `${age}` },
            { name: 'Discord', value: `<@${discord}>` },
            { name: 'Game UUID', value: `${game_uuid}` },
        )
        .setThumbnail(`:exclamation:`);
}