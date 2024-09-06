import { log } from "../functions/util.js"
import { Cost } from "../classes/cost.js"

export default class {
    constructor(client) {
        this.client = client
        this.name = "restart"
        this.type = "superUser"
        this.help = ".b restart"
    };
    async execute(msg, args) {
        let yesterday = new Date(new Date().getTime() - (24 * 60 * 60 * 1000)).getTime()
        let cost = new Cost(this.client)
        let costTotal = await cost.getSince(yesterday, this.client.cost.log)
        await log(`Restarting... Total cost since 24 hours ago: $${costTotal.toFixed(3)}`, true)
        await msg.reply(`Restarting... Total cost since 24 hours ago: $${costTotal.toFixed(3)}`)
        process.exit()
    };
};