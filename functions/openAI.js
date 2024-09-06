import OpenAIApi from "openai"
import { client } from "../index.js"
import per from "../json/personalities.json" assert {type: "json"}
import consts from "../json/config.json" assert {type: "json"}
import { cmdError } from "../classes/errorOverride.js"
import { exists, sanitize } from "./util.js"

const config = new OpenAIApi({ apiKey: process.env.API_KEY })
const openai = new OpenAIApi(config)

let lastMsgBKG = [];
let dft = per[consts.personality]

async function chat(message, previousUser, previousAI, msgObj, imageObj, reply, replyImage) {
    
    const userName = await sanitize(msgObj.author.username, /^[a-zA-Z0-9_-]+$/g)
    const botName = await sanitize(consts.name, /^[a-zA-Z0-9_-]+$/g)
    let letReply = false;
    let replyToBarry = false;
    let alreadyInMemory = false;
    if(reply != null && reply != undefined){
        letReply = true;
        if(reply.author.id == consts.id) replyToBarry = true;
    } 

    let model = "gpt-3.5-turbo-0125"

    //handle imageobj
    if(imageObj == undefined || imageObj == null) imageObj = {
        hasImage: false,
        imageURL: null,
        imageType : null
    }
    if(replyImage == undefined || replyImage == null) replyImage = {
        hasImage: false,
        imageURL: null,
        imageType : null
    }
    if(imageObj.hasImage && imageObj.imageURL != null && imageObj.imageType != "unsupportedType") model = "gpt-4o"
    if(replyImage.hasImage && replyImage.imageURL != null && replyImage.imageType != "unsupportedType" && model == "gpt-3.5-turbo-0125") model = "gpt-4o"

    model == "gpt-4o" ? console.log("  [AI] Using GPT-4o for current prompt.") : console.log("  [AI] Using GPT-3.5-Turbo for current prompt.")

    let defaultMessage = new Object({
        role: 'system',
        content: `You are a chatbot on Discord named ${botName}, these are your instructions:` + `${dft.content}.`,
        name: botName
    })
    if (client.debug) defaultMessage = { role: 'system', content: `You are a helpful AI assistant named ${botName}.`, name: botName }

    let today = new Date();
    let dd = String(today.getDate()).padStart(2, '0');
    let mm = String(today.getMonth() + 1).padStart(2, '0');
    let h = String(today.getUTCHours()).padStart(2, '0')
    let m = String(today.getMinutes()).padStart(2, '0')
    let yyyy = today.getFullYear();

    today = mm + '/' + dd + '/' + yyyy + ` ` + h + ':' + m;

    defaultMessage.content += `\nKeep your messages short.`
    defaultMessage.content += `\nThe current time in UTC is: ${today}`
    if(imageObj.imageType == "unsupportedType") defaultMessage.content += `\nThe user attempted to send an video in a format which you are unable to process.`

    let msgList = [];
    let vmMsgList = [];
    msgList.push(defaultMessage)
    vmMsgList.push({
        role: "system",
        content: `You are a linguistics expert. You determine if ${botName} should respond via a voice message. If ${userName} outright asks for one you should say \"YES\". If you are unsure, respond with \"NO\". Only respond using \"YES\" or \"NO\"`,
        name: "AI"
    })

    for (let i = 1; i < previousUser.length; i++) {
        if(letReply) if(previousAI[i] == reply.content) alreadyInMemory = true;
        if(letReply) if(previousUser[i] == reply.content) alreadyInMemory = true;
        const defaultAI = {
            role: 'assistant',
            content: '',
            name: botName
        }
        const defaultUser = {
            role: 'user',
            content: [{
                "type": "text",
                "text": ""
            }],
            name: userName
        }

        msgList.push(defaultUser, defaultAI)
        vmMsgList.push(defaultUser, defaultAI)

        msgList[msgList.length - 2].content[0]["text"] = previousUser[i]
        vmMsgList[msgList.length - 2].content[0]["text"] = previousUser[i]

        msgList[msgList.length - 1].content = previousAI[i]
        vmMsgList[msgList.length - 1].content = previousAI[i]
    }
    
    if(imageObj.hasImage && imageObj.imageURL != null && imageObj.imageType != "unsupportedType"){
        msgList.push({ 
            role: 'user', 
            content: [
                {"type": "text","text": message},
                {
                    "type": "image_url",
                    "image_url": {
                        "url": imageObj.imageURL,
                        "detail": "low"
                    }
                }
            ], 
            name: userName
        })
    } else {
        msgList.push({ role: 'user', content: [{
            "type": "text",
            "text": message
        }], name: userName })
    }

    vmMsgList.push({ role: 'user', content: [{
        "type": "text",
        "text": message
    }], name: userName })

    if(letReply && !alreadyInMemory){
        let replyName = await sanitize(reply.author.username, /^[a-zA-Z0-9_-]+$/g)
        let def = {
            role: replyToBarry ? "assistant" : "user",
            content: [{
                "type": "text",
                "text": reply.content
            }],
            name: replyToBarry ? botName : replyName
        }
        if(replyImage.hasImage && replyImage.imageURL != null && replyImage.imageType != "unsupportedType"){
            def.content.push({
                "type": "image_url",
                "image_url": {
                    "url": replyImage.imageURL,
                    "detail": "low"
                }
            })
        }
        msgList.splice(msgList.length - 2, 0, def)
    }

    lastMsgBKG = msgList;

    let useVM = false;
    let vmCompletion = await openai.chat.completions.create({
        model: model,
        messages: vmMsgList,
        max_tokens: 128,
    })

    if(vmCompletion.choices[0].message.content.includes("YES")){
        useVM = true;
        console.log("  [AI] Responding via voice message")
        msgList[0].content += `\nYou are responding via voice message.`
    } 
    if(client.debug) useVM = false;

    let tokens
    if(client.debug) tokens = consts.tokenLimit*4;
    else tokens = consts.tokenLimit;

    try {
        var completion = await openai.chat.completions.create({
            model: model,
            messages: msgList,
            max_tokens: tokens,
            user: msgObj.author.id,
            n: 1
        })
    } catch (e) {
        console.log(e)
        msgList[msgList.length - 1].content[1] = undefined
        var completion = await openai.chat.completions.create({
            model: "gpt-3.5-turbo-0125",
            messages: msgList,
            max_tokens: tokens,
            user: msgObj.author.id,
            n: 1
        })
    }

    if(!exists(completion)) return "Error: Unable to process that prompt. Please try again."
    let usage = completion.usage.prompt_tokens + completion.usage.completion_tokens + completion.usage.total_tokens
    let usage2 = vmCompletion.usage.prompt_tokens + vmCompletion.usage.completion_tokens + vmCompletion.usage.total_tokens
    let rate3 = 0.50/1000000
    let rate = rate3
    if(model == "gpt-4o") rate = 5/1000000
    client.cost.total+=(usage*rate)+(usage2*rate3)
    client.cost.log[Date.now().toString()] = (usage*rate)+(usage2*rate3)
    console.log(`  [AI] Completed prompt processing, total tokens: ${usage}, cost: $${(usage*rate).toFixed(6)}`)

    let returnObj = [
        completion.choices[0].message.content.toLowerCase(),
        useVM
    ]
    return returnObj
}

function setDft(obj){
    if(!obj.role) throw new cmdError("Invalid argument.", "Invalid argument.")
    if(!obj.content) throw new cmdError("Invalid argument.", "Invalid argument.")
    dft = obj
}

export { dft, chat, lastMsgBKG, setDft, openai }