import { cmdError } from "../classes/errorOverride.js"
import { openai } from "../functions/openAI.js"
import fs from "fs"

export default class {
    constructor(client) {
        this.client = client
        this.name = "voice"
        this.type = "dev"
        this.help = ".b voice [msg]"
    };
    async execute(msg, args) {
        let noArgs = new cmdError("Invalid arguments", "Please supply an argument.")
        if(!args[0]) throw noArgs;
        
        let res = await openai.audio.speech.create({
            model: "tts-1",
            voice: "onyx",
            input: args.join("")
        })
        //pipe res to file
        let file = fs.createWriteStream(`./vmCache/${msg.id}.ogg`)
        await res.body.pipe(file)
        file.on(`finish`, async () => {
            await msg.channel.send({
                files: [{
                    attachment: `./vmCache/${msg.id}.ogg`,
                    name: `${args.join(" ")}.ogg`,
                    description: args.join(" ")
                }]
            })
            fs.unlinkSync(`./vmCache/${msg.id}.ogg`)
        })
        await msg.delete()
    };
};