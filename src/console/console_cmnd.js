const { cleanInput, cleanIntegerInput } = require('../utility/input_cleaners.js');
const { USER_MANAGER } = require('../database/database.js');
const { sendCommand, serverActive } = require('../panel/panel_interface.js');

process.stdin.on("data", async data => {

    try {
        const input = data.toString().trim().split(" ");

        if (input[0] === "promote") {
            const arg = input[1];
            if (!arg) {
                console.log("Usage: promote <discordId>");
                return;
            }

            const dbId = cleanIntegerInput(arg);

            if (!dbId) {
                console.log("Usage: promote <discordId>");
                return;
            }

            const record = await USER_MANAGER.findById(dbId);

            console.log("Promoting user with discordID " + record.discordID);

            if (!record) {
                console.log(`No user with ID ${dbId} found in database! Promotion failed.`);
                return;
            }

            USER_MANAGER.promoteAdmin(dbId, "Admin", record.discordID);

        }

        if (input[0] === "sendCommand") {
            const str = data.toString().trim();
            const firstSpace = str.indexOf(" ");
            const arg = firstSpace === -1 ? "" : str.slice(firstSpace + 1);

            if (!arg) {
                console.log("Usage: sendCommand <command>");
                return;
            }

            console.log("Sending command to basics server");


            await sendCommand("d2db619d", arg);

        }

    } catch (e) {
        console.error(e);
    }


});