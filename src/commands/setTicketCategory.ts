import { Command } from "@sapphire/framework";
import {
  CategoryChannel,
  ChannelType,
  Colors,
  EmbedBuilder,
  PermissionsBitField,
  channelMention,
  formatEmoji,
} from "discord.js";
import { TicketsSchema } from "../schemas/TicketsSchema";

export class PingCommand extends Command {
  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand((command) =>
      command
        .setName("set-ticket-category")
        .setDescription("Set the category for the ticket message")
        .setDMPermission(false)
        .addChannelOption((option) =>
          option
            .setName("category")
            .setDescription("The category in which tickets will be opened in")
            .addChannelTypes(ChannelType.GuildCategory)
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
    const category = (
      interaction.options.getChannel("category", true) as CategoryChannel
    ).id;

    const schema = await TicketsSchema.get(interaction.client, {
      guildId: interaction.guild!.id,
    });

    await schema.update({
      category,
    });

    await interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setDescription(
            `${formatEmoji("1221897469592600677", true)} | ${channelMention(
              category
            )} has been set as the default category for tickets!`
          )
          .setColor(Colors.Green),
      ],
    });
  }
}
