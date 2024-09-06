import { cmdError } from "../classes/errorOverride.js"
import { setDft, dft } from "../functions/openAI.js"
import per from "../json/personalities.json" assert {type: "json"}
import { chat } from "../functions/openAI.js"

export default class {
    constructor(client) {
        this.client = client
        this.name = "personality"
        this.type = "superUser"
        this.help = ".b personality [name|list|dump]"
    };
    async execute(msg, args) {
        if (!args[0]) throw new cmdError("Invalid arguments", "Please supply an argument.")
        if(args[0] == "dump") return msg.reply(dft.content)

        let returnList = false;
        let ignoreReturn = false;
        let returnString = []

        Object.keys(per).forEach(key => {
            if (key.toString().includes("comment")) return;
            if (args[0] == "list") {
                returnString.push(key.toString())
            } else if (key.toString() == args[0]) {
                let val = per[key]
                try { setDft(val) } catch (e) { msg.reply(e.message)}
                ignoreReturn = true;
            } else returnList = true;
        }, this)

        if(returnList && !ignoreReturn) throw new cmdError("Invalid arguments", "Provided argument does not exist.")
        if(args[0] == "list") return msg.reply(returnString.join("\n"))

        let msg2send = await chat('Hello!', [""], [""], msg)
        msg.reply(msg2send[0])
    };
};