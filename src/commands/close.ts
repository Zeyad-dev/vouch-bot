import { Command } from "@sapphire/framework";
import { Tickets, TicketsSchema } from "../schemas/TicketsSchema";
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Colors,
  EmbedBuilder,
  MessageActionRowComponentBuilder,
  Snowflake,
  TextChannel,
  formatEmoji,
} from "discord.js";
import { changePermissions } from "../listeners/interactionCreate";
import * as sourcebin from "sourcebin";

export class PingCommand extends Command {
  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand((command) =>
      command
        .setName("close")
        .setDescription("Closes the current ticket")
        .setDMPermission(false)
    );
  }

  public override async chatInputRun(
    interaction: Command.ChatInputCommandInteraction
  ) {
    await interaction.deferReply({
      ephemeral: true,
    });
    const schema = await TicketsSchema.find(
      interaction.client,
      interaction.guild!.id
    );
    if (!schema || !schema?.raw.tickets)
      return await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setDescription(
              `${formatEmoji(
                "1221828309743046677",
                true
              )} | There are no tickets open in this server!`
            )
            .setColor(Colors.Red),
        ],
      });
    const ticket = schema.raw.tickets.find(
      (ticket) => ticket.channelId === interaction.channel!.id
    );
    if (!ticket)
      return await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setDescription(
              `${formatEmoji(
                "1221828309743046677",
                true
              )} | Please run this command in a valid ticket channel!`
            )
            .setColor(Colors.Red),
        ],
      });
    const { tickets } = schema.raw;
    const thisTicketData = tickets!.find(
      (ticket) => ticket.channelId === interaction.channel!.id
    ) as Tickets;
    const nextActionTime = thisTicketData.lastChannelEditTime! + 600000;
    if (Date.now() < nextActionTime)
      return interaction
        .editReply({
          embeds: [
            new EmbedBuilder()
              .setDescription(
                `${formatEmoji(
                  "1221828309743046677",
                  true
                )} | Please wait **${Math.floor(
                  (nextActionTime - Date.now()) / 60000
                )} more minutes** before executing another action in this ticket!`
              )
              .setColor(Colors.Red),
          ],
        })
        .then((message) => {
          setTimeout(async () => {
            await message.delete();
          }, 10000);
        });
    if (thisTicketData.status == "closed")
      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setDescription(
              `${formatEmoji(
                "1221828309743046677",
                true
              )} | This ticket is already closed!`
            )
            .setColor(Colors.Red),
        ],
      });
    thisTicketData.status = "closed";
    await schema.update(schema.raw);

    await (interaction.channel as TextChannel).edit({
      name:
        "closed-" +
        (interaction.channel as TextChannel).name.replace("ticket", ""),
    });
    await changePermissions(
      interaction,
      schema,
      interaction.channel as TextChannel,
      "closed"
    );
    const transcriptBin = await sourcebin.create({
      title: `Transcript`,
      files: [
        {
          content: (await interaction.channel?.messages.fetch())!
            .reverse()
            .map(
              (m) =>
                `${new Date(m.createdAt).toLocaleString("en-US")} - ${
                  m.author.tag
                }: ${
                  m.attachments.size > 0
                    ? m.attachments.first()!.proxyURL
                    : m.content
                }`
            )
            .join("\n"),
        },
      ],
    });
    const user = await interaction.client.users.fetch(
      tickets?.find((ticket) => ticket.channelId == interaction.channelId)
        ?.userId as Snowflake
    );
    let sentStatus: boolean;
    try {
      await user.send({
        content: `Here is your copy from your recent ticket's transcript!\n\n${transcriptBin.url}`,
      });
      sentStatus = true;
    } catch (err) {
      sentStatus = false;
    }
    await interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setDescription(
            `${formatEmoji(
              "1221897469592600677",
              true
            )} | Ticket has been successfully closed! ${
              sentStatus
                ? "A transcript of this ticket has been sent to the ticket author!"
                : "Unfortunately, I could not send the a copy of the transcript to the user!"
            }`
          )
          .setColor(Colors.Red),
      ],
      components: [
        new ActionRowBuilder<MessageActionRowComponentBuilder>().setComponents(
          new ButtonBuilder()
            .setLabel("Re-open")
            .setCustomId("reopen")
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setLabel("Delete this ticket")
            .setCustomId("deleteTicket")
            .setStyle(ButtonStyle.Danger)
        ),
      ],
    });
    thisTicketData.transcriptSentStatus = sentStatus;
    thisTicketData.transcript = transcriptBin.url;
    thisTicketData.lastChannelEditTime = Date.now();
    await schema.update(schema.raw);
  }
}
