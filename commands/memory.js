export default class {
    constructor(client) {
        this.client = client
        this.name = "memory"
        this.help = ".b memory <clear|wipe|list|stats|help>"
    };
    async execute(msg, args) {
        console.log(`[MEMORY] ${msg.author.username} (${msg.author.id}) requested memory`)
        
        const subcommand = args[0]?.toLowerCase()
        
        switch (subcommand) {
            case "clear":
                if(!args[1]) return msg.reply("Please specify a user to clear memory for. Expected format: `.b memory clear <userID>`")

                if(!this.client.userMemory.memory[args[1]]) return msg.reply("User not found in memory. Expected format: `.b memory clear <userID>`")

                await this.client.userMemory.clearMemory(args[1])
                await this.client.writeMemory()
                return msg.reply(`Memory cleared for user ${args[1]}.`)
                
            case "wipe":
                await this.client.userMemory.clearAllMemory()
                await this.client.writeMemory()
                return msg.reply("All memory wiped.")
                
            case "stats":
                if(!args[1]) return msg.reply("Please specify a user to show stats for. Expected format: `.b memory stats <userID|all>`")
                
                if(args[1] === "all"){
                    let allMemory = this.client.userMemory.memory
                    let statsText = []
                    
                    for(const userId in allMemory) {
                        const stats = await this.client.userMemory.getMemoryStats(userId)
                        statsText.push(`${userId}: ${stats.totalMessages} total (${stats.userMessages} user, ${stats.assistantMessages} assistant)`)
                    }
                    
                    return msg.reply(`**Memory Stats:**\n\`\`\`${statsText.join("\n")}\`\`\``)
                }
                
                if(!this.client.userMemory.memory[args[1]]) return msg.reply("User not found in memory.")
                
                const stats = await this.client.userMemory.getMemoryStats(args[1])
                const firstTimestamp = stats.firstMessage ? new Date(stats.firstMessage.timestamp).toLocaleString() : "N/A"
                const lastTimestamp = stats.lastMessage ? new Date(stats.lastMessage.timestamp).toLocaleString() : "N/A"
                
                return msg.reply(
                    `**Memory Stats for ${args[1]}:**\n\`\`\`` +
                    `Total Messages: ${stats.totalMessages}\n` +
                    `User Messages: ${stats.userMessages}\n` +
                    `Assistant Messages: ${stats.assistantMessages}\n` +
                    `First Message: ${firstTimestamp}\n` +
                    `Last Message: ${lastTimestamp}\`\`\``
                )
                
            case "help":
                return msg.reply(
                    "**Memory Command Help:**\n" +
                    "`.b memory clear <userID>` - Clear memory for a specific user\n" +
                    "`.b memory wipe` - Wipe all memory\n" +
                    "`.b memory stats <userID|all>` - Show memory statistics\n" +
                    "`.b memory help` - Show this help message"
                )
                
            default:    
                return msg.reply("Invalid subcommand. Use `.b memory help` to see available commands.")
        }
    };
};
