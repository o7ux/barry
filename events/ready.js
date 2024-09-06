import {log} from "../functions/util.js"
import consts from "../json/config.json" assert {type: "json"}

export default class {
    constructor(client) {
        this.client = client;
    }
    async execute() {
        this.client.user.setStatus("idle")
        this.client.user.setActivity("as a human", {
            type: "PLAYING"
        })
        log(`  [AI] ${consts.name} Initiated\n`, true)
        this.client.checkMemory()
    }
}