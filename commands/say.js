import { cmdError } from "../classes/errorOverride.js"

export default class {
    constructor(client) {
        this.client = client
        this.name = "say"
        this.type = "dev"
        this.help = ".b say [msg]"
    };
    async execute(msg, args) {
        let noArgs = new cmdError("Invalid arguments", "Please supply an argument.")
        if(!args[0]) throw noArgs;
        await msg.delete()
        msg.channel.send(args.toString().replaceAll(",", " "))
    };
};