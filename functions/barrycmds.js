import { client } from "../index.js"
import consts from "../json/config.json" assert {type: "json"}

//return true to stop code
async function checkCmds(msg) {
    if (msg.content.startsWith(consts.prefix + " ")) {
        let args = msg.content.split(" "),
            commandName = args[1],
            command = client.commands[commandName.toLowerCase()]

        if(!command || !args[1]) return false;
        args.length >= 2 ? args = args.slice(2, args.length) : args = []

        if (command && (consts.devList.includes(msg.author.id) || consts.superUsers.includes(msg.author.id))) {
            if(command.type == "superUser" && consts.devList.includes(msg.author.id) && !consts.superUsers.includes(msg.author.id) && !consts.modPerms.includes(msg.author.id)) return msg.reply(`you have no perms`)
            if (command.type == "dev" && consts.devList.includes(msg.author.id)) { console.log(`  [CMD] ${msg.author.username} running ${commandName}`); command.execute(msg, args).catch(e => msg.reply(e.message)); return true }
            if (command.type == "superUser" && consts.superUsers.includes(msg.author.id)) { console.log(`  [CMD] ${msg.author.username} running ${commandName}`);command.execute(msg, args).catch(e => msg.reply(e.message)); return true }
            if (command.type == "moderator" && consts.modPerms.includes(msg.author.id)) { console.log(`  [CMD] ${msg.author.username} running ${commandName}`); command.execute(msg, args).catch(e => msg.reply(e.message)); return true }
            return false;
        }
    } else return false;
}

export { checkCmds }