import fetch from "node-fetch"

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

async function fetchBase64fromURL(url) {
  try {
    const res = await fetch(url);
    const buffer = await res.buffer();
    return buffer.toString('base64');
  } catch (error) {
    console.error(`Error fetching base64 from URL: ${error}`);
    return null;
  }
}

export { log, wait, chunkSubstr, exists, sanitize, insertBeforeLast, fetchBase64fromURL }
