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

module.exports = {
  getPercentChange,
  sendMessages,
};
