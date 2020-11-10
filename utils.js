const fs = require("fs");

const MEMORY = JSON.parse(fs.readFileSync("./memory.json"));

const toNumber = (str) => Number(str.replace(/,/g, ""));

const precisionRound = (number, precision) =>
  Math.round(number * Math.pow(10, precision)) / Math.pow(10, precision);

const getPercentChange = (a, b) =>
  precisionRound(100 * -(1 - toNumber(a) / toNumber(b)), 0);

const sendMessages = (channels, messages, channelIds) => {
  messages.forEach((message) => {
    channelIds.forEach((channelId) => {
      channels.get(channelId).send(message);
    });
  });
};

const memory = (field, { type = null, payload }) => {
  if (type == null) {
    if (MEMORY[field].datesChecked.includes(payload)) {
      return true;
    }

    MEMORY[field].datesChecked.push(payload);
    fs.writeFileSync("./memory.json", JSON.stringify(MEMORY, null, 2));

    return false;
  }

  if (field === "iTunes" && type === "#1") {
    if (MEMORY.iTunes.numberOnes.includes(payload)) {
      return true;
    }

    MEMORY.iTunes.numberOnes.push(payload);
    fs.writeFileSync("./memory.json", JSON.stringify(MEMORY, null, 2));

    return false;
  }
};

module.exports = {
  getPercentChange,
  sendMessages,
  memory,
};
