import util from 'util'
import { chunkSubstr } from "../functions/util.js"
import { wipeMemory } from "../functions/memory.js"
import { lastMsgBKG } from "../functions/openAI.js"
import { cmdError } from '../classes/errorOverride.js'

export default class {
    constructor(client) {
        this.client = client
        this.name = "memory"
        this.type = "superUser"
        this.help = ".b memory [wipe|dump|recent]"
    };
    async execute(msg, args) {
        let noArgs = new cmdError("Invalid arguments", "Please supply an argument. [wipe|dump|recent]")
        if (args[0] == undefined) throw noArgs
        if (args[0].toLowerCase() != "dump" && args[0].toLowerCase() != "wipe" && args[0].toLowerCase() != "recent") throw noArgs

        if (args[0] == "dump") {
            let messagesArray = chunkSubstr(util.inspect(this.client.userMemory, { depth: null }), 1800)
            if(messagesArray.length >= 3) await msg.reply("Memory dump is too large.")
            console.log(util.inspect(this.client.userMemory, { depth: null, color: true }))
            messagesArray.forEach(async x => {
                await msg.reply("```" + x + `\nDEBUG = ${this.client.debug}` + "```")
            }, this)
        } else if (args[0] == "wipe") {
            if(args[1]){
                if(this.client.userMemory.hasOwnProperty(args[1])){
                    this.client.userMemory[args[1]] = {}
                    await msg.reply(`Successfully wiped memory for ${args[1]}`)
                } else {
                    await msg.reply(`No memory found for ${args[1]}`)
                }
            } else {
                wipeMemory()
                await msg.reply("```" + util.inspect(this.client.userMemory, { depth: null }) + `\nDEBUG = ${this.client.debug}` + "```")
            }
        } else if (args[0] == "recent") {
            await msg.reply("```" + util.inspect(lastMsgBKG, { depth: null }) + "```")
        }
    };
};