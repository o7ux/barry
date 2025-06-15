import client from "../index.js"

export default async function sendMessage(message, reply) {
    let chunks = []
    if (reply.length > 1900) {
        console.log(`[SEND] Reply is too long, splitting into chunks...`)
        chunks = client.utils.chunkString(reply, 1900)
        console.log(`[SEND] Chunks: ${chunks.length}`)
    } else {
        chunks.push(reply)
    }

    await sendWithFallbacks(message, chunks)

    return;
}

async function sendWithFallbacks(message, chunks) {
    const sendMethods = [
        async (chunk) => await message.reply(chunk),
        async (chunk) => await message.channel.send(`<@${message.author.id}> ${chunk}`)
    ];

    let finalError = null;

    for (let i = 0; i < sendMethods.length; i++) {
        try {
            await sendMethods[i](chunks[0]);

            for (let j = 1; j < chunks.length; j++) {
                try {
                    await sendMethods[i](chunks[j]);
                    await client.utils.wait(1000);
                } catch (error) {
                    console.warn(`[SEND] Failed to send chunk ${j + 1} using method ${i + 1}: ${error.message}`);
                }
            }

            return;
        } catch (error) {
            finalError = error;
            console.warn(`[SEND] Method ${i + 1} failed: ${error.message}`);
        }
    }

    await catchUnknownError(message, chunks.join("\n"), finalError);
}

async function catchUnknownError(message, reply, error) {

    //handle specific error (Using banned word, cannot send attachment, timeout, etc)
    //add if else statements as needed
    try {
        if(message.channel.type == "DM") throw new Error("[SEND] Already sending in DM's, fallback disabled")
        if (error.message.includes("Missing Access")) {
            console.warn(`[SEND] Missing Access, sending to user...`)
            await safeDM(message, `Missing access to channel <#${message.channel.id}>:\n\n${reply}`);
        } else if (error.message.includes("Missing Permissions")){
            console.warn(`[SEND] Missing Permissions, sending to user...`)
            await safeDM(message, `Missing permissions to send in channel <#${message.channel.id}>:\n\n${reply}`);
        } else {
            console.warn(`[SEND] Unable to find suitable method to send message: ${reply} \nError: ${error.message}`)
        }
    } catch (error) {
        console.warn(`[SEND] Unable to find suitable method to send message: ${reply} \nError: ${error.message}`)
    }
}

async function safeDM(message, content) {
    try {
        await message.author.send(content);
        console.warn(`[SEND] Sent fallback DM to user: ${message.author.id}`);
    } catch (e) {
        console.warn(`[SEND] Failed to DM user: ${e.message}`);
    }
}