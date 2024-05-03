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
import * as config from "../../config.json";

export class SetupVouchesCommand extends Command {
  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand((command) =>
      command
        .setName("setup-vouches")
        .setDescription("Setup vouches on this server")
        .setDMPermission(false)
        .addSubcommand((subcommand) =>
          subcommand
            .setName("server")
            .setDescription("Setup server vouches")
            .addChannelOption((option) =>
              option
                .setName("channel")
                .setDescription("The text channel to be set")
                .setRequired(true)
                .addChannelTypes(ChannelType.GuildText),
            ),
        )
        .addSubcommand((subcommand) =>
          subcommand
            .setName("users")
            .setDescription("Setup user vouches")
            .addChannelOption((option) =>
              option
                .setName("channel")
                .setDescription("The text channel to be set")
                .setRequired(true)
                .addChannelTypes(ChannelType.GuildText),
            ),
        )
        .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageGuild),
    );
  }

  public override async chatInputRun(
    interaction: Command.ChatInputCommandInteraction,
  ) {
    await interaction.deferReply({
      ephemeral: true,
    });

    const channel = interaction.options.getChannel(
      "channel",
      true,
    ) as TextChannel;

    const schema = await VouchSchema.find(
      interaction.client,
      interaction.guild!.id,
    );

    if (
      schema &&
      interaction.options.getSubcommand() === "server" &&
      schema?.raw.guildVouches.channel
    )
      return await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(Colors.Red)
            .setDescription(
              `${formatEmoji(
                config.emojis.fail,
                true,
              )} | There is a vouch system setup for **${interaction.options.getSubcommand() === "server" ? "server vouches" : "user vouches"}**!`,
            )
            .setFooter({
              text: `Brought to your by ${interaction.client.user.username}`,
              iconURL: interaction.client.user.displayAvatarURL(),
            })
            .setAuthor({
              name: interaction.user.username,
              iconURL: interaction.user.displayAvatarURL(),
            }),
        ],
      });

    if (
      schema &&
      interaction.options.getSubcommand() === "user" &&
      schema?.raw.userVouches.channel
    )
      return await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(Colors.Red)
            .setDescription(
              `${formatEmoji(
                config.emojis.fail,
                true,
              )} | There is a vouch system setup for **${interaction.options.getSubcommand() === "server" ? "server vouches" : "user vouches"}**!`,
            )
            .setFooter({
              text: `Brought to your by ${interaction.client.user.username}`,
              iconURL: interaction.client.user.displayAvatarURL(),
            })
            .setAuthor({
              name: interaction.user.username,
              iconURL: interaction.user.displayAvatarURL(),
            }),
        ],
      });
    switch (interaction.options.getSubcommand()) {
      case "server":
        await VouchSchema.create(interaction.client, {
          guildId: interaction.guild!.id,
          guildVouches: {
            channel: channel.id,
            vouches: [],
          },
          userVouches: {
            channel: null,
            vouches: [],
          },
        });
        await interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setDescription(
                `${formatEmoji(config.emojis.success, true)} | **Server vouches** has been setup in this server!`,
              )
              .setFields([
                {
                  name: "Channel:",
                  value: channelMention(channel.id),
                },
              ])
              .setColor(Colors.Green)
              .setFooter({
                text: `Brought to your by ${interaction.client.user.username}`,
                iconURL: interaction.client.user.displayAvatarURL(),
              })
              .setAuthor({
                name: interaction.user.username,
                iconURL: interaction.user.displayAvatarURL(),
              }),
          ],
        });
        break;
      case "users":
        await VouchSchema.create(interaction.client, {
          guildId: interaction.guild!.id,
          guildVouches: {
            channel: null,
            vouches: [],
          },
          userVouches: {
            channel: channel.id,
            vouches: [],
          },
        });
        await interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setDescription(
                `${formatEmoji(config.emojis.success, true)} | **User vouches** has been setup in this server!`,
              )
              .setFields([
                {
                  name: "Channel:",
                  value: channelMention(channel.id),
                },
              ])
              .setColor(Colors.Green)
              .setFooter({
                text: `Brought to your by ${interaction.client.user.username}`,
                iconURL: interaction.client.user.displayAvatarURL(),
              })
              .setAuthor({
                name: interaction.user.username,
                iconURL: interaction.user.displayAvatarURL(),
              }),
          ],
        });
        break;
    }
  }
}
