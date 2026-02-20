require('dotenv').config();
const { REST, Routes } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');
const TOKEN = process.env.TOKEN;
const SERVER_ID = process.env.SERVER_ID;
const CLIENT_ID = process.env.APPLICATION_ID;
const ADMIN_CLIENT_ID = process.env.ADMIN_APPLICATION_ID;


const commands = new Map();
const widgets = new Map();
const argwidgets = new Map();

const command_json = []

const command_names = [
    "application-form/application-form",
    "who-is",
    "account-lookup",
    "promote",
    "update-server",
    "force-register",
    "update-server/update-server"
];


for (const name of command_names) {
    const command = require(`./commands/${name}.js`);
    commands.set(command.data.name, command);

    command_json.push(command.data.toJSON());

    const command_widgets = command.widgets;
    if (command_widgets) {
        for (const [key, value] of command_widgets) {
            widgets.set(key, value);
        }
    }

    const command_argwidgets = command.argwidgets;
    if (command_argwidgets) {
        for (const [key, value] of command_argwidgets) {
            console.log(`Registering argwidget with key ${key} for command ${name}.`);
            argwidgets.set(key, value);
        }
    }

}


// Construct and prepare an instance of the REST module
const rest = new REST({ version: '10' }).setToken(TOKEN);

// Deploy commands
(async () => {
    try {

        // The put method is used to fully refresh all commands in the guild with the current set
        const data = await rest.put(Routes.applicationGuildCommands(CLIENT_ID, SERVER_ID), { body: command_json });

        console.log(`Successfully reloaded ${data.length} application (/) commands.`);
    } catch (error) {
        // And of course, make sure you catch and log any errors!
        console.error(error);
    }
})();

module.exports = {
    commands,
    widgets,
    argwidgets
}