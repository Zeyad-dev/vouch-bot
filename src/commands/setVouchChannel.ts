import { Command } from "@sapphire/framework";
import {
  ChannelType,
  Colors,
  EmbedBuilder,
  PermissionsBitField,
  TextChannel,
  channelMention,
  formatEmoji,
} from "discord.js";
import { VouchSchema } from "../schemas/VouchSchema";

export class PingCommand extends Command {
  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand((command) =>
      command
        .setName("set-vouch-channel")
        .setDescription("Sets the default vouch channel for this server!")
        .setDMPermission(false)
        .addChannelOption((option) =>
          option
            .setName("channel")
            .setDescription(
              "The text channel to be set as the default vouch channel"
            )
            .setRequired(true)
            .addChannelTypes(ChannelType.GuildText)
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

    const channel = interaction.options.getChannel(
      "channel",
      true
    ) as TextChannel;

    const schema = await VouchSchema.get(interaction.client, {
      guildId: interaction.guild!.id,
    });

    await schema.update({
      channel: channel.id,
    });
    await interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setDescription(
            `${formatEmoji("1221897469592600677", true)} | ${channelMention(
              channel.id
            )} has been set as the default vouch channel!`
          )
          .setColor(Colors.Green),
      ],
    });
  }
}
