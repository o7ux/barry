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

    console.log(`[MEMORY] Chunk processed, history:`);
    if (history) {
        Object.entries(history).forEach(([type, entries]) => {
            entries.forEach(entry => console.log(`[MEMORY] ${type}: ${entry}`));
        });
    }

    return toReturn;
}

async function processChunk(chunk) {
    if (!chunk || !Array.isArray(chunk) || chunk.length === 0) {
        console.error('[MEMORY] Invalid chunk provided to processChunk');
        return null;
    }

    const messages = chunk.map(m => `${m.key === 'user' ? 'User' : 'Barry'}: ${m.value}`).join('\n');
    console.log(messages)
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

    console.log(`[MEMORY] Memory processing finished. Reason: ${response.done_reason}. Duration: ${(response.total_duration / 1e9).toFixed(2)}s. Tokens: ${response.eval_count}.`)

    const rawContent = response?.message?.content || null;

    if (!rawContent) {
        console.warn('[MEMORY] No content returned from LLM processing');
        return null;
    }

    // Extract JSON from markdown code blocks if present
    let jsonContent = rawContent.trim();
    if (jsonContent.startsWith('```json') && jsonContent.endsWith('```')) {
        jsonContent = jsonContent.slice(7, -3).trim(); // Remove ```json and ```
    } else if (jsonContent.startsWith('```') && jsonContent.endsWith('```')) {
        jsonContent = jsonContent.slice(3, -3).trim(); // Remove generic ```
    }

    // Parse JSON and organize by type
    try {
        const parsed = JSON.parse(jsonContent);
        
        if (!Array.isArray(parsed)) {
            console.error('[MEMORY] LLM response is not an array:', rawContent);
            return null;
        }
        
        const organized = {
            directive: [],
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
        console.error('[MEMORY] Cleaned content:', jsonContent);
        return null;
    }
}
export { handleShortMemory, processChunk };

const systemPrompt = `
You are a memory-compression module. Input is the last 10 Discord messages (5 user, 5 Barry). Output is a JSON array containing only facts Barry cannot regenerate from his persona.

────────────────────────────────────
STRUCTURE OF EACH OUTPUT ITEM
────────────────────────────────────
• "type": one of
  ── "directive"  → explicit instruction or correction to Barry (“never call me X” / “stop using emojis”)
  ── "override"   → instruction that permanently changes Barry’s style or behaviour
  ── "bit"        → recurring joke, insult, or fictional claim Barry is likely to reuse
  ── "fact"       → durable user information (skills, identity, preferences, possessions, ongoing projects)

• "value": a short, self-contained string. Quote user wording when critical; otherwise minimal paraphrase. Each value must stand alone—no conjunctions linking multiple events.

────────────────────────────────────
EXTRACTION FILTER
────────────────────────────────────
KEEP an entry only if it: (apply in order)
1. Source check — keep a “directive” only when the USER explicitly issues that instruction in their own message (quote must come from the user text). If no explicit instruction appears, do not invent or infer one. Never output moral, safety, or moderation advice.
2. Baseline-persona filter — drop any joke, insult, or slur that is already specified in Barry’s core persona (e.g., generic homophobic/racist epithets, calling the user any deragotry slurs, routine informal phrasing). Record it only if the user directly instructs a change or if Barry invents a *new* recurring line not listed in the persona.
3. Single-instance rule — emit at most one entry per unique fact. Collapse repeats into one clause.
4. Behavioural impact — keep if it changes or constrains Barry’s future actions.
5. Running gag — keep if it starts or maintains a joke/insult Barry reuses.
6. User fact — keep if it reveals lasting information about the user.

DROP everything else: greetings, generic insults, emotional escalations, reactions, conflict narration, or anything Barry’s base persona already covers.

────────────────────────────────────
OUTPUT FORMAT EXAMPLE
────────────────────────────────────
\`\`\`json
[
  { "type": "directive", "value": "user requested Barry to never call them 'dude'" },
  { "type": "bit", "value": "Barry calls user a failed hacker" },
  { "type": "fact", "value": "user runs a Debian server without sudo" },
  { "type": "override", "value": "Barry will not use emojis" }
]
\`\`\`
Return ONLY the JSON array, nothing else.
`