import { client } from "../index.js"
import consts from "../json/config.json" assert {type: "json"}
import fs from "fs"

const CreateFiles = fs.createWriteStream('./log.log', { flags: 'a' })

async function msgLog(msg) {
    if (client.debug || msg.channel.id == consts.logChannel) return;

    let output = "  [INFO] ";
    output += `[${msg.createdAt.toString().slice(4, 24)}] `

    if (msg.channel.type == `DM` || msg.channel.type == `GROUP_DM`) output += `(DirectMessage) `
    else output += `(${msg.guild.name}.${msg.channel.name}) `

    output += `${msg.author.username} : ${msg.content}`

    let end = Math.floor(output.length + 1)
    CreateFiles.write(JSON.stringify(output.toString()).slice(3, end) + '\r\n')
}

export { msgLog }