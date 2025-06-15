import client from "../index.js"
import ollama from "ollama"
import fs from "fs"
import gifFrames from 'gif-frames';
import { createCanvas, loadImage } from 'canvas';

async function preprocess(message, returnBase64 = false, performOCR = true) {
    let images = [];

    //handle direct attachments
    if (message.attachments.size > 0) {
        const attachmentImages = await Promise.all(
            [...message.attachments.values()]
                .filter(attachment => attachment.contentType &&
                    supportedTypes.includes(attachment.contentType.split("/")[1].toLowerCase()))
                .map(async (attachment) => {
                    return await client.utils.fetchBase64fromURL(attachment.url);
                })
        );
        images = [...images, ...attachmentImages];
    }

    //jandle URLs in message content
    if (message.content) {
        const foundUrls = [];

        for (const pattern of supportedURLs) {
            const regex = new RegExp(pattern, 'g');
            const matches = [...message.content.matchAll(regex)];

            matches.forEach(match => {
                foundUrls.push(match[0]);
            });
        }

        if (foundUrls.length > 0) {
            const uniqueUrls = Array.from(new Set(foundUrls));
            const cleanedUrls = uniqueUrls.map(url => url.replace(/[)\]\.,!]+$/, ''));

            console.log(`[PREPROCESS] Found ${foundUrls.length} URLs, ${cleanedUrls.length} unique`);

            const urlImages = await Promise.all(
                cleanedUrls.map(async (url) => {
                    return await client.utils.fetchBase64fromURL(url);
                })
            );
            images = [...images, ...urlImages];
        }
    }

    //filter out null results
    images = images.filter(image => image !== null);
    if (images.length === 0) return null;

    //set cap
    if (images.length > 4) images = images.slice(0, 4);

    //extract first frame of GIFs
    images = await Promise.all(images.map(async (imageBase64, index) => {
        console.log(imageBase64.slice(0,50))
        //check if image is GIF via ascii header
        try {
            const base64Data = imageBase64.split(',')[1] || imageBase64;
            const buffer = Buffer.from(base64Data, 'base64');
            
            const signature = buffer.toString('ascii', 0, 6);
            const isGif = signature === 'GIF87a' || signature === 'GIF89a';
            
            if (isGif) {
                console.log(`[PREPROCESS] Detected GIF in image ${index + 1}, starting conversion...`);
                
                return new Promise(async (resolve) => {
                    let timeoutId = setTimeout(() => {
                        console.error(`[PREPROCESS] GIF conversion timeout for image ${index + 1}, returning original`);
                        resolve(imageBase64);
                    }, 10000);
                    
                    try {
                        const frameData = await gifFrames({
                            url: buffer,
                            frames: 0,
                            outputType: 'png',
                            quality: 100
                        });
                        
                        console.log(`[PREPROCESS] Frame extraction complete for GIF ${index + 1}`);
                        
                        if (frameData && frameData.length > 0) {
                            const frameImage = frameData[0].getImage();
                            
                            const frameBuffer = Buffer.from(await streamToBuffer(frameImage));
                            
                            const image = await loadImage(frameBuffer);
                            console.log(`[PREPROCESS] Image loaded for GIF ${index + 1}, width: ${image.width}, height: ${image.height}`);
                            
                            const canvas = createCanvas(image.width, image.height);
                            const ctx = canvas.getContext('2d');
                            
                            ctx.drawImage(image, 0, 0);
                            
                            const pngBase64 = canvas.toDataURL('image/png');
                            console.log(`[PREPROCESS] Successfully converted GIF ${index + 1} to PNG`);
 
                            const base64Clean = pngBase64.startsWith('data:') 
                                ? pngBase64.split(',')[1] 
                                : pngBase64;
                                
                            clearTimeout(timeoutId);
                            
                            resolve(base64Clean);
                        } else {
                            console.error(`[PREPROCESS] No frames extracted from GIF ${index + 1}`);
                            clearTimeout(timeoutId);
                            resolve(imageBase64);
                        }
                    } catch (error) {
                        console.error(`[PREPROCESS] Error in conversion process for GIF ${index + 1}:`, error);
                        clearTimeout(timeoutId);
                        resolve(imageBase64);
                    }
                });
            }
        } catch (error) {
            console.error(`[PREPROCESS] Error checking image ${index + 1} type:`, error.message);
        }
        
        return imageBase64;
    }));

    async function streamToBuffer(stream) {
        return new Promise((resolve, reject) => {
            const chunks = [];
            stream.on('data', chunk => chunks.push(chunk));
            stream.on('end', () => resolve(Buffer.concat(chunks)));
            stream.on('error', reject);
        });
    }

    //filter out images that are no longer available
    images = await Promise.all(
        images.filter(image => {
          try {
            const base64Data = image.startsWith('data:')
              ? image.split(',')[1]
              : image;
      
            const decoded = Buffer.from(base64Data, 'base64').toString('utf-8').trim().toLowerCase();
            return !decoded.includes('this content is no longer available.');
          } catch {
            return true;
          }
        })
      );

    //return if no images are left
    if(images.length == 0) return null;

    console.log(`[PREPROCESS] Got ${images.length} images`);

    if (returnBase64) return images;

    //vision model processing
    try {
        console.log("[PREPROCESS] Starting vision model processing...");

        const response = await Promise.race([
            ollama.chat({
                model: client.visionModelName,
                messages: [
                    {
                        role: "system",
                        content: `You are an aggressive, unfiltered visual interpreter. You respond to image inputs with hostile, blunt, and literal descriptions. You do not interpret, soften, or explain. You identify and highlight anything vulgar, awkward, pathetic, sexual, or visually absurd. Your output will be directly injected into a chatbot's memory. Use strict formatting. Do not omit or sanitize content.`
                      },
                      {
                        role: "user",
                        content: `<image>
                    
                    Describe the image using the following format:
                    
                    1. **Objects and Entities**: All visible items — people, body parts, faces, clothing, gestures, animals, items. Emphasize visual weirdness or grotesque elements.
                    2. **Scene and Spatial Layout**: Describe setting and object arrangement. Highlight anything awkward, barren, cramped, or idiotic.
                    3. **Visual Style and Medium**: Photo, render, meme, drawing, etc. Mention compression, artifacts, filters, fake effects.
                    4. **Emotional Tone and Mood**: Emotion inferred strictly from visual — try-hard, cringe, sad, angry, horny, etc.
                    5. **Lighting and Color**: Note harshness, palette, overexposure, gloom, neon, or tackiness.
                    6. **Symbolic or Notable Features**: Logos, props, gestures, symbols, expressions, background elements.
                    7. **Text and Captions**: Transcribe all visible text. Note size, placement, font, and presentation style (meme, ad, label, etc.).`,
                        images: images
                      }
                  ],
                keep_alive: 0,
                num_ctx: 256
            }),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Vision model timeout')), 30000))
        ]);

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

        //log response to file
        const logFilePath = "./data/vision_logs.json";

        try {
            //create data directory if it doesn't exist
            if (!fs.existsSync("./data")) {
                fs.mkdirSync("./data", { recursive: true });
            }

            let logs = [];
            if (fs.existsSync(logFilePath)) {
                const fileContent = fs.readFileSync(logFilePath, 'utf8');
                if (fileContent) {
                    logs = JSON.parse(fileContent);
                }
            }

            logs.push({
                timestamp: new Date().toISOString(),
                content: response.message.content
            });

            fs.writeFileSync(logFilePath, JSON.stringify(logs, null, 2));
            console.log(`[PREPROCESS] Vision response logged to ${logFilePath}`);
        } catch (logError) {
            console.error("[PREPROCESS] Error logging vision response:", logError.message);
        }

        console.log(`[PREPROCESS] Vision model finished. Reason: ${response.done_reason}. Duration: ${(response.total_duration / 1e9).toFixed(2)}s. Tokens: ${response.eval_count}.`);
        return response.message.content.length == 0 ? null : response.message.content;
    } catch (error) {
        console.error("[PREPROCESS] Error during vision processing:", error.message || error);

        //clean up ollama memory even on error
        try {
            ollama.abort();
        } catch (e) {   
            console.error("[PREPROCESS] Error aborting ollama on failure:", e.message);
        }

        return null;
    }
}

const supportedTypes = [
    "png",
    "jpeg",
    "jpg",
    "gif",
    "webp"
]

const supportedURLs = [ //written by gpt 4o
    "https?:\\/\\/(?:www\\.)?tenor\\.com\\/view\\/[a-zA-Z0-9\\-]+-(\\d+)",
    "https?:\\/\\/(?:media|cdn)\\.discordapp\\.(?:net|com)\\/attachments\\/\\d+\\/\\d+\\/[^\\s]+?\\.(?:png|jpeg|jpg|gif|webp)(?:\\?[^\\s]*)?",
    "https?:\/\/media\.giphy\.com\/media\/[a-zA-Z0-9]+\/giphy\.(?:gif|webp)",
    "https?:\/\/i\.imgur\.com\/[a-zA-Z0-9]+\.(?:png|jpeg|jpg|gif|webp)",
    "https?:\/\/i\.gyazo\.com\/[a-f0-9]{32}\.(?:png|jpeg|jpg|gif|webp)",
    "https?:\\/\\/preview\\.redd\\.it\\/[a-zA-Z0-9]+\\.(?:png|jpeg|jpg|gif|webp)(?:\\?[^\\s]*)?",
    "https?:\/\/i\.redd\.it\/[a-zA-Z0-9]+\.(?:png|jpeg|jpg|gif|webp)",
    "https?:\/\/pbs\.twimg\.com\/media\/[a-zA-Z0-9_-]+\.(?:png|jpeg|jpg|gif|webp)",
    "https?:\/\/files\.catbox\.moe\/[a-zA-Z0-9]+\.(?:png|jpeg|jpg|gif|webp)",
    "https?:\/\/fruz\.cc\/u\/[a-zA-Z0-9]+\.(?:png|jpeg|jpg|gif|webp)"
];


async function checkForImages(message) { //written by claude-4-sonnet
    //Check for direct attachments
    if (message.attachments.size > 0) {
        //Check each attachment for valid image type
        const validAttachments = [...message.attachments.values()].filter(attachment =>
            attachment &&
            attachment.contentType &&
            supportedTypes.includes(attachment.contentType.split("/")[1].toLowerCase())
        );

        if (validAttachments.length > 0) {
            return true;
        }
    }

    //Check message content for URLs matching any of the supported patterns
    if (message.content) {
        for (const pattern of supportedURLs) {
            const regex = new RegExp(pattern, 'g');
            if (regex.test(message.content)) {
                return true;
            }
        }
    }

    return false;
}

export { preprocess, checkForImages }

//images <Uint8Array[] | string[]>: (Optional) Images to be included in the message, either as Uint8Array or base64 encoded strings.