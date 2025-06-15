import fetch from "node-fetch"
import { parse } from "node-html-parser";
import client from "../index.js";

async function log(message, send) {
  console.log(message)
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

function insertBeforeLast(array, item) {
  return [...array.slice(0, array.length - 1), item, array[array.length - 1]]
}

async function fetchBase64fromURL(url, timeoutMs = 5000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    if (/tenor\.com\/view\//.test(url)) {
      const res = await fetch(url, { signal: controller.signal });
      const html = await res.text();
      clearTimeout(timeoutId);

      const root = parse(html);
      const meta = root.querySelector('meta[property="og:image"]');
      if (!meta) {
        console.error("No og:image meta tag found in Tenor page");
        return null;
      }

      const imageUrl = meta.getAttribute("content");
      if (!imageUrl) return null;

      return await fetchBase64fromURL(imageUrl); // recursive call
    }

    const res = await fetch(url, { 
      signal: controller.signal 
    });
    
    const buffer = await res.buffer();
    clearTimeout(timeoutId);
    return buffer.toString('base64');
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      console.error(`Fetch timeout after ${timeoutMs}ms for URL: ${url}`);
    } else {
      console.error(`Error fetching base64 from URL: ${error}`);
    }
    return null;
  }
}

function chunkString(str, size) {
  const chunks = [];
  for (let i = 0; i < str.length; i += size) {
    chunks.push(str.slice(i, i + size));
  }
  return chunks;
}

function sanitizeContent(content) {
  return content
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // Remove control chars
      .replace(/\uFFFD/g, '') // Remove replacement chars
      .trim()
}

function logToDiscord(message) {
  try {
    const guild = client.guilds.cache.get("1210168325791817778");
    const channel = guild.channels.cache.get("1210185956603469834");
    channel.send(message);
  } catch (error) {
    console.error("Error logging to Discord:", error);
  }
}

export { log, wait, chunkSubstr, exists, sanitize, insertBeforeLast, fetchBase64fromURL, chunkString, sanitizeContent, logToDiscord }
