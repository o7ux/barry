//imports libs
import Discord from "discord.js-selfbot-v13"
import dotenv from "dotenv"
import fs, { readdirSync } from "fs"
import { JSONFilePreset } from 'lowdb/node'

//import files
import config from "./config/config.json" with {type: "json"}
import ErrorExtended from "./classes/errorOverride.js"
import * as utils from "./functions/util.js"
import commandHandler from "./classes/commandHandler.js"
import UserMemory from "./classes/userMemory.js"

//setup
const client = new Discord.Client({
  checkUpdate: false,
});

dotenv.config()

const isDev = process.argv.includes('--dev')

//database

const defaultData = {
  memory: {},
  blacklist: [],
  config: { debug: false }
}

const db = await JSONFilePreset(isDev ? './data/db-dev.json' : './data/db.json', defaultData)

//client variable declarations

client.commands = {};

client.cleanShutdown = async function () {
  console.log("Shutting down...");
  await client.writeMemory(); // save memory to db
  client.destroy();
  console.log("Shutdown complete. Goodbye!");
  process.exit(0);
};

client.toggleDebug = function (bool) {
  if (typeof (bool) != "boolean") throw new ErrorExtended("Not of type Boolean", "Supplied variable is not of type Boolean.");

  if (bool) client.debug = true;
  else client.debug = false;
}

async function init() {

  const commandFiles = readdirSync(process.cwd() + '/commands/'),
    eventFiles = readdirSync(process.cwd() + "/events/");

  eventFiles.filter((file) => file.split(".").pop() === "js").forEach(async (file) => {
    const eventName = file.split(".")[0];
    const event = new (await import(`./events/${file}`)).default(client);

    client.on(eventName, (...args) => event.execute(...args));

    if (eventName == "messageCreate") {
      client.createClass = event;
      console.log(`[INIT] MessageCreate event initialized.`)
    }
  });

  commandFiles.filter((file) => file.split(".").pop() === "js").forEach(async (file) => {
    const Command = new (await import(`./commands/${file}`)).default(client);
    client.commands[Command.name] = Command
  });

  client.utils = utils;
  client.config = config;
  client.isDev = isDev;

  const commandHandlerInstance = new commandHandler(client);
  client.runCommand = commandHandlerInstance.handleMessage.bind(commandHandlerInstance);

  await initMemory();
  client.writeMemory = writeMemory.bind(client);

  await client.login(isDev ? process.env.DISCORD_TOKEN_DEV : process.env.DISCORD_TOKEN)
  console.log(`[LOGIN] Running in ${isDev ? "Development" : "Production"} mode`)
}

async function initMemory() {
  const userMemory = new UserMemory(client, db.data.memory);
  const blacklistedUsers = db.data.blacklist;

  client.properties = {
    debug: db.data.config.debug
  };

  client.userMemory = userMemory;
  client.blacklistedUsers = blacklistedUsers;

  console.log(`[INIT] Memory initialized.`)
}

async function writeMemory() {
  db.data.memory = client.userMemory.memory;
  db.data.blacklist = client.blacklistedUsers;
  db.data.config.debug = client.properties.debug;
  await db.write();
}

//catch exception to avoid crashing
process.on('uncaughtException', async function (err) {
  try {
    console.error(`Handled exception: ${err.stack}`);
    await client.writeMemory();
  } catch (e) {
    console.error(`Unable to handle exception: ${e.message}`);
    process.exit(1);
  }
});

process.on('unhandledRejection', async (reason) => {
  try {
    console.error(`Unhandled rejection: ${reason}`);
    await client.writeMemory();
  } catch (e) {
    console.error(`Unable to handle rejection: ${e.message}`);
    process.exit(1);
  }
});

//save memory on shutdown
process.on('SIGINT', async () => {
  console.log("\nSIGINT received.");
  await client.writeMemory();
  console.log("\nMemory saved.");
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log("\nSIGTERM received.");
  await client.writeMemory();
  console.log("\nMemory saved.");
  process.exit(0);
});


export default client;

await init();