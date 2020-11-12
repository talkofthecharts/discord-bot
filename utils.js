const fs = require("fs");
const { JSDOM } = require("jsdom");

const toNumber = (str) => Number(str.replace(/,/g, ""));

const precisionRound = (number, precision) =>
  Math.round(number * Math.pow(10, precision)) / Math.pow(10, precision);

const getPercentChange = (a, b, { round = false } = {}) => {
  const raw = 100 * -(1 - toNumber(a) / toNumber(b));
  return round ? precisionRound(raw, 0) : raw;
};

const sendMessages = (channels, messages, channelIds) => {
  messages.forEach((message) => {
    channelIds.forEach((channelId) => {
      channels.get(channelId).send(message);
    });
  });
};

const memory = (field, { type = null, payload }) => {
  const MEMORY = JSON.parse(fs.readFileSync("./memory.json"));

  if (type == null) {
    if (MEMORY[field].datesChecked.includes(payload)) {
      return true;
    }

    MEMORY[field].datesChecked.push(payload);
    fs.writeFileSync("./memory.json", JSON.stringify(MEMORY, null, 2));

    return false;
  }

  if (type === "#1") {
    if (MEMORY[field].numberOnes.includes(payload)) {
      return true;
    }

    MEMORY[field].numberOnes.push(payload);
    fs.writeFileSync("./memory.json", JSON.stringify(MEMORY, null, 2));

    return false;
  }

  if (type === "top10") {
    const newTopTens = payload.filter(
      (song) => !MEMORY[field].topTens.includes(song)
    );

    MEMORY[field].topTens.push(...newTopTens);
    fs.writeFileSync("./memory.json", JSON.stringify(MEMORY, null, 2));

    return newTopTens;
  }
};

const doc = (html) => new JSDOM(html).window.document;

module.exports = {
  getPercentChange,
  sendMessages,
  memory,
  doc,
};
