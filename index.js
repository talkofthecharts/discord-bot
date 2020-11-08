require("dotenv").config();
const Discord = require("discord.js");
const axios = require("axios");
const cheerio = require("cheerio");
const { format } = require("date-fns");
const bot = new Discord.Client();
const TOKEN = process.env.TOKEN;
const SPOTIFY_CHANNEL_ID = process.env.SPOTIFY_CHANNEL_ID;

bot.login(TOKEN);

const SpotifyDatesChecked = new Set();

const toNumber = (str) => Number(str.replace(/,/g, ""));

function precisionRound(number, precision) {
  var factor = Math.pow(10, precision);
  return Math.round(number * factor) / factor;
}

async function Spotify(channel) {
  const latestResponse = await axios.get(
    "https://spotifycharts.com/regional/us/daily/latest"
  );

  let $ = cheerio.load(latestResponse.data);

  const [month, day, year] = $('.responsive-select[data-type="date"] > ul > li')
    .first()
    .text()
    .split("/");
  const todayDateString = `${year}-${month}-${day}`;

  if (SpotifyDatesChecked.has(todayDateString)) {
    return;
  }

  SpotifyDatesChecked.add(todayDateString);

  const yesterdayDate = new Date(todayDateString);
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterdayDateString = format(yesterdayDate, "yyyy-MM-dd");

  const todayResponse = await axios.get(
    `https://spotifycharts.com/regional/us/daily/${todayDateString}`
  );
  const yesterdayResponse = await axios.get(
    `https://spotifycharts.com/regional/us/daily/${yesterdayDateString}`
  );

  function getTop200($) {
    const data = [];

    $(".chart-table-track").each((_, el) => {
      const song = $(el).find("strong").text().trim();
      const artist = $(el).find("span").text().trim();
      const streams = $(el).parent().find(".chart-table-streams").text().trim();
      data.push({ song, artist, streams });
    });

    return data;
  }

  const todayTop20 = getTop200(cheerio.load(todayResponse.data)).slice(1, 21);
  const yesterday = getTop200(cheerio.load(yesterdayResponse.data));

  const formattedString = todayTop20
    .map(({ song, artist, streams }, index) => {
      const position = `#${index + 1}`;
      const boldSong = `**${song}**`;
      const yesterdayData = yesterday.find(
        (data) => data.song === song && data.artist === artist
      );
      const yesterdayIndex = yesterdayData
        ? yesterday.findIndex(
            (data) => data.song === song && data.artist === artist
          )
        : null;
      const percentChange = yesterdayData
        ? `(${precisionRound(
            100 * -(1 - toNumber(streams) / toNumber(yesterdayData.streams)),
            0
          )}%)`
        : "";

      const positionChange = yesterdayIndex - (index + 1);
      const sign = positionChange < 0 ? "" : "+";
      const final = positionChange === 0 ? "=" : sign + positionChange;

      return `${position} (${
        yesterdayData ? final : "new"
      }). ${boldSong} ${artist} - ${streams} ${percentChange}`;
    })
    .join("\n");

  bot.channels
    .get("774843111150321664")
    .send(`Spotify US Top 20: \n ${formattedString}`);
}

bot.on("ready", (x) => {
  console.info(`Logged in as ${bot.user.tag}!`);

  setInterval(Spotify, 1000 * 60);
});
