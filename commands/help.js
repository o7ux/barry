export default class {
    constructor(client) {
        this.client = client
        this.name = "help"
        this.help = ".b help [command]"
    };
    async execute(msg, args) {
        console.log(`[HELP] ${msg.author.username} (${msg.author.id}) requested help`)
        
        // If a command name is provided, show specific help for that command
        if (args[0]) {
            const commandName = args[0].toLowerCase()
            const command = this.client.commands[commandName]
            
            if (!command) {
                return msg.reply(`Command \`${commandName}\` not found. Use \`.b help\` to see all available commands.`)
            }
            
            return msg.reply(`**Help for ${commandName}:**\n${command.help}`)
        }
        
        // Otherwise, list all available commands and their help text
        const commandList = Object.values(this.client.commands)
            .map(cmd => `\`${cmd.name}\` - ${cmd.help}`)
            .join('\n')
        
        return msg.reply(
            "**Available Commands:**\n" +
            commandList + "\n\n" +
            "For more details on a specific command, use `.b help [command]`"
        )
    };
}; 