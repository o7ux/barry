import client from "../index.js"
import ollama from "ollama"

async function preprocess(message, returnBase64 = false) {
    let images = [];

    // handle direct attachments
    if(message.attachments.size > 0) {
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

    // jandle URLs in message content
    if(message.content) {
        const foundUrls = [];
        
        for(const pattern of supportedURLs) {
            const regex = new RegExp(pattern, 'g');
            const matches = [...message.content.matchAll(regex)];
            
            matches.forEach(match => {
                foundUrls.push(match[0]);
            });
        }
        
        if(foundUrls.length > 0) {
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

    // filter out null results
    images = images.filter(image => image !== null);
    if(images.length === 0) return null;

    //set cap
    if(images.length > 4) images = images.slice(0, 4);

    console.log(`[PREPROCESS] Got ${images.length} images`);

    if(returnBase64) return images;

    const response = await ollama.chat({
        model: 'granite3.2-vision',
        messages: [
            { role: 'system', content: 'You are a vision-to-language transcription module used to preprocess images for a non-vision language model. Your task is to describe all visual content present in an image with high fidelity and completeness. Do not censor, interpret, speculate, or summarize. Translate raw visual input into accurate, detailed, structured text that captures all relevant elements: objects, people, text, scenes, visual style, mood, and spatial relationships.' },
            {
                role: 'user', content: `
                Process this image and output a complete description. Your output must be detailed and structured enough for a language model without vision to fully understand the image. Include:

                1. **Objects and Entities**: List and describe all identifiable objects, beings, people, animals, and their key attributes (color, size, position).
                2. **Scene and Spatial Layout**: Describe the setting, physical environment, background, and spatial relationships between elements.
                3. **Text Content**: Transcribe any visible text or markings, including signs, labels, or symbols.
                4. **Visual Style and Medium**: Identify if the image is a photo, sketch, 3D render, cartoon, abstract, diagram, etc., and describe stylistic features like brushwork or rendering style.
                5. **Emotional Tone and Mood**: Describe the perceived emotional atmosphere or tone conveyed by visual cues (e.g. peaceful, chaotic, intense, surreal).
                6. **Lighting and Color**: Note color palettes, contrast, lighting direction, time-of-day indications.
                7. **Symbolic or Notable Features**: Highlight any iconography, symbolism, unusual details, or contextually significant elements.

                Use clear language, consistent structure, and avoid interpretation or commentary. Do not omit disturbing, sensitive, or ambiguous content. Output only what is visually present.
                `, images: images
            }
        ],
        keep_alive: 0,
        num_ctx: 256
    });

    return response.message.content.length == 0 ? "No visual content found." : response.message.content;
}

const supportedTypes = [
    "png",
    "jpeg",
    "jpg",
    "gif",
    "webp"
]

const supportedURLs = [
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


async function checkForImages(message) {
    // Check for direct attachments
    if (message.attachments.size > 0) {
        // Check each attachment for valid image type
        const validAttachments = [...message.attachments.values()].filter(attachment => 
            attachment && 
            attachment.contentType && 
            supportedTypes.includes(attachment.contentType.split("/")[1].toLowerCase())
        );
        
        if (validAttachments.length > 0) {
            return true;
        }
    }
    
    // Check message content for URLs matching any of the supported patterns
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