import { Cost } from "../classes/cost.js"

export default class {
    constructor(client) {
        this.client = client
        this.name = "info"
        this.type = "dev"
        this.help = ".b info"
    };
    async execute(msg, args) {
        let msgArray = []
        let memory = process.memoryUsage().heapUsed / 1024 / 1024
        msgArray.push(`Memory usage: ${memory.toFixed(0)}MB`)
        let count = 0
        Object.keys(this.client.userMemory).forEach(async (key) => {
          Object.keys(this.client.userMemory[key]).forEach(() => {
            count++
          })
        })
        msgArray.push(`User memory size: ${count}`)
      
        let yesterday = new Date(new Date().getTime() - (60 * 60 * 1000)).getTime()
        let cost = new Cost(this.client)
        let costTotal = await cost.getSince(yesterday, this.client.cost.log)
        msgArray.push(`Cost in last hour: $${costTotal.toFixed(3)}`)
        msg.channel.send(msgArray.join("\n"))
    };
};