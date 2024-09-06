import { writeLastMemory, grabLastMemory } from "../functions/memory.js"
import { unopenAI, slangify, parse4ai, unslangify } from "../functions/chat.js";
import { log, wait, exists } from "../functions/util.js"
import { checkCmds } from "../functions/barrycmds.js"
import { chat, openai } from "../functions/openAI.js"
import { antiSpam } from "../functions/antispam.js";
import { msgLog } from "../functions/msgLog.js";
import consts from "../json/config.json" assert {type: "json"}
import fs from "fs"
import axios from "axios"
import probe from "node-ffprobe"
import ffProbeInstaller from "@ffprobe-installer/ffprobe"

probe.FFPROBE_PATH = ffProbeInstaller.path

export default class {
    constructor(client) {
        this.client = client;
        this.queue = false;
        this.lastMsgSent = "";
        this.lastMsgWait = 0;
        this.currentlySending = [];
        this.messageBuffer = {};
        this.imageHolder = {};
        this.replyHolder = {};
        this.replyImageHolder = {}
    }
    async execute(msg) {

        let msg2sendHolder;
        try {

            if (msg.author.bot) return;

            //log message
            msgLog(msg)

            //check for dev commands
            if (await checkCmds(msg)) return;

            //check if debug
            if (this.client.debug && !consts.devList.includes(msg.author.id)) return;

            let randomgen = Math.floor(Math.random() * (consts.randomNum - 1)) + 1;
            let checkRandom = (randomgen == 1) && msg.author.username != consts.username && msg.channel.type != "DM" && msg.channel.type != "GROUP_DM"
            let includesBarry = msg.content.toLowerCase().includes(consts.name.toLowerCase()) || msg.content.toLowerCase().includes(consts.username.toLowerCase()) || msg.content.includes(consts.id) || msg.content.includes(`<@${consts.id}>`)
            if ((
                msg.channel.type == "DM" ||  // reply if dm
                includesBarry ||  // reply if message includes name
                (msg.type == "REPLY" && msg.author.username != consts.username)         // reply if replied to
            ) &&    // reply on random gen (disabled currently)
                msg.author.username != consts.username) {                                   // check if message is not from bot before continuing

                //check if reply is only to barry and does not include "barry" (DMs are not replies)
                if (msg.type == "REPLY" && !includesBarry && msg.channel.type != "DM") {
                    if (!msg.mentions) return;
                    let re = false
                    let iterations = 0 // users map with no data is a self reference
                    await msg.mentions.users.forEach(u => {
                        iterations++
                        if (u.id != consts.id) re = true
                    })
                    if (iterations == 0) return;
                    if (re) return;
                }

                //check if sole server
                if (consts.soleServer && msg.channel.type == "GUILD_TEXT" && msg.guild.id != consts.soleServerID && !this.client.debug) {
                    let randomgensays = Math.floor(Math.random() * (consts.afkResMsg.length - 1)) + 1;
                    let waitTimer = (Math.floor(Math.random() * 8) + 4) * 1000;
                    await wait(waitTimer)
                    return msg.reply(consts.afkResMsg[randomgensays]);
                }

                //parsing
                let msg2ai = msg.content
                if (msg.channel.type != "GROUP_DM") msg2ai = msg.cleanContent
                msg2ai = await parse4ai(msg2ai)
                let logName = msg.guild ? msg.guild.name : "DM"
                log(`  [AI] ${consts.name} triggered in ${logName}`)
                log(`  [AI] ${msg.author.username}: ${msg2ai}`, true)

                //grab memory
                let lastMsg = await grabLastMemory(msg.author.id)
                let lastMsgLog = lastMsg.lastUser[lastMsg.lastUser.length - 1]

                //handle spam
                let reject = await antiSpam(msg, lastMsgLog);
                console.log(`  [AI] Should message be marked as spam: ${String(reject)}`)
                if (reject) return

                //handle reply
                this.replyHolder[msg.author.id] == null
                if (msg.type == "REPLY" && msg.reference) {
                    try { this.replyHolder[msg.author.id] = await msg.channel.messages.fetch(msg.reference.messageId) } catch (e) { console.log("  [AI] Unable to fetch reply message."); this.replyHolder[msg.author.id] = msg }
                    console.log(`  [AI] Message is replying to ${this.replyHolder[msg.author.id].author.username}: ${this.replyHolder[msg.author.id].content}`);
                }

                //handle image collection
                let tempy = await handleImage(msg)
                if (tempy.hasImage) this.imageHolder[msg.author.id] = tempy
                if (this.replyHolder[msg.author.id] != null) tempy = await handleImage(this.replyHolder[msg.author.id])
                if (tempy.hasImage) this.replyImageHolder[msg.author.id] = tempy

                //handle repeat messages from same person
                if (!exists(this.messageBuffer[msg.author.id])) this.messageBuffer[msg.author.id] = {
                    id: msg.id,
                    messages: {}
                };
                this.messageBuffer[msg.author.id].messages[msg.id] = { content: msg2ai, id: msg.id }
                if (this.messageBuffer[msg.author.id].id != msg.id) this.messageBuffer[msg.author.id].id = msg.id;
                if (this.currentlySending.includes(msg.author.id.toString())) return log('  [AI] User already sent message, adding to messageBuffer.', true)
                this.currentlySending.push(msg.author.id.toString())

                //single message queue to prevent openAI a@mpi issues (need to upgrade to multi-message queue using msg array)
                let replywaitTimer = (Math.floor(Math.random() * 5) + 5) * 1000;
                let typingwaitTimer = (Math.floor(Math.random() * 5) + 5) * 1000;
                let dateNow = Date.now().toString()
                if (this.queue) {
                    let queueWait = Math.floor(this.lastMsgWait - (dateNow - this.lastMsgSent)) + 1;
                    console.log(`  [AI] Queue active, waiting ${queueWait / 1000} seconds.`)
                    await wait(queueWait);
                    console.log(`  [AI] Queue clear, continuing..`)
                }
                this.queue = true;
                this.lastMsgSent = dateNow;
                this.lastMsgWait = replywaitTimer + typingwaitTimer;

                this.client.user.setStatus("online")

                //waiting replying
                if (!this.client.debug) log(`  [AI] Waiting ${replywaitTimer / 1000} seconds before replying.`, false)
                if (!this.client.debug) await wait(replywaitTimer)

                //waiting typing
                await msg.channel.sendTyping()
                if (!this.client.debug) log(`  [AI] Waiting ${typingwaitTimer / 1000} seconds while typing.`, false)
                if (!this.client.debug) await wait(typingwaitTimer)

                //chat openai
                let msgArray = []
                Object.keys(this.messageBuffer[msg.author.id].messages).forEach(key => {
                    let value = this.messageBuffer[msg.author.id].messages[key]
                    msgArray.push(value.content)
                })
                msg2ai = msgArray.join("\n")
                let msg2send = await chat(msg2ai, lastMsg.lastUser, lastMsg.lastAI, msg, this.imageHolder[msg.author.id], this.replyHolder[msg.author.id], this.replyImageHolder[msg.author.id])

                //write memory
                await writeLastMemory(msg.author.id.toString(), msg2ai, msg2send[0])

                //slangify message
                msg2sendHolder = msg2send[0]
                if (consts.slangIt && !this.client.debug && (msg.channel.type == 'DM' || msg.channel.type == 'GROUP_DM')) {
                    msg2send[0] = await slangify(msg2send[0], "1");
                } else {
                    if (consts.slangIt && !this.client.debug) msg2send[0] = await slangify(msg2send[0], msg.guild.id);
                }
                if (!this.client.debug) msg2send[0] = await unopenAI(msg2send[0]);

                //make sure user is not blacklisted before sending in case of blacklist while waiting
                if (this.client.blacklist.includes(msg.author.id)) return log("  [AI] User was blacklisted while waiting to send message, message not sent.", true)

                //reply to most recent message
                if (this.messageBuffer[msg.author.id].id != msg.id) msg = await msg.channel.messages.fetch(this.messageBuffer[msg.author.id].id)

                //send message
                if (msg2send[1]) handleVM(msg, msg2send, this.client);
                else if (msg.channel.type == "GROUP_DM" || msg.channel.type == "DM") msg.channel.send(msg2send[0]);
                else msg.reply(msg2send[0].toString());

                //reset variables to default state
                this.replyHolder[msg.author.id] = undefined
                this.replyImageHolder[msg.author.id] = undefined
                this.imageHolder[msg.author.id] = undefined
                this.messageBuffer[msg.author.id] = undefined
                this.client.setDB()
                this.queue = false;
                this.client.user.setStatus("idle")
                this.currentlySending = this.currentlySending.filter(x => x != msg.author.id)
                log(`  [AI] ${consts.name}: ${msg2send[0]}`, true)
            }
        } catch (e) {
            if (e.message == "Missing Access" || e.message == "Missing Permissions") return log(`  [AI] Unable to access channel (${msg.guild.name}.${msg.channel.name}), ${e.message}.`, true);
            else if (e.message.includes("content is blocked")) {
                this.client.slurBlacklist.push(msg.guild.id)
                msg.reply(msg2sendHolder);
            }
            else throw e
        }
    }
    async checkUpdate(msg) {
        if (msg == null || msg == undefined) return;
        if (msg.author == null || msg.author == undefined) return;
        if (this.messageBuffer.hasOwnProperty(msg.author.id)) {
            if (this.messageBuffer[msg.author.id] == undefined) return;
            if (this.messageBuffer[msg.author.id].messages == undefined) return // happens if message is edited after barry responds
            Object.keys(this.messageBuffer[msg.author.id].messages).forEach(key => {
                let value = this.messageBuffer[msg.author.id].messages[key]
                if (value.id == msg.id) {
                    console.log(`  [AI] ${this.messageBuffer[msg.author.id].messages[key].content} => ${msg.reactions.message.content}`)
                    this.messageBuffer[msg.author.id].messages[key].content = msg.reactions.message.content
                }
            })
        }
    }
}

let handleVM = async (msg, msg2send, client) => {
    //handle vm
    let res = await openai.audio.speech.create({
        model: "tts-1",
        voice: "onyx",
        input: msg2send[0]
    })

    let usage = msg2send[0].length
    let rate = 15 / 1000000
    client.cost.total += (usage * rate)
    client.cost.log[Date.now().toString()] = (usage * rate)
    console.log(`  [AI] Completed voice message processing, total characters: ${usage}, cost: $${(usage * rate).toFixed(6)}`)

    //pipe res to file
    let path = `./vmCache/${msg.id}.ogg`
    let file = fs.createWriteStream(path)
    await res.body.pipe(file)

    file.on(`finish`, async () => {

        //cant figure out how to get waveform from file
        let waveform = null;
        let probeJson = await probe(path)
        let reply = (msg.channel.type == "GROUP_DM" || msg.channel.type == "DM") ? null : msg

        const url = "https://discord.com/api/v9/channels/" + msg.channel.id + "/messages"

        const body = {
            flags: 8192,
            channel_id: msg.channel.id,
            content: "",
            nonce: Date.now().toString(),
            sticker_ids: [],
            type: 0,
            attachments: [{
                id: "0",
                filename: "voice-message.ogg",
                uploaded_filename: "voice-message.ogg",
                waveform: waveform,
                duration_secs: probeJson.format.duration
            }],
        }
        const headers = {
            "Content-Type": "application/json",
            "Authorization": client.token,
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) discord/1.0.9148 Chrome/120.0.6099.291 Electron/28.2.10 Safari/537.36",
            "Sec-Fetch-Site": "same-origin",
            "Sec-Fetch-Mode": "cors",
            "Referer": !msg.guild ? `https://discord.com/channels/${msg.channel.id}` : `https://discord.com/channels/${msg.guild.id}/${msg.channel.id}`,
            "Accept-Language": "en-US9",
            "Accept-Encoding": "gzip, deflate, br",
        }

        //always returns 401 error
        axios.post(url, body, headers)
            .then(res => {
                fs.unlinkSync(path)
            }).catch(async e => {
                console.log("  [WARN] Unable to send voice message, sending as attachment.")
                let attachment = {
                    files: [{
                        attachment: fs.readFileSync(path),
                        name: "voice-message.mp3"
                    }]
                }
                try {
                    if (msg.channel.type == "GROUP_DM" || msg.channel.type == "DM") await msg.channel.send(attachment)
                    else await msg.reply(attachment);
                } catch (e) {
                    console.log("  [WARN] Unable to send attachment, sending as message.")
                    if (msg.channel.type == "GROUP_DM" || msg.channel.type == "DM") await msg.channel.send(msg2send[0])
                    else await msg.reply(msg2send[0]);
                }
                fs.unlinkSync(path)
            })
    })
}

async function handleImage(msg) {
    if (msg == null || msg == undefined) return null;
    let imageUrlRegexHolder = /^(?:(?<scheme>[^:\/?#]+):)?(?:\/\/(?<authority>[^\/?#]*))?(?<path>[^?#]*\/)?(?<file>[^?#]*\.(?<extension>[Jj][Pp][Ee]?[Gg]|[Pp][Nn][Gg]|[Gg][Ii][Ff]))(?:\?(?<query>[^#]*))?(?:#(?<fragment>.*))?$/im;
    let imageUrlRegex = new RegExp(imageUrlRegexHolder);
    let supportedTypes = [
        "png",
        "jpeg",
        "gif",
        "webp"
    ]
    let imageObj = {
        hasImage: false,
        imageURL: null,
        imageType: null
    }
    if (msg.attachments.first()) {
        let img = msg.attachments.first()
        imageObj.hasImage = true;
        imageObj.imageURL = img.url
        imageObj.imageType = img.contentType.split("/")[1].toLowerCase()
    }
    if (imageUrlRegex.test(msg.content) && !imageObj.hasImage) {
        imageUrlRegex = new RegExp(imageUrlRegexHolder);
        let img = imageUrlRegex.exec(msg.content)
        if (img != null && img != undefined) {
            imageObj.hasImage = true;
            imageObj.imageURL = ("https://" + img.groups.authority + img.groups.path + img.groups.file)
            imageObj.imageType = img.groups.extension
        }
    }
    if (!supportedTypes.includes(imageObj.imageType) && imageObj.hasImage) imageObj.imageType = "unsupportedType"
    return imageObj;
}