require("dotenv").config();

const axios = require("axios");
const cheerio = require("cheerio");
const { sendMessages, memory } = require("../../utils");
const { format } = require("date-fns");

const { RADIO_CHANNEL, LIVE_CHART_UPDATES_CHANNEL, TEST_CHANNEL } = process.env;
const POLLING_INTERVAL = 1000 * 60 * 2; // 2 minutes

async function buildMessagesFromRadioChart() {
  const response = await axios.get("https://kworb.net/radio");
  const $ = cheerio.load(response.data);

  const [year, month, day] = $(".pagetitle")
    .first()
    .text()
    .split("|")[1]
    .trim()
    .split("/");

  const todayDateString = `${year}-${month}-${day}`;

  if (memory("Radio", { payload: todayDateString })) {
    return [];
  }

  const data = [];

  $("tbody tr").each((index, el) => {
    const pPlus = $(el).find("td:nth-child(2)").first().text();
    const song = $(el).find(".mp.text").first().text();
    const $aud = $(el).find("td:nth-child(7)").first();
    const aud = $aud.text();
    const audIncrease = $aud.next().text();
    const formats = $aud.next().next().text();

    data.push({ song, pPlus, aud, audIncrease, formats, index });
  });

  function formatSongData({ song, aud, audIncrease, formats, pPlus, index }) {
    const audIncreaseNumber = Number(audIncrease);
    return `#${index + 1}. (${
      pPlus || "--"
    }) **${song}** - ${aud}m (${audIncrease}m) [${formats}] ${
      audIncreaseNumber <= -1 ? "🔴" : audIncreaseNumber >= 1 ? "🟢" : ""
    }`;
  }

  const formattedRadioData = data.map(formatSongData);

  const biggestIncreases = data
    .slice()
    .sort((a, b) => Number(b.audIncrease) - Number(a.audIncrease))
    .map(formatSongData);

  return [
    `https://upload.wikimedia.org/wikipedia/en/1/18/Mediabase_corporate_logo.png`,

    format(new Date(todayDateString), "MMM. d, y (EEEE)"),

    formattedRadioData.slice(0, 20),

    formattedRadioData.slice(20, 40),

    `:chart_with_upwards_trend: Biggest audience increases:\n${biggestIncreases
      .slice(0, 10)
      .join("\n")}`,

    `:chart_with_downwards_trend: Biggest audience decreases:\n${biggestIncreases
      .slice()
      .reverse()
      .slice(0, 10)
      .join("\n")}`,
  ];
}

module.exports = (bot) => {
  const main = async () => {
    const now = new Date();
    now.setDate(now.getDate() - 1);
    const utcHours = now.getUTCHours();

    // Avoid pinging unnecessarily
    if (utcHours > 12 && utcHours < 16) {
      sendMessages(bot.channels, await buildMessagesFromRadioChart(), [
        RADIO_CHANNEL,
        LIVE_CHART_UPDATES_CHANNEL,
        TEST_CHANNEL,
      ]);
    }
  };

  main();
  setInterval(main, POLLING_INTERVAL);
};
