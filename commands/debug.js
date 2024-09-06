import { toggleDebug } from "../index.js"
import { chat } from "../functions/openAI.js"
import { cmdError } from "../classes/errorOverride.js"

export default class {
    constructor(client) {
        this.client = client
        this.name = "debug"
        this.type = "superUser"
        this.help = ".b debug [true|false]"
    };
    async execute(msg, args) {
        let noArgs = new cmdError("Invalid Arguments", "Please supply an argument. [True/False]")
        if (args[0] == undefined) throw noArgs;
        if (args[0].toLowerCase() != "true" && args[0].toLowerCase() != "false") throw noArgs;
        try { toggleDebug(args[0] == "true" ? true : false) } catch (e) { throw new cmdError(e.name, e.message) }
        let msg2send = await chat('Hello!', [""], [""], msg)
        msg.reply(`${msg2send[0]}\n\n ${this.client.debug}`)
    };
};