import { Command } from "@sapphire/framework";
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonComponent,
  ButtonStyle,
  Colors,
  CommandInteraction,
  ComponentType,
  EmbedBuilder,
  Message,
  MessageActionRowComponentBuilder,
  PermissionsBitField,
  channelMention,
  formatEmoji,
  time,
  userMention,
} from "discord.js";
import { Tickets, TicketsSchema } from "../schemas/TicketsSchema";

export class PingCommand extends Command {
  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand((command) =>
      command
        .setName("view-tickets")
        .setDescription("view all tickets on this server")
        .setDMPermission(false)
        .addUserOption((option) =>
          option
            .setName("user")
            .setDescription("Show vouches only for the specified user")
        )
        .addIntegerOption((option) =>
          option
            .setName("ticket-number")
            .setDescription("Show vouches only for the specified ticket-number")
            .setMinValue(1)
        )
    );
  }

  public override async chatInputRun(
    interaction: Command.ChatInputCommandInteraction
  ) {
    await interaction.deferReply({
      ephemeral: true,
    });

    const userOption = interaction.options.getUser("user");
    const ticketNumberOption = interaction.options.getInteger("ticket-number");

    if (
      !(interaction.member!.permissions as PermissionsBitField).has(
        PermissionsBitField.Flags.ManageGuild
      )
    )
      return await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(Colors.Red)
            .setDescription(
              `${formatEmoji(
                "1221828309743046677",
                true
              )} | You are missing the \`MANAGE SERVER\` permission to execute this command!`
            ),
        ],
      });

    const schema = await TicketsSchema.get(interaction.client, {
      guildId: interaction.guild!.id,
    });

    let { tickets } = schema.raw;
    if (!tickets)
      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(Colors.Red)
            .setDescription(
              `${formatEmoji(
                "1221828309743046677",
                true
              )} | There are no tickets in this server yet!`
            ),
        ],
      });
    if (userOption && !ticketNumberOption)
      tickets = tickets.filter((ticket) => ticket.userId == userOption.id);
    if (ticketNumberOption)
      tickets = tickets.filter(
        (ticket) => ticket.ticketNumber === ticketNumberOption
      );
    if (tickets.length === 0) {
      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(Colors.Red)
            .setDescription(
              `${formatEmoji(
                "1221828309743046677",
                true
              )} | There are no tickets to show with your specified filters!`
            ),
        ],
      });
    }
    let currentCount = 0;
    const message = await interaction.editReply(
      await embed(interaction, tickets, currentCount)
    );
    startCollector(interaction, message, tickets, currentCount);
  }
}

const embed = async (
  interaction: CommandInteraction,
  tickets: Tickets[],
  currentCount: number
) => {
  const ticket = tickets[currentCount];
  const channel = interaction.guild?.channels.cache.get(ticket.channelId);
  const finalEmbed = new EmbedBuilder()
    .setTitle(`Ticket #${ticket.ticketNumber}`)
    .setFields([
      {
        name: "Opened by:",
        value: userMention(ticket.userId),
      },
      {
        name: "Purpose:",
        value: ticket.type,
      },
      {
        name: "Status:",
        value: ticket.status,
      },
      {
        name: "Opened at:",
        value: time(Math.floor(ticket.ticketOpenedAt / 1000), "F"),
      },
    ])
    .setColor(Colors.Blue)
    .setFooter({
      text: `${currentCount + 1}/${tickets.length}`,
    })
    .setThumbnail(
      (await interaction.client.users.fetch(ticket.userId)).displayAvatarURL()
    );
  if (channel)
    finalEmbed.addFields([
      { name: "Channel:", value: channelMention(channel.id) },
    ]);
  if (ticket.transcript)
    finalEmbed.addFields([
      {
        name: "Transcript link:",
        value: ticket.transcript,
      },
      {
        name: "Was transcript sent to user?",
        value: ticket.transcriptSentStatus ? "Yes" : "No",
      },
    ]);
  let components: ActionRowBuilder<MessageActionRowComponentBuilder>[] | any[];
  tickets.length == 1
    ? (components = [])
    : (components = [
        new ActionRowBuilder<MessageActionRowComponentBuilder>().setComponents([
          new ButtonBuilder()
            .setEmoji("⬅️")
            .setCustomId("back")
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setEmoji("➡️")
            .setCustomId("next")
            .setStyle(ButtonStyle.Secondary),
        ]),
      ]);
  return {
    embeds: [finalEmbed],
    components: components,
  };
};

const startCollector = (
  interaction: CommandInteraction,
  message: Message,
  tickets: Tickets[],
  currentCount: number
) => {
  const collector = message.createMessageComponentCollector({
    time: 600000,
    componentType: ComponentType.Button,
  });

  collector.on("collect", async (i) => {
    if (i.customId == "back") {
      if (currentCount == 0) {
        currentCount = tickets.length - 1;
        await i.update(await embed(interaction, tickets, currentCount));
        collector.stop("changed");
        startCollector(interaction, message, tickets, currentCount);
      } else {
        currentCount--;
        await i.update(await embed(interaction, tickets, currentCount));
        collector.stop("changed");
        startCollector(interaction, message, tickets, currentCount);
      }
    } else if (i.customId == "next") {
      if (currentCount == tickets.length - 1) {
        currentCount = 0;
        await i.update(await embed(interaction, tickets, currentCount));
        collector.stop("changed");
        startCollector(interaction, message, tickets, currentCount);
      } else {
        currentCount++;
        await i.update(await embed(interaction, tickets, currentCount));
        collector.stop("changed");
        startCollector(interaction, message, tickets, currentCount);
      }
    }
  });
  collector.on("end", async (_c, reason) => {
    if (reason == "changed") return;
    if (!message.components[0]) return;
    const buttons = message.components[0].components.map((component) => {
      return new ButtonBuilder(
        (component as ButtonComponent).toJSON()
      ).setDisabled(true);
    });
    const actionRow =
      new ActionRowBuilder<MessageActionRowComponentBuilder>().setComponents(
        buttons
      );
    await interaction.editReply({
      components: [actionRow],
    });
  });
};
