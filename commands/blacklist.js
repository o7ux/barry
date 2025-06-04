export default class {
    constructor(client) {
        this.client = client
        this.name = "blacklist"
        this.help = ".b blacklist <add|remove|list|infractions|reset|help>"
    };
    async execute(msg, args) {
        console.log(`[BLACKLIST] ${msg.author.username} (${msg.author.id}) requested blacklist command`)
        
        const subcommand = args[0]?.toLowerCase()
        
        switch (subcommand) {
            case "add":
                if (!args[1]) return msg.reply("Please specify a user ID to blacklist. Expected format: `.b blacklist add <userID>`")
                
                const userToAdd = args[1]
                const existingUser = this.client.blacklistedUsers.find(user => user.id === userToAdd)
                
                if (existingUser) {
                    existingUser.blacklisted = true
                    existingUser.infractions = Math.max(existingUser.infractions, 5)
                } else {
                    this.client.blacklistedUsers.push({
                        id: userToAdd,
                        blacklisted: true,
                        infractions: 5
                    })
                }
                
                await this.client.writeMemory()
                return msg.reply(`User ${userToAdd} has been blacklisted.`)
                
            case "remove":
                if (!args[1]) return msg.reply("Please specify a user ID to remove from blacklist. Expected format: `.b blacklist remove <userID>`")
                
                const userToRemove = args[1]
                const userIndex = this.client.blacklistedUsers.findIndex(user => user.id === userToRemove)
                
                if (userIndex === -1) return msg.reply(`User ${userToRemove} is not in the blacklist.`)
                
                this.client.blacklistedUsers[userIndex].blacklisted = false
                await this.client.writeMemory()
                return msg.reply(`User ${userToRemove} has been removed from the blacklist.`)
                
            case "list":
                const blacklistedUsers = this.client.blacklistedUsers.filter(user => user.blacklisted)
                
                if (blacklistedUsers.length === 0) return msg.reply("No users are currently blacklisted.")
                
                const userList = blacklistedUsers.map(user => `${user.id} (Infractions: ${user.infractions})`).join("\n")
                return msg.reply(`**Blacklisted Users:**\n\`\`\`${userList}\`\`\``)
                
            case "infractions":
                if (!args[1]) return msg.reply("Please specify a user ID to check infractions. Expected format: `.b blacklist infractions <userID>`")
                
                const userToCheck = args[1]
                const user = this.client.blacklistedUsers.find(user => user.id === userToCheck)
                
                if (!user) return msg.reply(`User ${userToCheck} has no recorded infractions.`)
                
                const blacklistStatus = user.blacklisted ? "blacklisted" : "not blacklisted"
                return msg.reply(`User ${userToCheck} has ${user.infractions} infractions and is ${blacklistStatus}.`)
                
            case "reset":
                if (!args[1]) return msg.reply("Please specify a user ID to reset infractions. Expected format: `.b blacklist reset <userID>`")
                
                const userToReset = args[1]
                const resetUser = this.client.blacklistedUsers.find(user => user.id === userToReset)
                
                if (!resetUser) return msg.reply(`User ${userToReset} has no recorded infractions.`)
                
                resetUser.infractions = 0
                resetUser.blacklisted = false
                await this.client.writeMemory()
                return msg.reply(`Infractions for user ${userToReset} have been reset to 0 and user has been removed from blacklist.`)
                
            case "help":
                return msg.reply(
                    "**Blacklist Command Help:**\n" +
                    "`.b blacklist add <userID>` - Add a user to the blacklist\n" +
                    "`.b blacklist remove <userID>` - Remove a user from the blacklist\n" +
                    "`.b blacklist list` - List all blacklisted users\n" +
                    "`.b blacklist infractions <userID>` - Check infractions for a user\n" +
                    "`.b blacklist reset <userID>` - Reset infractions for a user\n" +
                    "`.b blacklist help` - Show this help message"
                )
                
            default:
                return msg.reply("Invalid subcommand. Use `.b blacklist help` to see available commands.")
        }
    };
}; 