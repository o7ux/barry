import client from "../index.js"
import ollama from "ollama"

export default async function preprocess(message) {

    //check if the message has an attachment
    if (!message.attachments.first()) return null;

    //check if the attachment is an image
    if (!supportedTypes.includes(message.attachments.first().contentType.split("/")[1].toLowerCase())) return null;

    let images = await Promise.all(
        [...message.attachments.values()].map(async (attachment) => {
            return await client.utils.fetchBase64fromURL(attachment.url);
        })
    );

    images = images.filter(image => image !== null)
    if (images.length == 0) return null;

    console.log(`[PREPROCESS] Got ${images.length} images`)

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

    return response.message.content

}

const supportedTypes = [
    "png",
    "jpeg",
    "jpg",
    "gif",
    "webp"
]

//images <Uint8Array[] | string[]>: (Optional) Images to be included in the message, either as Uint8Array or base64 encoded strings.