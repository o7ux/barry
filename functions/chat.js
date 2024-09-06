import consts from "../json/config.json" assert {type: "json"}
import rep from "../json/slangify.json" assert {type:"json"}
import unai from "../json/unopenAI.json" assert {type:"json"}
import parse from "../json/parse4ai.json" assert {type:"json"}
import { client } from "../index.js"

function slangify(msg2send, guildID) {

  let punctuation = [",", ".", "!", "?", " "]

  // safe replacements
  Object.keys(rep.safeReplacements).forEach( function(key) {
    let value = rep.safeReplacements[key]
    punctuation.forEach( async x => {
      msg2send = msg2send.toLowerCase().replaceAll(`${key}${x}`, `${value}${x}`)
    })
  })

  //return if server is slur blacklisted
  if (consts.slurBlackList.includes(guildID) || client.slurBlacklist.includes(guildID)) return (msg2send)

  // unsafe replacements
  Object.keys(rep.unsafeReplacements).forEach( function(key) {
    let value = rep.unsafeReplacements[key]
    punctuation.forEach( async x => {
      msg2send = msg2send.toLowerCase().replaceAll(`${key}${x}`, `${value}${x}`)
    })
  })

  return (msg2send)
}

function unslangify(msg2send) {
  let punctuation = [",", ".", "!", "?", " "]

  // safe replacements
  Object.keys(rep.safeReplacements).forEach( function(key) {
    let value = rep.safeReplacements[key]
    punctuation.forEach( async x => {
      msg2send = msg2send.toLowerCase().replaceAll(`${value}${x}`, `${key}${x}`)
    })
  })
  Object.keys(rep.unsafeReplacements).forEach( function(key) {
    let value = rep.unsafeReplacements[key]
    punctuation.forEach( async x => {
      msg2send = msg2send.toLowerCase().replaceAll(`${value}${x}`, `${key}${x}`)
    })
  })

  return (msg2send)
}

function parse4ai(msg2ai) {
  Object.keys(parse).forEach( function(key) {
    let value = parse[key]
    msg2ai = msg2ai.toLowerCase().replaceAll(key, value)
  })
  msg2ai = msg2ai.toLowerCase().replaceAll(`<@${consts.id}>`, consts.name)
  return (msg2ai)
}

function unopenAI(msg2send) {
  let list = unai.defaultCheckList;
  for (let i = 0; i < list.length; i++) {

    //default response list
    let resList = unai.defaultResponseList;

    //handle messages
    let randomgensays = Math.floor(Math.random() * (resList.length - 1));
    msg2send = msg2send.replaceAll(`i'm very sorry, ${list[i]}`, resList[randomgensays])
    msg2send = msg2send.replaceAll(`i'm so sorry, ${list[i]}`, resList[randomgensays])
    msg2send = msg2send.replaceAll(`i'm sorry, ${list[i]}`, resList[randomgensays])
    msg2send = msg2send.replaceAll(`sorry, ${list[i]}`, resList[randomgensays])
    msg2send = msg2send.replaceAll(list[i], resList[randomgensays])

    //handling openai bypasses
    msg2send = msg2send.replaceAll(`${consts.username} says:`, "")
    msg2send = msg2send.replaceAll(`${consts.username}`, "")
    msg2send = msg2send.replaceAll(`as ${consts.username}:`, "")
    msg2send = msg2send.replaceAll(`${consts.name} says:`, "")
    msg2send = msg2send.replaceAll(`${consts.name}:`, "")
    msg2send = msg2send.replaceAll(`as ${consts.name}:`, "")
  }
  return (msg2send)
}

export { unopenAI, slangify, parse4ai, unslangify}