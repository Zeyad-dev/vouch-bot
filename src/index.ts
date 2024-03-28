import process from "node:process";
import { SapphireClient } from "@sapphire/framework";
import { GatewayIntentBits } from "discord.js";

const intents = [
  GatewayIntentBits.Guilds,
  GatewayIntentBits.GuildMembers,
  GatewayIntentBits.GuildModeration,
  GatewayIntentBits.GuildEmojisAndStickers,
  GatewayIntentBits.GuildInvites,
  GatewayIntentBits.GuildPresences,
  GatewayIntentBits.GuildMessages,
  GatewayIntentBits.MessageContent,
];

const client = new SapphireClient<true>({
  intents,
});

client.login(process.env.DISCORD_TOKEN);
