import { Cost } from "../classes/cost.js"

export default class {
    constructor(client) {
        this.client = client
        this.name = "cost"
        this.type = "dev"
        this.help = ".b cost (min)"
    };
    async execute(msg, args) {
        try {
            let yesterday = new Date(new Date().getTime() - (24 * 60 * 60 * 1000)).getTime()
            let str = `24 hours ago`
            if (args[0]){
                yesterday = new Date(new Date().getTime() - (parseInt(args[0]) * 60 * 1000)).getTime()
                str = `${args[0]} minutes ago`
            } 
            let cost = new Cost(this.client)
            let costTotal = await cost.getSince(yesterday, this.client.cost.log)
            await msg.reply(`Total cost since ${str}: $${costTotal.toFixed(3)}`)
        } catch (e) {
            await msg.reply(`Invalid argument. ${e.message}`)
        }
    };
};