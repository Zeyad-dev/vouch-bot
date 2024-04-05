import { Command } from "@sapphire/framework";
import { TicketsSchema } from "../schemas/TicketsSchema";
import {
  Colors,
  EmbedBuilder,
  PermissionsBitField,
  TextChannel,
  formatEmoji,
  userMention,
} from "discord.js";

export class PingCommand extends Command {
  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand((command) =>
      command
        .setName("add")
        .setDescription("Adds a user to the current ticket")
        .setDMPermission(false)
        .addUserOption((option) =>
          option
            .setName("user")
            .setDescription("The user to add to the current ticket")
            .setRequired(true)
        )
    );
  }

  public override async chatInputRun(
    interaction: Command.ChatInputCommandInteraction
  ) {
    await interaction.deferReply({
      ephemeral: true,
    });
    const user = interaction.options.getUser("user", true);
    const schema = await TicketsSchema.find(
      interaction.client,
      interaction.guild!.id
    );
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
    const channel = (await interaction.guild!.channels.fetch(
      ticket.channelId
    )) as TextChannel;
    await channel.permissionOverwrites.create(user, {
      ViewChannel: true,
    });
    return await interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setDescription(
            `${formatEmoji("1221897469592600677", true)} | ${userMention(
              user.id
            )} has been added to this ticket!`
          )
          .setColor(Colors.Green),
      ],
    });
  }
}
