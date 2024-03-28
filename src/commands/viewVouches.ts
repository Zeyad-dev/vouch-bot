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
import { VouchSchema, VoucherData } from "../schemas/VouchSchema";

export class PingCommand extends Command {
  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand((command) =>
      command
        .setName("view-vouches")
        .setDescription("View all vouches on this server")
        .setDMPermission(false)
        .addUserOption((option) =>
          option
            .setName("user")
            .setDescription("Show vouches only for the specified user")
        )
        .addIntegerOption((option) =>
          option
            .setName("stars")
            .setDescription(
              "Show vouches only with the specified number of stars"
            )
            .setMinValue(1)
            .setMaxValue(5)
        )
        .addBooleanOption((option) =>
          option.setName("proof").setDescription("Show vouches only with proof")
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
    const starsOption = interaction.options.getInteger("stars");
    const proofOption = interaction.options.getBoolean("proof");

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

    const schema = await VouchSchema.get(interaction.client, {
      guildId: interaction.guild!.id,
    });

    let { vouches } = schema.raw;

    if (!vouches)
      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(Colors.Red)
            .setDescription(
              `${formatEmoji(
                "1221828309743046677",
                true
              )} | There are no vouches in this server yet!`
            ),
        ],
      });
    if (userOption)
      vouches = vouches.filter((vouch) => vouch.userId == userOption.id);
    if (starsOption)
      vouches = vouches.filter((vouch) => vouch.stars == starsOption);
    if (proofOption) vouches = vouches.filter((vouch) => vouch.proof);
    if (vouches.length === 0) {
      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(Colors.Red)
            .setDescription(
              `${formatEmoji(
                "1221828309743046677",
                true
              )} | There are no vouches to show with your specified filters!`
            ),
        ],
      });
    }
    let currentCount = 0;
    const message = await interaction.editReply(
      await embed(interaction, vouches, currentCount)
    );
    startCollector(interaction, message, vouches, currentCount);
  }
}

const embed = async (
  interaction: CommandInteraction,
  vouches: VoucherData[],
  currentCount: number
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
        value: `${vouch.stars}`,
      },
      {
        name: "Vouched at:",
        value: time(vouch.timestamp, "F"),
      },
    ])
    .setColor(Colors.Blue)
    .setFooter({
      text: `${currentCount + 1}/${vouches.length}`,
    })
    .setThumbnail(
      (await interaction.client.users.fetch(vouch.userId)).displayAvatarURL()
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
  vouches: VoucherData[],
  currentCount: number
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
