import util from 'util'
import { spamData } from '../functions/antispam.js'
import { cmdError } from '../classes/errorOverride.js'

export default class {
    constructor(client) {
        this.client = client
        this.name = "spamdata"
        this.type = "dev"
        this.help = ".b spamdata"
    };
    async execute(msg, args) {
        let noData = new cmdError("No Spamdata", "Spam data is empty.")
        if(!spamData) throw noData;
        if (Object.keys(spamData).length == 0) throw noData
        await msg.reply("```" + util.inspect(spamData, { depth: null }) + `\nLATEST: ${spamData[msg.author.id][0]}\nOLDEST: ${spamData[msg.author.id][spamData[msg.author.id].length - 1]}\n\n` + `\nDEBUG = ${this.client.debug}` + "```")
    };
};