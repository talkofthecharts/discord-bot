require("dotenv").config();

const axios = require("axios");
const cheerio = require("cheerio");
const { sendMessages, memory } = require("../../utils");
const { format } = require("date-fns");

const { SALES_CHANNEL, LIVE_CHART_UPDATES_CHANNEL } = process.env;
const POLLING_INTERVAL = 1000 * 60; // 1 minute

// The 50th song has this many sales per day (requires calibration).
const REFERENCE_SALES = 2400 / 7;

async function getDailySailes() {
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
      `#${index + 1}. **${song}** (${sales.toLocaleString("en-US")})`
  );

  return [
    `https://upload.wikimedia.org/wikipedia/commons/thumb/2/2a/ITunes_12.2_logo.png/768px-ITunes_12.2_logo.png`,

    `US digital sales in the past 24 hours (est.):`,

    formattedSalesData.slice(0, 20).join("\n"),

    formattedSalesData.slice(20, 40).join("\n"),
  ];
}

module.exports = (bot) => {
  const main = async () => {
    const now = new Date();
    now.setDate(now.getDate() - 1);
    const yesterdayDateString = format(now, "yyyy-dd-mm");

    if (now.getUTCHours() === 12 && !memory("iTunes", yesterdayDateString)) {
      sendMessages(bot.channels, await getDailySailes(), [
        SALES_CHANNEL,
        LIVE_CHART_UPDATES_CHANNEL,
      ]);
    }
  };

  main();
  setInterval(main, POLLING_INTERVAL);
};
