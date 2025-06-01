export default class {
    constructor(client) {
        this.client = client
        this.name = "debug"
        this.help = ".b debug <on|off|status>"
    };
    async execute(msg, args) {
        console.log(`[DEBUG] ${msg.author.username} (${msg.author.id}) requested debug command`)
        
        const subcommand = args[0]?.toLowerCase()
        
        switch (subcommand) {
            case "on":
                this.client.properties.debug = true
                await this.client.writeMemory()
                return msg.reply("Debug mode enabled.")
                
            case "off":
                this.client.properties.debug = false
                await this.client.writeMemory()
                return msg.reply("Debug mode disabled.")
                
            case "status":
                const status = this.client.properties.debug ? "enabled" : "disabled"
                return msg.reply(`Debug mode is currently ${status}.`)
                
            default:
                return msg.reply("Invalid subcommand. Use `.b debug on`, `.b debug off`, or `.b debug status`.")
        }
    };
}; 