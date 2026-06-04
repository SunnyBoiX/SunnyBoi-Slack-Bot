const axios = require("axios");
require("dotenv").config();

const { App } = require("@slack/bolt");

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  appToken: process.env.SLACK_APP_TOKEN,
  socketMode: true,
});

let gameState = {
  isActive: false,
  currentHolder: null,
  timerId: null,
  channelId: null,
  fuseLength: 0,
};

let friedLeaderboard = {};
let successfulpasses = {};

function getRandomSeconds(min, max) {
  const minCeiled = Math.ceil(min);
  const maxFloored = Math.floor(max);

  return Math.floor(Math.random() * (maxFloored - minCeiled) + minCeiled);
}

function explodePotato() {
  if (!gameState.isActive) return;

  const victim = gameState.currentHolder;
  const channel = gameState.channelId;

  if (!friedLeaderboard[victim]) {
    friedLeaderboard[victim] = 0;
  }
  friedLeaderboard[victim]++;

  gameState.isActive = false;
  gameState.currentHolder = null;
  gameState.timerId = null;

  app.client.chat
    .postMessage({
      channel: channel,
      text: `💥FAHHH. The potato exploded in <@${victim}>'s hands!\n💀 Total losses for them: *${friedLeaderboard[victim]}*`,
    })
    .catch((error) => console.error("Slack postMessage error:", error));
}

app.command("/ssb-ping", async ({ command, ack, respond }) => {
  const start = Date.now();
  await ack();
  const latency = Date.now() - start;
  await respond({ text: `Pong!\nLatency: ${latency}ms` });
});

app.command("/drop-potato", async ({ command, ack, respond }) => {
  await ack();

  if (gameState.isActive) {
    await respond({
      text: `A game is already active! <@${gameState.currentHolder}> is holding the potato.`,
    });
    return;
  }

  const randomFuse = getRandomSeconds(20, 46);

  gameState.isActive = true;
  gameState.currentHolder = command.user_id;
  gameState.channelId = command.channel_id;
  gameState.fuseLength = randomFuse;

  gameState.timerId = setTimeout(explodePotato, randomFuse * 1000);

  try {
    await app.client.chat.postMessage({
      channel: command.channel_id,
      text: `Hot potato started! <@${command.user_id}> has it. Run /pass @user quickly!`,
    });
  } catch (error) {
    console.error("Failed to start game:", error);
  }
});

app.command("/ssb-help", async ({ ack, respond }) => {
  await ack();
  await respond({
    text: `Available Commands:
/ssb-ping - Check bot latency
/ssb-catfact - Get a cat fact
/ssb-joke - Get a random joke`,
  });
});

app.command("/ssb-catfact", async ({ ack, respond }) => {
  await ack();

  try {
    const response = await axios.get("https://catfact.ninja/fact");
    await respond({ text: `Cat Fact:\n${response.data.fact}` });
  } catch (err) {
    await respond({ text: "Failed to fetch a cat fact." });
  }
});

app.command("/ssb-joke", async ({ ack, respond }) => {
  await ack();

  try {
    const response = await axios.get(
      "https://official-joke-api.appspot.com/random_joke",
    );
    await respond({
      text: `${response.data.setup}

${response.data.punchline}`,
    });
  } catch (err) {
    await respond({ text: "Failed to fetch a joke." });
  }
});

(async () => {
  await app.start();
  console.log("bot is running!");
})();
