import client from "../index.js"
import { distance } from "fastest-levenshtein"

const spamData = {}

//return true to stop
async function antiSpam(message) {

    if(client.properties.debug){
        console.log(`[ANTISPAM] Debug mode enabled, skipping anti-spam check.`)
        return false
    }

    //check if user is blacklisted
    const userEntry = client.blacklistedUsers.find(user => user.id === message.author.id)
    if(userEntry && userEntry.blacklisted) return true;

    // Validate message content
    if (!message.content || typeof message.content !== 'string') {
        console.log(`[ANTISPAM] Invalid message content from ${message.author.username}`)
        return false
    }

    // Clean and validate the message content
    const currentContent = message.content
        .toLowerCase()
        .trim()
        .replace(/\s+/g, ' ') // Normalize whitespace
        .replace(/[^\w\s]/g, '') // Remove special characters

    // Skip very short messages (less than 2 chars) from spam check
    // but still track them for frequency checks
    const skipSimilarityCheck = currentContent.length < 2

    //initialize spam data for user
    if(!spamData[message.author.id]) spamData[message.author.id] = []

    const currentTime = Math.floor(Date.now() / 1000)
    let isSpam = false

    //check for similar messages using Levenshtein distance
    if (!skipSimilarityCheck) {
        for(const entry of spamData[message.author.id]) {
            // Skip comparing with empty or invalid entries
            if (!entry.content || entry.content.length < 2) continue

            const messageDistance = distance(entry.content, currentContent)
            const maxLength = Math.max(entry.content.length, currentContent.length)
            
            //calculate similarity threshold (15% of the longer message length, minimum 2 characters)
            const threshold = Math.max(2, Math.floor(maxLength * 0.15))
            
            //if messages are similar enough
            if(messageDistance <= threshold) {
                const timeDiff = currentTime - entry.timestamp
                
                //if repeated within 5 seconds, it's spam
                if(timeDiff <= 5) {
                    console.log(`[ANTISPAM] Similar message within 5 seconds detected for ${message.author.username} (distance: ${messageDistance}, threshold: ${threshold}, content length: ${currentContent.length})`)
                    isSpam = true
                    break
                }
            }
        }
    }

    //check for message frequency (multiple messages within 2 seconds)
    if(!isSpam) {
        const recentMessages = spamData[message.author.id].filter(entry => 
            currentTime - entry.timestamp <= 2
        )
        
        if(recentMessages.length >= 2) {
            console.log(`[ANTISPAM] Multiple messages within 2 seconds detected for ${message.author.username} (${recentMessages.length + 1} messages)`)
            isSpam = true
        }
    }

    //handle infractions if spam detected
    if(isSpam) {
        let existingUser = client.blacklistedUsers.find(user => user.id === message.author.id)
        
        if(!existingUser) {
            //create new user entry
            existingUser = {
                id: message.author.id,
                blacklisted: false,
                infractions: 0,
                lastInfractionTime: currentTime // Track when the last infraction occurred
            }
            client.blacklistedUsers.push(existingUser)
        }

        // Reset infractions if last infraction was more than 1 hour ago
        if (currentTime - (existingUser.lastInfractionTime || 0) > 3600) {
            existingUser.infractions = 0
        }
        
        existingUser.infractions++
        existingUser.lastInfractionTime = currentTime
        console.log(`[ANTISPAM] Infraction added for ${message.author.username}. Total: ${existingUser.infractions}/5`)
        
        //auto-blacklist at 5 infractions
        if(existingUser.infractions >= 5) {
            existingUser.blacklisted = true
            console.log(`[ANTISPAM] User ${message.author.username} has been blacklisted (5 infractions reached)`)
        }
        
        return true
    }

    // Only store non-spam messages
    spamData[message.author.id].unshift({
        timestamp: currentTime,
        content: currentContent,
        length: currentContent.length // Store message length for debugging
    })

    //keep only last 20 messages
    if(spamData[message.author.id].length > 20) {
        spamData[message.author.id] = spamData[message.author.id].slice(0, 20)
    }

    //clean up data older than 5 minutes
    spamData[message.author.id] = spamData[message.author.id].filter(entry => 
        currentTime - entry.timestamp <= 300
    )

    return false;
}

export { antiSpam }