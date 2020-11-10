require("dotenv").config();
require("./keepAlive.js");

const Discord = require("discord.js");
const Spotify = require("./features/Spotify");
const iTunes = require("./features/iTunes");
const Radio = require("./features/Radio/index.js");

const { TOKEN } = process.env;

const bot = new Discord.Client();

bot.login(TOKEN);

bot.on("ready", () => {
  console.info(`Logged in as ${bot.user.tag}!`);

  // Spotify(bot);
  // iTunes(bot);
  Radio(bot);
});
