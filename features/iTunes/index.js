require("dotenv").config();

const axios = require("axios");
const cheerio = require("cheerio");
const { format } = require("date-fns");
const { sendMessages, memory } = require("../../utils");

const { SALES_CHANNEL, LIVE_CHART_UPDATES_CHANNEL, TEST_CHANNEL } = process.env;
const POLLING_INTERVAL = 1000 * 60; // 1 minute

const CHANNEL_IDS = [SALES_CHANNEL, LIVE_CHART_UPDATES_CHANNEL, TEST_CHANNEL];

// The 50th song has this many sales per day (requires calibration).
const REFERENCE_SALES = 2000 / 7;

async function getNumberOne() {
  const response = await axios.get("https://kworb.net/charts/itunes/us.html");
  const $ = cheerio.load(response.data);
  const numberOneSong = $("tbody .mp.text").first().text();

  if (memory("iTunes", { type: "#1", payload: numberOneSong })) {
    return [];
  }

  return [`**${numberOneSong}** is now #1 on US iTunes.`];
}

async function getDailySailes(yesterdayDateString) {
  const response = await axios.get("https://kworb.net/pop/week.html");
  const $ = cheerio.load(response.data);

  const referenceRatio = Number(
    $(".popbars tbody tr:nth-child(50) .bw").first().text().trim()
  );

  const data = [];

  $(".popbars tbody tr").each((index, el) => {
    const song = $(el).find(".mp.text").text().trim();
    const ratio = Number($(el).find(".bw").first().text().trim());

    data.push({
      song,
      sales: Math.round((ratio / referenceRatio) * REFERENCE_SALES),
    });
  });

  const formattedSalesData = data.map(
    ({ song, sales }, index) =>
      `#${index + 1}. **${song}** - ${sales.toLocaleString("en-US")}`
  );

  const date = format(new Date(yesterdayDateString), "MMM. d, y (EEEE)");

  return [
    `https://upload.wikimedia.org/wikipedia/commons/thumb/2/2a/ITunes_12.2_logo.png/768px-ITunes_12.2_logo.png`,

    `US digital sales est. for ${date}:`,

    formattedSalesData.slice(0, 20).join("\n"),

    formattedSalesData.slice(20, 40).join("\n"),
  ];
}

module.exports = (bot) => {
  const main = async () => {
    const now = new Date();
    now.setDate(now.getDate() - 1);
    const yesterdayDateString = format(now, "yyyy-MM-dd");

    if (
      now.getUTCHours() === 12 &&
      !memory("iTunes", { payload: yesterdayDateString })
    ) {
      sendMessages(
        bot.channels,
        await getDailySailes(yesterdayDateString),
        CHANNEL_IDS
      );
    }

    sendMessages(bot.channels, await getNumberOne(), CHANNEL_IDS);
  };

  main();
  setInterval(main, POLLING_INTERVAL);
};
