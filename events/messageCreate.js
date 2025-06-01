import chat from "../functions/chat.js"

export default class {
    constructor(client) {
        this.client = client;
        this.queue = { running: false, messages: [] }
    }
    async execute(message) {
        if(message.content.startsWith(this.client.config.prefix)){
            let cont = await this.client.runCommand(message)
            console.log(cont)
            if(cont) return;
        }

        if(this.client.properties.debug && !this.client.config.superUsers.includes(message.author.id)) return;
        if(!await this.shouldReply(message)) return;

        console.log(`[QUEUE] Execute called for user ${message.author.username} (${message.author.id})`);
        
        const existingEntry = this.queue.messages.find(m => m.author == message.author.id);
        if (existingEntry) {
            console.log(`[QUEUE] Adding to existing queue for user ${message.author.username}`);
            existingEntry.additional.push(message);
        } else {
            this.queue.messages.push({ author: message.author.id, original: message, additional: [] });
        }

        if (!this.queue.running) {
            console.log(`[QUEUE] Starting queue processing. Queue length: ${this.queue.messages.length}`);
            this.queue.running = true;
            process.nextTick(() => this.processQueue());
        } else {
            console.log(`[QUEUE] Queue already running, message queued. Queue length: ${this.queue.messages.length}`);
        }
    }

    async processQueue() {
        
        if (this.queue.messages.length === 0) {
            this.queue.running = false;
            return;
        }

        const message = this.queue.messages[0];

        await this.start(message.original)

        console.log(`[QUEUE] Waiting to capture additional messages...`);

        await this.client.utils.wait(5000)

        try {
            await this.handleMessage(message.original, message.additional);
        } catch (error) {
            console.error('[QUEUE] Error handling message:', error);
            this.queue.messages.shift(); // Remove failed message from queue
        }
        
        //prevents edge cases where queue stalls
        if (this.queue.messages.length > 0) {
            process.nextTick(() => this.processQueue());
        } else {
            this.queue.running = false;
        }
    }

    async handleMessage(message, additional) {
        console.log(`[CHAT] Additional messages: ${additional.length}`);

        message = this.parseMessage(message);

        let replyObject = null;
        if (message.type == "REPLY") {
            console.log(`[CHAT] Fetching reply...`);
            try {
                replyObject = await message.channel.messages.fetch(message.reference.messageId);
            } catch (error) {
                console.error('Error fetching reply message:', error);
                replyObject = null;
            }
        }

        if (additional.length > 0) {
            message.content += `\n${additional.map(m => this.parseMessage(m).content).join("\n")}`
        }

        message.content = message.content.replaceAll("\n", ". ")

        console.log(`[CHAT] Message sent to Ollama: "${message.content}"`);

        let reply = "...message failed to process in time, please try again later."
        reply = await chat(message, await this.client.userMemory.grabMemory(message.author.id), replyObject)
        console.log(`[CHAT] Chat function returned: "${reply}"`);

        if(additional.length > 0){
            const messageToReply = additional[additional.length - 1]
            messageToReply.reply(reply)
        } else {
            message.reply(reply)
        }

        await this.stop(reply, message)
    }

    async shouldReply(message) {

        //always return false (bots, self)
        if (message.author.id == this.client.user.id) return false;
        if (message.author.bot) return false;

        //return true (DMs, mentions name, mentions username, mentions id)
        if (message.channel.type == "DM") return true;
        if (message.content.toLowerCase().includes(this.client.config.name.toLowerCase())) return true;
        if (message.content.toLowerCase().includes(this.client.user.username.toLowerCase())) return true;
        if (message.content.toLowerCase().includes(this.client.user.id)) return true;

        //check if reply is to bot
        if (message.type == "REPLY" && message.reference) {
            const reply = await message.channel.messages.fetch(message.reference.messageId);
            if (reply.author.id == this.client.user.id) return true;
        }

        return false;
    }

    async start(message) {
        this.client.user.setStatus("online")
        message.channel.sendTyping()

        await this.client.userMemory.writeMemory(message.author.id, "user", message.content)

        const memory = await this.client.userMemory.grabMemory(message.author.id)
        console.log(`[MEMORY] User ${message.author.id} | Timespan: ${memory.length > 0 ? Math.round((Date.now() - memory[0].timestamp) / 60000) + ' minutes' : 'N/A'} | Avg length: ${memory.length > 0 ? Math.round(memory.reduce((acc, msg) => acc + msg.value.length, 0) / memory.length) : 0} chars`)
    }

    async stop(reply, message) {
        this.client.user.setStatus("away")

        await this.client.userMemory.writeMemory(message.author.id, "assistant", reply)

        this.queue.messages.shift()
        if(this.queue.messages.length > 0) console.log(`[STOP] Queue length now: ${this.queue.messages.length}`);
        else console.log(`[STOP] Queue is now empty`);

        await this.client.writeMemory()
        console.log(`[STOP] Memory written to db`)
    }

    async checkUpdate(message) {
        if(this.queue.messages.length < 0) return;

        const existingEntry = this.queue.messages.find(m => m.author == message.author.id);
        if(!existingEntry) {
            if(await this.shouldReply(message.reactions.message)) this.execute(message.reactions.message)
            return;
        }

        let existingMessage = null;
        if(existingEntry.original.id == message.id) existingMessage = existingEntry.original;
        else existingMessage = existingEntry.additional.find(m => m.id == message.id);

        if(!existingMessage) return;

        existingMessage.content = message.reactions.message.content;
        console.log(`[UPDATE] Message ${message.id} content updated to: ${message.reactions.message.content}`);
    }

    parseMessage(message) {
        message.content = message.content.replaceAll(`<@${this.client.user.id}>`, `${this.client.config.name}`).trim()

        return message;
    }
}