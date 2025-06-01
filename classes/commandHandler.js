export default class {
    constructor(client) {
        this.client = client;
    }

    //return true if command was handled, false if not
    async handleMessage(message) {
        console.log(`[COMMAND] ${message.author.username} (${message.author.id}) sent message: ${message.content}`)
        if(!this.client.config.superUsers.includes(message.author.id)) return false;
        if(!message.content.startsWith(this.client.config.prefix + " ")) return false;
            
        const [ , command, ...args ] = message.content.split(" ");

        if(!this.client.commands[command]) return false;
        
        this.client.commands[command].execute(message, args);

        return true;
    }
}