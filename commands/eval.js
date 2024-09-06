import consts from "../json/config.json" assert {type: "json"}
import util from "util"

export default class {
    constructor(client) {
        this.client = client
        this.name = "eval"
        this.type = "superUser"
        this.help = ".b eval [command]"
    };
    async execute(msg, args) {
        if(!args[0]) return msg.reply("Please provide a command to evaluate.")
        if(msg.author.id != consts.ownerID) return msg.reply("You are not allowed to use this command.")
        
        //eval the command
        let result = await eval(args.join(" "))

        if(result instanceof Promise) result = await result

        console.log(`  [EVAL] ${args.join(" ")}`)
        console.log(`  [EVAL] ${result}`)

        //parse the result
        switch(typeof result) {
            case "string":
                result = util.inspect(result)
                break;
            case "object":
                result = "```json\n" + util.inspect(result, { depth: null }) + "```"
                break;
            case "function":
                result = "[Function: " + result.name + "]"
                break;
            case "undefined":
                result = "undefined"
                break; 
            default:
                result = result.toString()
        }
        result = result.replace(/\n/g, "\n  ")
        
        //send the result
        msg.reply(result)
    };
};