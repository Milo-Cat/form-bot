const crypto = require('crypto');

const timestamp = function timestamp() { return Math.floor(Date.now() / 1000) }

module.exports.timestamp = timestamp;

class Panel {
    constructor(serverName, userID, server, fieldStates) {
        this.serverName = serverName;
        this.userID = userID;
        this.authKey = crypto.randomBytes(8).toString('hex');
        this.closesAt = timestamp() + (10 * 60);//give panels a lifetime of 10min
        this.message = null;//assign later
        this.server = server;
        this.fieldStates = fieldStates;
    }

    getState(stateID) {
        return this.fieldStates.find(state => state.field.id === stateID) || null;
    }
}

const activePanels = [];
module.exports.initialiseEditor = (serverName, userID, server, fieldStates) => {
    console.log("\x1b[31mInitialising a Panel\x1b[0m");
    const panel = new Panel(serverName, userID, server, fieldStates);
    activePanels.push(panel);
    return panel;
}


module.exports.findPanel = (userID) => {
    return activePanels.find(panel => panel.userID === userID) || null;
}


module.exports.cleanOldPanels = () => {

    const now = timestamp();

    const oldPanels = [];

    for (let i = activePanels.length - 1; i >= 0; i--) {
        const panel = activePanels[i];
        if (now > panel.closesAt) {
            activePanels.splice(i, 1);
            oldPanels.push(panel);
        }
    }

    return oldPanels;
}

module.exports.removePanel = (panel) => {
    const index = activePanels.indexOf(panel);
    if (index !== -1) {
        activePanels.splice(index, 1);
    }
}