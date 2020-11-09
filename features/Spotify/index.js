require("dotenv").config();
require("./keepAlive.js");

const axios = require("axios");
const cheerio = require("cheerio");
const { format } = require("date-fns");
const fs = require("fs");
const { getPercentChange } = require("../../utils");

const { SPOTIFY_CHANNEL, LIVE_CHART_UPDATES_CHANNEL } = process.env;
const POLLING_INTERVAL = 60 * 1000; // 1 minute
const MEMORY_FILE = "./memory.json";
const MEMORY = JSON.parse(fs.readFileSync(MEMORY_FILE));

let bot = null;

function setBot(b) {
  bot = b;
}

function sendMessages(messages, channelIds) {
  messages.forEach((message) => {
    channelIds.forEach((channelId) => {
      bot.channels.get(channelId).send(message);
    });
  });
}

function formatSongData({ song, artist, streams, index, yesterdaysChart }) {
  const position = `#${index}`;
  const boldSong = `**${song}**`;

  const yesterdayData = yesterdaysChart.find(
    (data) => data.song === song && data.artist === artist
  );
  const percentChange = yesterdayData
    ? getPercentChange(streams, yesterdayData.streams)
    : null;
  const yesterdayIndex = yesterdayData
    ? yesterdaysChart.findIndex(
        (data) => data.song === song && data.artist === artist
      )
    : null;
  const percentChangeFormatted = yesterdayData
    ? `${percentChange < 0 ? "🔴" : "🟢"} ${percentChange}%`
    : "🟣";

  const positionChange = yesterdayIndex - index + 1;
  const pPlus = yesterdayData
    ? positionChange === 0
      ? "="
      : (positionChange < 0 ? "" : "+") + positionChange
    : null;

  return `${position}. ${
    pPlus ? `(${pPlus})` : ""
  } ${boldSong} - ${streams} ${percentChangeFormatted}`;
}

function getTop200($) {
  const data = [];

  $(".chart-table-track").each((index, el) => {
    if (index !== 0) {
      data.push({ index, ...getSongDetails($(el)) });
    }
  });

  return data;
}

function getDebuts($) {
  const debuts = [];

  $(".chart-table-track").each((index, el) => {
    if (
      index !== 0 &&
      $(el).parent().find(".chart-table-trend__icon > svg > circle").length
    ) {
      debuts.push({ index, ...getSongDetails($(el)) });
    }
  });

  return debuts;
}

function getSongDetails($el) {
  const song = $el.find("strong").text().trim();
  const artist = $el.find("span").text().trim();
  const streams = $el.parent().find(".chart-table-streams").text().trim();

  return { song, artist, streams };
}

async function handleCommand(command) {
  let messages = [];

  switch (command) {
    case "song":
      // messages = await buildMessagesForSongStats(action.payload);
      break;
    default:
      messages = ["Command not recognized."];
      break;
  }

  sendMessages(messages, []);
}

async function buildMessagesFromLatestChart() {
  const latestResponse = await axios.get(
    "https://spotifycharts.com/regional/us/daily/latest"
  );

  const [month, day, year] = cheerio
    .load(latestResponse.data)('.responsive-select[data-type="date"] > ul > li')
    .first()
    .text()
    .split("/");
  const todayDateString = `${year}-${month}-${day}`;

  if (MEMORY.Spotify.datesChecked.includes(todayDateString)) {
    return [];
  } else {
    MEMORY.Spotify.datesChecked.push(todayDateString);
    fs.writeFileSync(MEMORY_FILE, JSON.stringify(MEMORY, null, 2));
  }

  const yesterdayDate = new Date(todayDateString);
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterdayDateString = format(yesterdayDate, "yyyy-MM-dd");

  const todayResponse = await axios.get(
    `https://spotifycharts.com/regional/us/daily/${todayDateString}`
  );
  const yesterdayResponse = await axios.get(
    `https://spotifycharts.com/regional/us/daily/${yesterdayDateString}`
  );

  const $today = cheerio.load(todayResponse.data);
  const $yesterday = cheerio.load(yesterdayResponse.data);
  const todaysChart = getTop200($today);
  const yesterdaysChart = getTop200($yesterday);
  const formattedStrings = todaysChart.map((data) =>
    formatSongData({ ...data, yesterdaysChart })
  );

  // TODO: optimize this as it's pretty slow atm lol
  const biggestIncreases = [...todaysChart]
    .sort((a, b) => {
      const aYesterday = yesterdaysChart.find(
        (data) => data.song === a.song && data.artist === a.artist
      );
      const bYesterday = yesterdaysChart.find(
        (data) => data.song === b.song && data.artist === b.artist
      );
      const aChange = aYesterday
        ? getPercentChange(a.streams, aYesterday.streams)
        : 0;
      const bChange = bYesterday
        ? getPercentChange(b.streams, bYesterday.streams)
        : 0;

      return bChange - aChange;
    })
    .map((data) => formatSongData({ ...data, yesterdaysChart }));

  return [
    // Spotify logo
    "https://storage.googleapis.com/pr-newsroom-wp/1/2018/11/Spotify_Logo_CMYK_Green.png",

    // 1-20 of the top 40
    `🏆 Spotify US Top 40: \n ${formattedStrings.slice(0, 20).join("\n")}`,

    // 20-40 of the top 40
    formattedStrings.slice(20, 40).join("\n"),

    // NOTE: we may need to split this into two messages if there are tons of
    // debuts, it will fail if the string is >2000 characters. For now let's
    // see how it does for most cases. Also, no way to tell if a song is a
    // debut or a re-entry, so all are "new" right now.
    `🔮 Spotify US debuts/re-entries: \n ${getDebuts($today)
      .map((data) => formatSongData({ ...data, yesterdaysChart }))
      .join("\n")}`,

    `📈 Spotify US biggest percent increases: \n ${biggestIncreases
      .slice(0, 10)
      .join("\n")}`,

    `📉 Spotify US biggest percent decreases: \n ${biggestIncreases
      .slice()
      .reverse()
      .slice(0, 10)
      .join("\n")}`,
  ];
}

module.exports = (bot) => {
  setBot(bot);

  setInterval(async () => {
    sendMessages(await buildMessagesFromLatestChart(), [
      SPOTIFY_CHANNEL,
      LIVE_CHART_UPDATES_CHANNEL,
    ]);
  }, POLLING_INTERVAL);

  bot.on("message", (message) => {
    if (message.content.startsWith(".Spotify")) {
      handleCommand(message.content.split(".Spotify ")[1]);
    }
  });
};
