export default class Memory {
    constructor(client, memory){
        this.client = client;
        this.memory = memory;
    }

    async writeMemory(userID, key, value){
        if (typeof value !== 'string') {
            throw new Error('Message content must be a string');
        }
        if (key !== "user" && key !== "assistant") {
            throw new Error(`Invalid key: "${key}". Must be "user" or "assistant"`);
        }
        
        // Different validation for user vs assistant messages
        if (key === "user") {
            // User messages: Discord limit is 4000, allow empty (image-only messages)
            if (value.length > 4000) {
                throw new Error('User message content too long (max 4000 characters)');
            }
        } else if (key === "assistant") {
            // Assistant messages: Can be longer due to chunking in sendMessage.js
            if (value.length > 10000) {
                throw new Error('Assistant message content too long (max 10000 characters)');
            }
        }
        
        await this.validateMemory(userID);

        this.memory[userID].messages.push({
            key: key,
            value: this.client.utils.sanitizeContent(value),
            timestamp: Date.now()
        });
        this.memory[userID].conversation_summary.last_message = Date.now();
    }

    async overwriteMemory(userID, messages){
        await this.validateMemory(userID);
        this.memory[userID].messages = messages;
    }

    async writeLongTermMemory(userID, organizedMemory) {
        if (!organizedMemory || typeof organizedMemory !== 'object') {
            return;
        }

        await this.validateMemory(userID);

        // Add entries to appropriate long-term memory categories
        Object.entries(organizedMemory).forEach(([type, entries]) => {
            // Map 'directive' to 'directives' (plural form for schema consistency)
            const categoryName = type === 'directive' ? 'directives' : 
                                type === 'reaction' ? 'reactions' : 
                                type === 'conflict' ? 'conflicts' : 
                                type === 'bit' ? 'bits' : 
                                type === 'override' ? 'overrides' : 
                                type === 'fact' ? 'facts' : null;

            if (categoryName && this.memory[userID].long_term_memory[categoryName]) {
                entries.forEach(entry => {
                    if (typeof entry !== 'string' || entry.length > 500) {
                        console.warn(`[MEMORY] Invalid LLM entry rejected: ${entry}`);
                        return;
                    }
                    
                    const sanitized = this.client.utils.sanitizeContent(entry);
                    if (sanitized.length < 5) {
                        console.warn(`[MEMORY] Entry too short after sanitization: ${entry}`);
                        return;
                    }

                    // Avoid duplicates
                    if (!this.memory[userID].long_term_memory[categoryName].includes(sanitized)) {
                        this.memory[userID].long_term_memory[categoryName].push(sanitized);
                        console.log(`[MEMORY] Added ${type}: "${sanitized}" for user ${userID}`);
                        
                        // Cull old entries if exceeding limit of 20
                        if (this.memory[userID].long_term_memory[categoryName].length > 20) {
                            const removed = this.memory[userID].long_term_memory[categoryName].shift();
                            console.log(`[MEMORY] Culled old ${type}: "${removed}" for user ${userID} (limit: 20)`);
                        }
                    }
                });
            }
        });
    }

    async grabLongTermMemory(userID){
        return this.memory[userID]?.long_term_memory || {};
    }

    async grabMemory(userID){
        return this.memory[userID]?.messages || [];
    }

    async grabMemoryByType(userID, messageType){
        if (messageType !== "user" && messageType !== "assistant") {
            throw new Error(`Invalid messageType: "${messageType}". Must be "user" or "assistant"`);
        }
        
        const userMemory = this.memory[userID]?.messages || [];
        return userMemory.filter(entry => entry.key === messageType);
    }

    async getLastMessage(userID, messageType = null){
        const userMemory = this.memory[userID]?.messages || [];
        
        if (messageType) {
            if (messageType !== "user" && messageType !== "assistant") {
                throw new Error(`Invalid messageType: "${messageType}". Must be "user" or "assistant"`);
            }
            const filteredMemory = userMemory.filter(entry => entry.key === messageType);
            return filteredMemory[filteredMemory.length - 1] || null;
        }
        
        return userMemory[userMemory.length - 1] || null;
    }

    async clearMemory(userID){
        await this.validateMemory(userID);
        this.memory[userID].messages = [];
    }

    async clearAllMemory(){
        this.memory = {};
    }

    async getMemoryStats(userID){
        const userMemory = this.memory[userID]?.messages || [];
        const userMessages = userMemory.filter(entry => entry.key === "user").length;
        const assistantMessages = userMemory.filter(entry => entry.key === "assistant").length;
        
        return {
            totalMessages: userMemory.length,
            userMessages,
            assistantMessages,
            firstMessage: this.memory[userID]?.conversation_summary?.first_message || null,
            lastMessage: this.memory[userID]?.conversation_summary?.last_message || null
        };
    }   

    async setInitialName(userID, name){
        await this.validateMemory(userID);

        if(!this.memory[userID].names.includes(name)){
            console.log(`[MEMORY] Setting initial name for ${userID}: ${name}`)
            this.memory[userID].names.push(name);
        }
    }

    async getNames(userID){
        return this.memory[userID]?.names || [];
    }

    async getForgetting(userID){
        return this.memory[userID]?.forgetting || {
            lastForget: Date.now(),
            step: 0
        };
    }

    async validateMemory(userID){
        if(!this.memory[userID]) this.memory[userID] = {};
        
        if(!this.memory[userID].messages) this.memory[userID].messages = [];
        
        if(!this.memory[userID].names) this.memory[userID].names = [];
        
        if(!this.memory[userID].forgetting) this.memory[userID].forgetting = {
            lastForget: Date.now(),
            step: 0
        };
        
        if(!this.memory[userID].long_term_memory) this.memory[userID].long_term_memory = {
            directives: [],
            reactions: [],
            bits: [],
            conflicts: [],
            overrides: [],
            facts: []
        };
        
        if(!this.memory[userID].conversation_summary) this.memory[userID].conversation_summary = {
            first_message: Date.now(),
            last_message: Date.now(),
            topic_interests: []
        };
        
        if(!this.memory[userID].sharedServers) this.memory[userID].sharedServers = {};
    }
}
