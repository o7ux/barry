import consts from "../json/config.json" assert {type: "json"}
import { client } from "../index.js";

async function log(message, send) {
  console.log(message)
  if (send && consts.logToChannel) {
    let loggingChannel = await client.channels.fetch(consts.logChannel)
    await loggingChannel.send(message.substring(7))
  }
  return;
}

const wait = (n) => new Promise((resolve) => setTimeout(resolve, n));

function chunkSubstr(str, size) {
  const numChunks = Math.ceil(str.length / size)
  const chunks = new Array(numChunks)

  for (let i = 0, o = 0; i < numChunks; ++i, o += size) {
    chunks[i] = str.substr(o, size)
  }

  return chunks
}

function exists(obj) {
  if(typeof obj == "undefined" || obj == null || obj == undefined) return false; else return true;
}

function sanitize(string, regex) {
  let santized = ""
  for (let i = 0; i < string.length; i++) {
    if (regex.test(string[i])) santized += string[i]
    regex.lastIndex = 0;
  }
  return santized;
}

export { log, wait, chunkSubstr, exists, sanitize }