require("dotenv").config();
const Discord = require("discord.js");
const axios = require("axios");
const cheerio = require("cheerio");
const bot = new Discord.Client();
const TOKEN = process.env.TOKEN;

bot.login(TOKEN);

function Spotify() {
  function initialStep() {
    axios
      .get("https://spotifycharts.com/regional/us/daily/latest")
      .then((response) => {
        const $ = cheerio.load(response.data);
        const latestDate = $(
          '.responsive-select[data-type="date"] > ul > li'
        ).text();
        const [month, day, year] = latestDate.split("/");
        fetchLatestChart({ year, month, day });
      });
  }

  function fetchLatestChart({ year, month, day }) {
    axios
      .get(
        `https://spotifycharts.com/regional/us/daily/${year}-${month}-${day}`
      )
      .then((response) => {
        const $ = cheerio.load(response.data);
        console.info($(".chart-table-track > span").text());
      });
  }
}

bot.on("ready", () => {
  console.info(`Logged in as ${bot.user.tag}!`);

  Spotify();
});
