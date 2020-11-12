require("dotenv").config();

const axios = require("axios");
const { sendMessages, memory, doc } = require("../../utils");

const {
  STREAMING_CHANNEL,
  LIVE_CHART_UPDATES_CHANNEL,
  TEST_CHANNEL,
} = process.env;
const POLLING_INTERVAL = 1000 * 60; // 1 minute

const CHANNEL_IDS = [
  STREAMING_CHANNEL,
  LIVE_CHART_UPDATES_CHANNEL,
  TEST_CHANNEL,
];

async function getDocument() {
  const response = await axios.get("https://kworb.net/charts/apple_s/us.html");
  return doc(response.data);
}

async function getNumberOne(document) {
  const numberOneSong = document.querySelector("tbody .mp.text").textContent;

  if (memory("AppleMusic", { type: "#1", payload: numberOneSong })) {
    return [];
  }

  return [`**${numberOneSong}** is now #1 on US Apple Music.`];
}

async function getNewTopTens(document) {
  const topTen = [...document.querySelectorAll("tbody .mp.text")]
    .slice(0, 10)
    .map((node, index) => ({ song: node.textContent, position: index + 1 }));

  const newTopTens = memory("AppleMusic", { type: "top10", payload: topTen });

  return newTopTens.map(
    ({ song, position }) =>
      `**${song}** has entered the Top 10 on US Apple Music at #${position}.`
  );
}

module.exports = (bot) => {
  const main = async () => {
    const document = await getDocument();
    const numberOneMessages = await getNumberOne(document);
    const newTopTens = await getNewTopTens(document);

    sendMessages(
      bot.channels,
      [...numberOneMessages, ...newTopTens],
      CHANNEL_IDS
    );
  };

  main();
  setInterval(main, POLLING_INTERVAL);
};
