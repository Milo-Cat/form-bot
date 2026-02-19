
const { Client, Events, GatewayIntentBits, MessageFlags } = require('discord.js');

const TOKEN = process.env.TOKEN;
const SERVER_ID = process.env.SERVER_ID;
const CHANNEL_ID = process.env.CHANNEL_ID;
const CLIENT_ID = process.env.APPLICATION_ID;
const SUBMISSIONS_CHANNEL_ID = process.env.SUBMISSIONS_CHANNEL_ID;


console.log("Setting up Discord client...");
console.log("Logging in...");
const client = new Client({ intents: [GatewayIntentBits.Guilds] });
client.login(TOKEN);



console.log("Registering Commands...");
//command registery and widget registery
const registery = require('./commands.js');//gather commands and widgets. Also registers commands with guild.

client.commands = new Map();
registery.commands.forEach((command) => {
    client.commands.set(command.data.name, command);
});



//ready event
client.on(Events.ClientReady, async (readyClient) => {
    console.log(`Discord Ready! Logged in as ${readyClient.user.tag}`);

    const guild = await client.guilds.fetch(SERVER_ID);

    client.submissions_channel = await guild.channels.fetch(SUBMISSIONS_CHANNEL_ID);
});


//commands and interactions(widgets) handling
client.on(Events.InteractionCreate, async (interaction) => {

    if (!interaction.inGuild() || interaction.guildId !== SERVER_ID) {
        return interaction.reply({
            content: "This command can only be used in the Farwater server!",
            flags: MessageFlags.Ephemeral,
        });
    }

    let commandResponse = {
        success: false,
        message: ""
    }

    if (interaction.isCommand()) {
        commandResponse = await handleCommand(interaction, commandResponse);
    } else if (interaction.customId.includes(":")) {
        //console.log("Interaction is an ARGwidget. Custom ID: " + interaction.customId);
        commandResponse = handleArgWidget(interaction, commandResponse);
    } else {
        commandResponse = handleWidget(interaction, commandResponse);
    }

    if (commandResponse.success) return;

    console.error(`Command/Interaction failure: ${commandResponse.message}`);
    console.error(commandResponse);

});



const discordErrorMessageGeneric =
{
    content: 'There was an error while executing this command!',
    flags: MessageFlags.Ephemeral,
};

async function respondWithError(interaction) {
    if (interaction.replied || interaction.deferred) {
        await interaction.followUp(discordErrorMessageGeneric);
    } else {
        await interaction.reply(discordErrorMessageGeneric);
    }
}

async function handleArgWidget(interaction, commandResponse) {

    const [baseID, arg] = interaction.customId.split(":");
    //console.log(`Base ID: ${baseID}, Arg: ${arg}`);
    const argwidget = registery.argwidgets.get(baseID);

    if (!argwidget) {
        //console.log(`No widget found for base ID ${baseID}.`);
        commandResponse.message = `No Arg-widget found for base ID ${baseID}.`;
        return commandResponse;
    }
    try {
        await argwidget(interaction, arg);
        commandResponse.success = true;
    } catch (error) {
        commandResponse.message = error;
        respondWithError(interaction);
    }
    return commandResponse;
}

async function handleWidget(interaction, commandResponse) {

    const widget = registery.widgets.get(interaction.customId);

    if (widget) {
        //console.log("Interaction is a widget. Custom ID: " + interaction.customId);
        try {
            await widget(interaction);
            commandResponse.success = true;
        } catch (error) {
            console.log(error);
            commandResponse.message = error;
            respondWithError(interaction);
        }
    } else {
        commandResponse.message = `No widget found for custom ID ${interaction.customId}.`;
    }

    return commandResponse;
}

async function handleCommand(interaction, commandResponse) {

    const command = interaction.client.commands.get(interaction.commandName);

    if (!command) {
        commandResponse.message = `No command matching ${interaction.commandName} was found.`;
        return commandResponse;
    }

    try {
        await command.execute(interaction);
        commandResponse.success = true;
    } catch (error) {
        commandResponse.message = error;
        respondWithError(interaction);
    }
    return commandResponse;
}