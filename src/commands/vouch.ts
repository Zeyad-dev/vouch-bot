import { Command } from "@sapphire/framework";
import {
  Colors,
  CommandInteraction,
  EmbedBuilder,
  TextChannel,
  formatEmoji,
  time,
  userMention,
} from "discord.js";
import { VouchSchema } from "../schemas/VouchSchema";

export class PingCommand extends Command {
  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand((command) =>
      command
        .setName("vouch")
        .setDescription("Create a new vouch for this server!")
        .setDMPermission(false)
        .addStringOption((option) =>
          option
            .setName("message")
            .setDescription("provide a message for this vouch")
            .setRequired(true)
            .setMaxLength(1024)
        )
        .addIntegerOption((option) =>
          option
            .setName("stars")
            .setDescription("provide the number of stars for this vouch")
            .setRequired(true)
            .setMinValue(1)
            .setMaxValue(5)
        )
        .addAttachmentOption((option) =>
          option
            .setName("proof")
            .setDescription("provide additional proof for this vouch")
            .setRequired(false)
        )
    );
  }

  public override async chatInputRun(
    interaction: Command.ChatInputCommandInteraction
  ) {
    await interaction.deferReply({
      ephemeral: true,
    });

    const schema = await VouchSchema.get(interaction.client, {
      guildId: interaction.guild!.id,
    });

    if (!schema.raw.channel) return await noChannelError(interaction);

    const message = interaction.options.getString("message", true);
    const stars = interaction.options.getInteger("stars", true);
    const proof = interaction.options.getAttachment("proof", false);
    if (
      proof &&
      ![
        "image/png",
        "image/gif",
        "image/jpg",
        "image/jpeg",
        "image/webp",
      ].includes(proof.contentType as string)
    )
      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(Colors.Red)
            .setDescription(
              `${formatEmoji(
                "1221828309743046677",
                true
              )} | Only images are accepted as proof! Re-run the command with a valid image`
            ),
        ],
      });
    let channel: TextChannel;
    try {
      channel = (await interaction.guild!.channels.fetch(
        schema.raw.channel
      )) as TextChannel;
    } catch (error) {
      return await noChannelError(interaction);
    }
    const timestamp = Math.floor(Date.now() / 1000);
    await schema.addVouch({
      guildId: interaction.guild!.id,
      vouches: [
        {
          userId: interaction.user.id,
          message,
          stars,
          proof,
          timestamp,
        },
      ],
    });
    await interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setDescription(
            `${formatEmoji(
              "1221897469592600677",
              true
            )} Your vouch has been submitted!`
          )
          .setColor(Colors.Green),
      ],
    });
    let starsString = "";
    for (let index = 0; index < stars; index++) {
      starsString = starsString + "⭐";
    }
    const embed = new EmbedBuilder()
      .setTitle("New vouch created!")
      .setDescription(`${starsString}`)
      .setColor(Colors.Green)
      .setFields([
        {
          name: "Message:",
          value: message,
        },
        {
          name: "Vouched by:",
          value: userMention(interaction.user.id),
        },
        {
          name: "Vouched at:",
          value: time(timestamp, "F"),
        },
      ])
      .setFooter({
        text: "Thanks for leaving a vouch on us!",
        iconURL: interaction.client.user.displayAvatarURL() as string,
      })
      .setThumbnail(interaction.user.displayAvatarURL());
    if (proof)
      embed.addFields([
        {
          name: "Proof:",
          value: proof.url,
        },
      ]);
    await channel.send({
      embeds: [embed],
    });
  }
}

const noChannelError = async (interaction: CommandInteraction) => {
  interaction.editReply({
    embeds: [
      new EmbedBuilder()
        .setColor(Colors.Red)
        .setDescription(
          `${formatEmoji(
            "1221828309743046677",
            true
          )} | Your admin hasn't set a default channel for vouches! If you are the admin, please run the </set-vouch-channel:1222091433779925033> command!`
        ),
    ],
  });
};
