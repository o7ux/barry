import { client } from "../index.js"
import consts from "../json/config.json" assert {type: "json"}

async function grabLastMemory(userId) {
    if (client.userMemory.hasOwnProperty(userId)) {
        if (!client.userMemory[userId].lastAI || !client.userMemory[userId].lastUser) client.userMemory[userId] = {
            lastAI: [""],
            lastUser: [""],
            timeStamp: [Date.now()]
        }        
        let tempy = client.userMemory[userId].lastUser
        if (tempy.length > consts.messageHistoryLength) client.userMemory[userId].lastUser.splice(0, 1)
        tempy = client.userMemory[userId].lastAI
        if (tempy.length > consts.messageHistoryLength) client.userMemory[userId].lastAI.splice(0, 1)
        return client.userMemory[userId];
    } else {
        client.userMemory[userId] = {
            lastAI: [""],
            lastUser: [""],
            timeStamp: [Date.now()]
        }
        return client.userMemory[userId];
    }
}

const shouldWipeMemory = false;

async function writeLastMemory(userId, lastUser2, lastAI2) {
    if (client.userMemory[userId].hasOwnProperty("timeStamp")) {
        if (Math.abs(client.userMemory[userId].timeStamp[0]-Date.now()) > (24*60*60*1000) && shouldWipeMemory) {
            console.log("  [AI] Memory is older than 24 hours, wiping memory.")
            client.userMemory[userId] = {
                lastAI: [""],
                lastUser: [""],
                timeStamp: [Date.now()]
            }            
            client.userMemory[userId].lastUser.push(lastUser2)
            client.userMemory[userId].lastAI.push(lastAI2)
            client.userMemory[userId].timeStamp.push(Date.now())
            return;
        }
        client.userMemory[userId].lastUser.push(lastUser2)
        client.userMemory[userId].lastAI.push(lastAI2)
        client.userMemory[userId].timeStamp.push(Date.now())
        return;
    } else {
        client.userMemory[userId] = {
            lastAI: [""],
            lastUser: [""],
            timeStamp: [Date.now()]
        }
        
        client.userMemory[userId].lastUser.push(lastUser2)
        client.userMemory[userId].lastAI.push(lastAI2)
        client.userMemory[userId].timeStamp.push(Date.now())
        return;
    }
}

function wipeMemory() {
    client.userMemory = {}
}

export { writeLastMemory, grabLastMemory, wipeMemory}
