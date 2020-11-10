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

const memory = (field, date) => {
  if (MEMORY[field].datesChecked.includes(date)) {
    return true;
  }

  MEMORY[field].datesChecked.push(date);
  fs.writeFileSync("./memory.json", JSON.stringify(MEMORY, null, 2));

  return false;
};

module.exports = {
  getPercentChange,
  sendMessages,
  memory,
};
