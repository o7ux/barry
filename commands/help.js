export default class {
    constructor(client) {
        this.client = client
        this.name = "help"
        this.type = "dev"
        this.help = ".b help"
    };
    async execute(msg, args) {
        let Dlines = [`## Dev Commands`]
        let Slines = [`## SuperUser Commands`]
        let Mlines = [`## Moderator Commands`]
        Object.keys(this.client.commands).forEach(function (key) {
            let cmd = this.client.commands[key]
            let message = `**${cmd.help}**`
            if(cmd.type == "dev") Dlines.push(message)
            else if(cmd.type == "superUser") Slines.push(message)
            else if(cmd.type == "moderator") Mlines.push(message)
        }, this)
        let rString = Dlines.join("\n")
        rString += "\n" + Slines.join("\n")
        rString += "\n" + Mlines.join("\n")
        rString += "\n\n*[] required arguments*\n*() optional arguments*"
        msg.channel.send(rString)
    };
};