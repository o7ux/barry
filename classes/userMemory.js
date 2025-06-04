export default class Memory {
    constructor(client, memory){
        this.client = client;
        this.memory = memory;
    }

    async writeMemory(userID, key, value){
        if (key !== "user" && key !== "assistant") {
            throw new Error(`Invalid key: "${key}". Must be "user" or "assistant"`);
        }
        
        if(!this.memory[userID]) this.memory[userID] = [];
        this.memory[userID].push({
            key: key,
            value: value,
            timestamp: Date.now()
        });
    }   

    async grabMemory(userID){
        return this.memory[userID] || [];
    }

    async grabMemoryByType(userID, messageType){
        if (messageType !== "user" && messageType !== "assistant") {
            throw new Error(`Invalid messageType: "${messageType}". Must be "user" or "assistant"`);
        }
        
        const userMemory = this.memory[userID] || [];
        return userMemory.filter(entry => entry.key === messageType);
    }

    async getLastMessage(userID, messageType = null){
        const userMemory = this.memory[userID] || [];
        
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
        this.memory[userID] = [];
    }

    async clearAllMemory(){
        this.memory = {};
    }

    async getMemoryStats(userID){
        const userMemory = this.memory[userID] || [];
        const userMessages = userMemory.filter(entry => entry.key === "user").length;
        const assistantMessages = userMemory.filter(entry => entry.key === "assistant").length;
        
        return {
            totalMessages: userMemory.length,
            userMessages,
            assistantMessages,
            firstMessage: userMemory[0] || null,
            lastMessage: userMemory[userMemory.length - 1] || null
        };
    }
}
