

APPLICATION_MANAGER = require('./managers/application_manager.js');
SERVER_MANAGER = require('./managers/server_manager.js');
USER_MANAGER = require('./managers/user_manager.js');
WHITELIST_MANAGER = require('./managers/whitelist_manager.js');

//setup database
const SCHEMA = require('./schema.js');

(async () => {
    console.log("Initialising database...");
    await SCHEMA.initializeDatabase()
        .then((success) => {
            if (success) {
                console.log("		Database OK.");
            } else {
                console.error("Database initialization failed!");
                process.exit(1);
            }
        })
        .catch((err) => {
            console.error("Error initializing database: " + err);
            process.exit(1);
        }
    );

    USER_MANAGER.collectAdminDiscordIDs();
    SERVER_MANAGER.cacheServers();
    console.log("Database setup complete.");
})();

module.exports = {
    APPLICATION_MANAGER,
    SERVER_MANAGER,
    USER_MANAGER,
    WHITELIST_MANAGER,
    SCHEMA,
}