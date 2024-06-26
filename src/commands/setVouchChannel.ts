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

export class SetVouchChannelCommand extends Command {
  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand((command) =>
      command
        .setName("set-vouch-channel")
        .setDescription("Manages the default vouch channels for this server!")
        .setDMPermission(false)
        .addSubcommand((subcommand) =>
          subcommand
            .setName("server")
            .setDescription(
              "To set the channel where vouches to the server are sent",
            )
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
            .setDescription(
              "To set the channel where vouches to users are sent.",
            )
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

    if (!schema)
      return await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(Colors.Red)
            .setDescription(
              `${formatEmoji(
                config.emojis.fail,
                true,
              )} | A vouching system has not been setup in this server! Please run the </setup-vouches users:1235815364148068393> or </setup-vouches server:1235815364148068393> command first!`,
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
        await schema.update({
          guildVouches: {
            channel: channel.id,
            vouches: schema.raw.guildVouches.vouches,
          },
        });
        await interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setDescription(
                `${formatEmoji(config.emojis.success, true)} | ${channelMention(
                  channel.id,
                )} has been set as the vouch channel for server vouches!`,
              )
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
        await schema.update({
          userVouches: {
            channel: channel.id,
            vouches: schema.raw.userVouches.vouches,
          },
        });
        await interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setDescription(
                `${formatEmoji(config.emojis.success, true)} | ${channelMention(
                  channel.id,
                )} has been set as the vouch channel for user vouches!`,
              )
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
