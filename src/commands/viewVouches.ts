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
  formatEmoji,
  time,
  userMention,
} from "discord.js";
import { VouchSchema, VouchData } from "../schemas/VouchSchema";
import * as config from "../../config.json";

export class ViewVouchesCommand extends Command {
  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand((command) =>
      command
        .setName("view-vouches")
        .setDescription("View vouches that exists within this server")
        .setDMPermission(false)
        .addSubcommand((subcommand) =>
          subcommand
            .setName("server")
            .setDescription("Show vouches that were given to this server")
            .addUserOption((option) =>
              option
                .setName("user")
                .setDescription(
                  "Select a user to only show vouches that were given by them",
                )
                .setRequired(true),
            )
            .addIntegerOption((option) =>
              option
                .setName("rating")
                .setDescription(
                  "Filters the vouches to only show those with the specified rating",
                )
                .setMinValue(1)
                .setMaxValue(5),
            )
            .addBooleanOption((option) =>
              option
                .setName("proof")
                .setDescription(
                  "Filters the vouches to only show those which contain a proof",
                ),
            ),
        )
        .addSubcommand((subcommand) =>
          subcommand
            .setName("user")
            .setDescription("Show vouches that were added to users")
            .addUserOption((option) =>
              option
                .setName("user")
                .setDescription(
                  "Filters the vouches to only show those which were added by the specified user",
                ),
            )
            .addUserOption((option) =>
              option
                .setName("target-user")
                .setDescription(
                  "Filters the vouches to only show those which were added to the specified user",
                ),
            )
            .addIntegerOption((option) =>
              option
                .setName("rating")
                .setDescription(
                  "Filters the vouches to only show those with the specified rating",
                )
                .setMinValue(1)
                .setMaxValue(5),
            )
            .addBooleanOption((option) =>
              option
                .setName("proof")
                .setDescription(
                  "Filters the vouches to only show those which contain a proof",
                ),
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

    let vouches: VouchData[] = [];

    const subcommand = interaction.options.getSubcommand();

    if (subcommand === "server") vouches = schema.raw.guildVouches.vouches;
    if (subcommand === "user") vouches = schema.raw.userVouches.vouches;

    const userOption = interaction.options.getUser("user");
    if (userOption)
      vouches = vouches.filter((vouch) => vouch.userId === userOption.id);

    const targetUserOption = interaction.options.getUser("target-user");
    if (targetUserOption)
      vouches = vouches.filter(
        (vouch) => vouch.targetUserId === targetUserOption.id,
      );

    const ratingOption = interaction.options.getInteger("rating");
    if (ratingOption)
      vouches = vouches.filter((vouch) => vouch.rating === ratingOption);

    const proofOption = interaction.options.getBoolean("proof");
    if (proofOption) vouches = vouches.filter((vouch) => vouch.proof);

    if (vouches.length === 0)
      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(Colors.Red)
            .setDescription(
              `${formatEmoji(
                config.emojis.fail,
                true,
              )} | There are no vouches to display`,
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
    const message = await interaction.editReply(
      await embed(interaction, vouches, 0),
    );
    startCollector(interaction, message, vouches, 0);
  }
}

const embed = async (
  interaction: CommandInteraction,
  vouches: VouchData[],
  currentCount: number,
) => {
  const vouch = vouches[currentCount];
  const finalEmbed = new EmbedBuilder()
    .setFields([
      {
        name: "Vouched by:",
        value: userMention(vouch.userId),
      },
      {
        name: "Message:",
        value: vouch.message,
      },
      {
        name: "Stars:",
        value: `${vouch.rating}`,
      },
      {
        name: "Vouched at:",
        value: time(vouch.vouchedOn, "F"),
      },
    ])
    .setColor(Colors.Blue)
    .setFooter({
      text: `${currentCount + 1}/${vouches.length}`,
    })
    .setThumbnail(
      (await interaction.client.users.fetch(vouch.userId)).displayAvatarURL(),
    );
  if (vouch.proof)
    finalEmbed.addFields([{ name: "Proof:", value: vouch.proof }]);
  return {
    embeds: [finalEmbed],
    components: [
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
    ],
  };
};

const startCollector = (
  interaction: CommandInteraction,
  message: Message,
  vouches: VouchData[],
  currentCount: number,
) => {
  const collector = message.createMessageComponentCollector({
    time: 600000,
    componentType: ComponentType.Button,
  });

  collector.on("collect", async (i) => {
    if (i.customId == "back") {
      if (currentCount == 0) {
        currentCount = vouches.length - 1;
        await i.update(await embed(interaction, vouches, currentCount));
        collector.stop("changed");
        startCollector(interaction, message, vouches, currentCount);
      } else {
        currentCount--;
        await i.update(await embed(interaction, vouches, currentCount));
        collector.stop("changed");
        startCollector(interaction, message, vouches, currentCount);
      }
    } else if (i.customId == "next") {
      if (currentCount == vouches.length - 1) {
        currentCount = 0;
        await i.update(await embed(interaction, vouches, currentCount));
        collector.stop("changed");
        startCollector(interaction, message, vouches, currentCount);
      } else {
        currentCount++;
        await i.update(await embed(interaction, vouches, currentCount));
        collector.stop("changed");
        startCollector(interaction, message, vouches, currentCount);
      }
    }
  });
  collector.on("end", async (_c, reason) => {
    if (reason == "changed") return;
    const buttons = message.components[0].components.map((component) => {
      return new ButtonBuilder(
        (component as ButtonComponent).toJSON(),
      ).setDisabled(true);
    });
    const actionRow =
      new ActionRowBuilder<MessageActionRowComponentBuilder>().setComponents(
        buttons,
      );
    await interaction.editReply({
      components: [actionRow],
    });
  });
};
