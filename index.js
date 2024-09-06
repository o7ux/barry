//imports libs
import Discord from "discord.js-selfbot-v13"
import dotenv from "dotenv"
import { readdirSync } from "fs"
import { QuickDB } from "quick.db"

//import files
import consts from "./json/config.json" assert {type: "json"}
import { cmdError } from "./classes/errorOverride.js"
import { Cost } from "./classes/cost.js"

//setup
const db = new QuickDB()
const client = new Discord.Client({
  checkUpdate: false,
});
dotenv.config()

//client variables
client.debug = false
client.commands = {}
client.cost = { total: 0, log: {} }
client.blacklist = consts.userBlacklist
client.userMemory = {}
client.slurBlacklist = consts.slurBlackList
client.memLogged = false
client.messageCreateClass = null;

client.dbInit = async function () {
  if (db.get("debug") == undefined || db.get("debug") == null) await db.set("debug", false)
  if (db.get("cost") == undefined || db.get("cost") == null) await db.set("cost", { total: 0, log: {} })
  if (db.get("blacklist") == undefined || db.get("blacklist") == null) await db.set("blacklist", consts.userBlacklist)
  if (db.get("userMemory") == undefined || db.get("userMemory") == null) await db.set("userMemory", {})
  if (db.get("slurBlacklist") == undefined || db.get("slurBlacklist") == null) await db.set("slurBlacklist", consts.slurBlackList)
}

client.setDB = async function () {
  await db.set("debug", client.debug)
  await db.set("cost", client.cost)
  await db.set("messageCache", {})
  await db.set("blacklist", client.blacklist)
  await db.set("userMemory", client.userMemory)
  await db.set("slurBlacklist", client.slurBlacklist)
}

client.getDB = async function () {
  client.debug = await db.get("debug")
  client.cost = await db.get("cost")
  client.blacklist = await db.get("blacklist")
  client.userMemory = await db.get("userMemory")
  client.slurBlacklist = await db.get("slurBlacklist")
}

//event handling
async function init() {
  await client.dbInit()

  const directories = readdirSync(process.cwd() + '/commands/'),
    eventFiles = readdirSync(process.cwd() + "/events/");

  eventFiles.forEach(async (file) => {
    const eventName = file.split(".")[0];
    const event = new (await import(`./events/${file}`)).default(client);
    if(eventName == "messageCreate") client.messageCreateClass = event;
    client.on(eventName, (...args) => event.execute(...args));
  });

  directories.filter((cmd) => cmd.split(".").pop() === "js").forEach(async (cmd) => {
    const Command = new (await import(`./commands/${cmd}`)).default(client);
    client.commands[Command.name] = Command
  });

  await client.getDB()
  if (client.debug) console.log("  [DEBUG] Debug mode is on")
  client.login(process.env.BARRYTOKEN)
}

//check memory
client.checkMemory = async function () {
  let now = new Date()
  let hour = now.getUTCHours()
  let minute = now.getUTCMinutes()

  console.log(`  [MEM] ${hour}:${minute == 0 ? "00" : minute} UTC`)
  let memory = process.memoryUsage().heapUsed / 1024 / 1024
  console.log(`  [MEM] Memory usage: ${memory.toFixed(0)}MB`)
  let count = 0
  Object.keys(client.userMemory).forEach(async (key) => {
    Object.keys(client.userMemory[key]).forEach(() => {
      count++
    })
  })
  console.log(`  [MEM] User memory size: ${count}`)

  if (client.memLogged) {
    let yesterday = new Date(new Date().getTime() - (60 * 60 * 1000)).getTime()
    let cost = new Cost(client)
    let costTotal = await cost.getSince(yesterday, client.cost.log)
    console.log(`  [MEM] Total cost since last MEM check: $${costTotal.toFixed(3)}`)
  }

  client.memLogged = true
}

//toggle debug
function toggleDebug(bool) {
  if (typeof (bool) != "boolean") throw new cmdError("Not of type Boolean", "Supplied variable is not of type Boolean.");
  if (bool) client.debug = true; else client.debug = false;
}

//catch exception to avoid crashing
process.on('uncaughtException', async function (err) {
  try {
    console.error(`  [ERROR] ${err.message}`);
    console.error(`  [ERROR] Stack Trace:\n    ${err.stack}`);
    let loggingChannel = await client.channels.fetch(consts.logChannel)
    await loggingChannel.send(`<@${consts.ownerID}>\n**[ERROR] ${err.message}**`)
    await loggingChannel.send(`**[ERROR] Stack Trace:**\n    ${err.stack}`)
  } catch (e) {
    console.log(`  [ERROR] CRITICAL ERROR, CANNOT BE LOGGED`)
    await client.setDB()
  }
})

//save memory to db on exit
process.on(`exit`, async () => {
  await client.setDB()
})

//sigint handler
process.on('SIGINT', async () => {
  await client.setDB()
  process.exit()
})

export { client, toggleDebug, Discord, db}

await init()

setInterval(client.checkMemory, 1000 * 60 * 60)
setInterval(function () {
  if (client.debug) console.log("  [DEBUG] Debug mode is on")
}, 1000 * 60 * 15)