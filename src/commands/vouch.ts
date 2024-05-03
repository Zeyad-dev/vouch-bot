import { Command } from "@sapphire/framework";
import {
  Attachment,
  ChatInputCommandInteraction,
  Colors,
  EmbedBuilder,
  TextChannel,
  User,
  codeBlock,
  formatEmoji,
  time,
  userMention,
} from "discord.js";
import { VouchSchema } from "../schemas/VouchSchema";
import * as config from "../../config.json";
import { imageTypes } from "../utils/imageTypes";
export class VouchCommand extends Command {
  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand((command) =>
      command
        .setName("vouch")
        .setDescription("Add a vouch to the server or to a user.")
        .setDMPermission(false)
        .addSubcommand((subcommand) =>
          subcommand
            .setName("server")
            .setDescription("Add a new vouch to the server")
            .addStringOption((option) =>
              option
                .setName("message")
                .setDescription("Provide a message for this vouch")
                .setRequired(true)
                .setMaxLength(1024),
            )
            .addIntegerOption((option) =>
              option
                .setName("rating")
                .setDescription("Provide the rating for this vouch")
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(5),
            )
            .addAttachmentOption((option) =>
              option
                .setName("proof")
                .setDescription("Provide additional proof for this vouch")
                .setRequired(false),
            ),
        )
        .addSubcommand((subcommand) =>
          subcommand
            .setName("user")
            .setDescription("Add a new vouch to the specified user")
            .addStringOption((option) =>
              option
                .setName("message")
                .setDescription("Provide a message for this vouch")
                .setRequired(true)
                .setMaxLength(1024),
            )
            .addUserOption((option) =>
              option
                .setName("user")
                .setDescription("The user to add the vouch to")
                .setRequired(true),
            )
            .addIntegerOption((option) =>
              option
                .setName("rating")
                .setDescription("Provide the rating for this vouch")
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(5),
            )
            .addAttachmentOption((option) =>
              option
                .setName("proof")
                .setDescription("Provide additional proof for this vouch")
                .setRequired(false),
            ),
        ),
    );
  }

  public override async chatInputRun(
    interaction: Command.ChatInputCommandInteraction,
  ) {
    await interaction.deferReply({
      ephemeral: true,
    });

    const schema = await VouchSchema.find(
      interaction.client,
      interaction.guild!.id,
    );

    if (
      !schema ||
      (interaction.options.getSubcommand() === "server" &&
        !schema?.raw.guildVouches.channel)
    )
      return await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(Colors.Red)
            .setDescription(
              `${formatEmoji(
                config.emojis.fail,
                true,
              )} | No vouching system for **server vouches** has been setup in this server! Please ask your admins to run the </setup-vouches server:1235815364148068393> command!`,
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
      !schema ||
      (interaction.options.getSubcommand() === "user" &&
        !schema?.raw.userVouches.channel)
    )
      return await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(Colors.Red)
            .setDescription(
              `${formatEmoji(
                config.emojis.fail,
                true,
              )} | No vouching system for **user vouches** has been setup in this server! Please ask your admins to run the </setup-vouches users:1235815364148068393> command!`,
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

    const message = interaction.options.getString("message", true);
    const rating = interaction.options.getInteger("rating", true);
    const proof = interaction.options.getAttachment("proof", false);
    const timestamp = Math.floor(Date.now() / 1000);
    let starsString = "";
    for (let index = 0; index < rating; index++) {
      starsString = starsString + "⭐";
    }
    if (proof && !imageTypes.includes(proof.contentType as string))
      return await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(Colors.Red)
            .setDescription(
              `${formatEmoji(
                config.emojis.fail,
                true,
              )} | Only images are accepted as proof! Re-run the command with a valid image`,
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
      case "server": {
        const channel = await interaction
          .guild!.channels.fetch(schema.raw.guildVouches.channel!)
          .catch(() => {});
        if (!channel) return noChannelError(interaction, "server");
        schema.raw.guildVouches.vouches.push({
          userId: interaction.user.id,
          message,
          rating,
          proof: proof?.url || null,
          vouchedOn: timestamp,
          targetUserId: null,
        });
        await schema.update(schema.raw);
        await postVouch(
          interaction,
          channel as TextChannel,
          message,
          starsString,
          proof,
          timestamp,
          null,
          "server",
        );
        break;
      }
      case "user": {
        const channel = await interaction
          .guild!.channels.fetch(schema.raw.userVouches.channel!)
          .catch(() => {});
        if (!channel) return noChannelError(interaction, "user");
        const user = interaction.options.getUser("user", true);
        schema.raw.userVouches.vouches.push({
          userId: interaction.user.id,
          message,
          rating,
          proof: proof?.url || null,
          vouchedOn: timestamp,
          targetUserId: user.id,
        });
        await schema.update(schema.raw);
        await postVouch(
          interaction,
          channel as TextChannel,
          message,
          starsString,
          proof,
          timestamp,
          user,
          "user",
        );
        break;
      }
    }
    await interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setDescription(
            `${formatEmoji(
              config.emojis.success,
              true,
            )} **| Your vouch has been successfully added to ${
              interaction.options.getSubcommand() === "server"
                ? "this server"
                : userMention(interaction.options.getUser("user", true).id)
            }!**`,
          )
          .addFields([
            {
              name: "Vouch message:",
              value: codeBlock(message),
            },
            {
              name: "Vouch rating:",
              value: codeBlock(starsString),
            },
            ...(proof ? [{ name: "Proof:", value: proof.url }] : []),
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
  }
}

const noChannelError = async (
  interaction: ChatInputCommandInteraction,
  type: string,
) => {
  await interaction.editReply({
    embeds: [
      new EmbedBuilder()
        .setColor(Colors.Red)
        .setDescription(
          `${formatEmoji(
            config.emojis.fail,
            true,
          )} | The channel for posting ${type} vouches have been deleted! Please run the </command:id> command!`,
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
};

const postVouch = async (
  interaction: ChatInputCommandInteraction,
  channel: TextChannel,
  message: string,
  starsString: string,
  proof: Attachment | null,
  timestamp: number,
  user: User | null,
  type: string,
) => {
  await channel.send({
    content: `${
      type === "user"
        ? userMention(user!.id)
        : "Thanks for leaving a vouch on this server!"
    }`,
    embeds: [
      new EmbedBuilder()
        .setTitle("New vouch!")
        .addFields([
          {
            name: "Vouched by:",
            value: userMention(interaction.user.id),
          },
          {
            name: "Message:",
            value: codeBlock(message),
          },
          {
            name: "Rating:",
            value: codeBlock(starsString),
          },
          ...(proof ? [{ name: "Proof:", value: proof.url }] : []),
          {
            name: "Vouched at:",
            value: time(timestamp, "F"),
          },
        ])
        .setFooter({
          text: `Brought to your by ${interaction.client.user.username}`,
          iconURL: interaction.client.user.displayAvatarURL(),
        })
        .setAuthor(
          user
            ? { name: user.username, iconURL: user.displayAvatarURL() }
            : {
                name: interaction.guild!.name,
                iconURL: interaction.guild!.iconURL()!,
              },
        )
        .setThumbnail(interaction.user.displayAvatarURL())
        .setColor(Colors.Blue),
    ],
  });
};
