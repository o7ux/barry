import { client } from "../index.js"
import consts from "../json/config.json" assert {type: "json"}

let spamData = {}

//return true to stop
async function antiSpam(msg, lastMsgLog) {

    if(client.debug) return false

    //blacklisted message
    if (client.blacklist.includes(msg.author.id)) {
        if ((Math.floor(Math.random() * (11 - 1)) + 1) != 5) return true;
        let randomgensays = Math.floor(Math.random() * (consts.blacklistResMsg.length - 1)) + 1;
        msg.reply(consts.blacklistResMsg[randomgensays]);
        return true;
    }

    //reject long messages
    if (msg.content.length > consts.longMessageLimit) {
        msg.reply(`come at with a shorter message and we'll talk.`)
        return true;
    }

    //check long repeat
    if (lastMsgLog.slice(0, lastMsgLog.length / 2) == msg.content.slice(0, msg.content.length / 2) ||  //
        lastMsgLog.slice(0, (lastMsgLog.length / 2) - 1) == msg.content.slice(0, (msg.content.length / 2) - 1) ||
        lastMsgLog.slice(0, (lastMsgLog.length / 2) + 1) == msg.content.slice(0, (msg.content.length / 2) + 1) ||
        lastMsgLog.slice((lastMsgLog.length / 2), lastMsgLog.length) == msg.content.slice(msg.content.length / 2, msg.content.length) ||
        lastMsgLog.slice((lastMsgLog.length / 2) - 1, lastMsgLog.length) == msg.content.slice((msg.content.length / 2) - 1, msg.content.length) ||
        lastMsgLog.slice((lastMsgLog.length / 2) + 1, lastMsgLog.length) == msg.content.slice((msg.content.length / 2) + 1, msg.content.length) ||
        msg.content == lastMsgLog) {

        let tempy = spamData[msg.author.id]
        if(tempy == undefined || tempy == null) return false
        if(tempy.length == 0) return false
        let latest = spamData[msg.author.id][0]
        let oldest = spamData[msg.author.id][tempy.length - 1]
        if (oldest + 30 >= latest) return true;
    }

    //check spam
    if ((msg.channel.type == "DM" || msg.content.toLowerCase().includes(consts.name) || msg.content.toLowerCase() == consts.name || msg.content.toLowerCase().slice(0, 5) == consts.name || msg.content.includes(consts.id) || msg.content.includes(`<@${consts.id}>`) || (msg.type == "REPLY" && msg.author.username != 'barry_bot')) && msg.author.username != 'barry_bot') {
        if (client.debug && !consts.devList.includes(msg.author.id)) return true;
        if (client.blacklist.includes(msg.author.id)) return true;
        if (!spamData.hasOwnProperty(msg.author.id)) spamData[msg.author.id] = []
        let dateNow = Date.now().toString()
        spamData[msg.author.id].unshift(Number(dateNow.substring(0, dateNow.length - 3)))
        let tempy = spamData[msg.author.id]
        if (tempy.length >= consts.spamLimit + 1) spamData[msg.author.id].pop()

        let latest = spamData[msg.author.id][0]
        tempy = spamData[msg.author.id]
        let oldest = spamData[msg.author.id][tempy.length - 1]
        if (oldest + consts.spamTimer >= latest && tempy.length >= consts.spamLimit) {
            if (consts.superUsers.includes(msg.author.id)) return false;
            msg.reply(`You have been added to the blacklist.`)
            client.blacklist.push(msg.author.id)
            console.log(`  [SPAM] Added ${msg.author.username} to blacklist, ID: ${msg.author.id}`)
        }
    }

    return false;
}

export { spamData, antiSpam }