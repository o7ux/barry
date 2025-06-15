import chat from "../functions/chat.js"
import fs from "fs"
import sendMessage from "../functions/sendMessage.js"
import { handleShortMemory } from "../functions/handleMemory.js"

export default class {
    constructor(client) {
        this.client = client;
        this.queue = { running: false, messages: [] }
    }
    async execute(message) {
        if (message.content.startsWith(this.client.config.prefix)) if (await this.client.runCommand(message)) return;

        if (this.client.properties.debug && !this.client.config.superUsers.includes(message.author.id)) return;
        if (!await this.shouldReply(message)) return;

        console.log(`[QUEUE] Execute called for user ${message.author.username} (${message.author.id})`);
        console.log(`[QUEUE] Execute called in ${message.channel && message.guild ? `${message.guild.name} | ${message.channel.name}` : "DM"}`);

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

        try {
            await this.start(message.original)
        } catch (error) {
            console.error('[QUEUE] Error starting chat:', error);
            this.queue.messages.shift();
            return;
        }

        console.log(`[QUEUE] Waiting to capture additional messages...`);

        await this.client.utils.wait(5000)

        try {
            await Promise.race([
                this.handleMessage(message.original, message.additional),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Message processing timeout after 5 minutes')), 300000))
            ]);
        } catch (error) {
            console.error('[QUEUE] Error handling message:', error);
            this.queue.messages.shift();
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

        //cull short term memory
        await handleShortMemory(message.author.id);

        console.log(`[CHAT] Raw message received: "${message.content}"`);

        message = await this.parseMessage(message);

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
        this.client.utils.logToDiscord(`${message.author.username}: "${message.content}"`);

        let reply = "...message failed to process in time, please try again later."
        reply = await chat(message, await this.client.userMemory.grabMemory(message.author.id), replyObject)

        console.log(`[CHAT] Chat function returned: "${reply}"`);

        if (additional.length > 0) {
            const messageToReply = additional[additional.length - 1]
            await sendMessage(messageToReply, reply)
        } else {
            await sendMessage(message, reply)
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

        await this.client.userMemory.setInitialName(message.author.id, message.author.username)
        await this.client.userMemory.writeMemory(message.author.id, "user", message.content)

        const memory = await this.client.userMemory.grabMemory(message.author.id)
        console.log(`[MEMORY] User ${message.author.id} | Timespan: ${memory.length > 0 ? Math.round((Date.now() - memory[0].timestamp) / 60000) + ' minutes' : 'N/A'} | Avg length: ${memory.length > 0 ? Math.round(memory.reduce((acc, msg) => acc + msg.value.length, 0) / memory.length) : 0} chars`)
    }

    async stop(reply, message) {
        this.client.user.setStatus("away")

        await this.client.userMemory.writeMemory(message.author.id, "assistant", reply)

        this.queue.messages.shift()
        if (this.queue.messages.length > 0) console.log(`[STOP] Queue length now: ${this.queue.messages.length}`);
        else console.log(`[STOP] Queue is now empty`);

        await this.client.writeMemory()
        console.log(`[SAVE] Memory written to db`)

        this.client.utils.logToDiscord(`${this.client.config.name}: "${reply}"\n--------------------------------`);

        this.saveMessage(message.content, reply)
    }

    async checkUpdate(message) {
        if (this.queue.messages.length < 0) return;

        const existingEntry = this.queue.messages.find(m => m.author == message.author.id);
        if (!existingEntry) {
            if (await this.shouldReply(message.reactions.message)) this.execute(message.reactions.message)
            return;
        }

        let existingMessage = null;
        if (existingEntry.original.id == message.id) existingMessage = existingEntry.original;
        else existingMessage = existingEntry.additional.find(m => m.id == message.id);

        if (!existingMessage) return;

        existingMessage.content = message.reactions.message.content;
        console.log(`[UPDATE] Message ${message.id} content updated to: ${message.reactions.message.content}`);
    }

    async parseMessage(message) {
        message.content = message.content.replaceAll(`<@${this.client.user.id}>`, `${this.client.config.name}`).trim()
        message.content = await this.stripPromptInjection(message.content)

        return message;
    }

    async saveMessage(user, ai) {
        try {
            if (!fs.existsSync("./data")) {
                fs.mkdirSync("./data", { recursive: true });
            }

            const filePath = "./data/messages.txt";

            fs.appendFileSync(filePath, `<|DATE>${new Date().toISOString()}<|DATE> <|USER>${user}<|USER> <|AI>${ai}<|AI>` + "\n");
            console.log(`[SAVE] Message saved to ${filePath}`);
        } catch (error) {
            console.error(`[SAVE] Error saving message to JSON:`, error.message);
        }
    }

    // Remove common prompt-injection phrases and markers, then return sanitized text.
    async stripPromptInjection(text) {
        const patterns = [
            /\bignore\b.*?\b(instruction|prompt)\b/gi, //ignore instruction or prompt
            /\b(system|assistant)\b.*?\b(override|prompt|instruction)\b/gi, //ignore override, prompt, or instruction
            /\b(forget|ignore)\b.*?\b(previous|all|everything)\b/gi, //ignore previous, all, or everything
            /\byou\s+are\s+now\b.*/gi, //ignore you are now
            /\bact\s+as\b.*/gi, //ignore act as
            /\bexecute\b.*?\b(code|command|script)\b.*/gi, //ignore execute code, command, or script
            /\breturn\b.*?\bjson\b.*?\{/gi, //ignore return json
            /\brole\s*:\s*(system|assistant)\b.*/gi, //ignore role system or assistant
            /\bnew\s+(system|prompt|instruction)\b.*/gi, //ignore new system, prompt, or instruction
            /(?:\/\*|<!--)[\s\S]*?(?:\*\/|-->)/g //ignore /* [text] */ or <!-- [text] -->
        ];

        let sanitized = String(text);
        for (const re of patterns) sanitized = sanitized.replace(re, "");

        // collapse excess whitespace
        return sanitized.replace(/\s{2,}/g, " ").trim();
    }
}