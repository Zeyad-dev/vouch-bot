import { Command } from "@sapphire/framework";
import { Presence } from "../schemas/BotPresence";
import {
  Colors,
  EmbedBuilder,
  PresenceStatusData,
} from "discord.js";

export class PingCommand extends Command {
  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand((command) =>
      command
        .setName("set-presence")
        .setDescription("Sets the bot's presence")
        .setDMPermission(false)
        .addStringOption((option) =>
          option
            .setName("presence")
            .setDescription("The bot's status (dnd/online/etc)")
            .setRequired(true)
            .setChoices(
              {
                name: "Do not disturb",
                value: "dnd",
              },
              {
                name: "Online",
                value: "online",
              },
              {
                name: "Idle",
                value: "idle",
              },
              {
                name: "Invisible",
                value: "invisible",
              }
            )
        )
        .addStringOption((option) =>
          option
            .setName("activity-type")
            .setDescription(
              "The type of the custom activity (Playing/Listening/etc)"
            )
            .setChoices(
              {
                name: "Playing",
                value: "0",
              },
              {
                name: "Streaming",
                value: "1",
              },
              {
                name: "Listening",
                value: "2",
              },
              {
                name: "Watching",
                value: "3",
              },
              {
                name: "Custom",
                value: "4",
              },
              {
                name: "Competing",
                value: "5",
              }
            )
        )
        .addStringOption((option) =>
          option
            .setName("status-message")
            .setDescription("The message (text) of the custom activity")
            .setAutocomplete(true)
        )
        .addStringOption((option) =>
          option
            .setName("url")
            .setDescription("URL of youtube/twitch link to display (optional)")
        )
    );
  }

  public override async chatInputRun(
    interaction: Command.ChatInputCommandInteraction
  ) {
    if (interaction.user.id != "1164280293151232071")
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setDescription(
              "You must be the bot's owner in order to execute this command!"
            )
            .setColor(Colors.Red),
        ],
        ephemeral: true,
      });
    const presenceValue = interaction.options.get("presence", true)
      .value as PresenceStatusData;
    let typeValue: number | null = null;
    if (interaction.options.getString("activity-type"))
      typeValue = Number(interaction.options.get("activity-type")!.value);
    const name = interaction.options.getString("status-message");
    const schema = await Presence.find(interaction.client);
    if (schema) {
      if (
        interaction.client.user.presence.activities[0] &&
        interaction.client.user.presence.activities[0].state
      )
        schema.raw.previousActivities.push(
          interaction.client.user.presence.activities[0].state
        );
      schema.update({
        presence: presenceValue,
        activityName: name,
        activityType: typeValue,
        previousActivities: schema.raw.previousActivities,
      });
    } else
      Presence.create(interaction.client, {
        presence: presenceValue,
        activityName: name,
        activityType: typeValue,
        previousActivities: [],
        clientId: interaction.client.user.id,
      });
    interaction.client.user.setStatus(presenceValue);
    if (typeValue && name)
      interaction.client.user.setActivity(name, {
        type: typeValue,
      });
    await interaction.reply({
      content: "success!",
      ephemeral: true,
    });
  }
}
