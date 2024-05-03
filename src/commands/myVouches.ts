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
  formatEmoji,
  time,
} from "discord.js";
import { VouchSchema, VouchData } from "../schemas/VouchSchema";
import * as config from "../../config.json";

export class MyVouchesCommand extends Command {
  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand((command) =>
      command
        .setName("my-vouches")
        .setDescription("View vouches that you have added in this server")
        .setDMPermission(false)
        .addSubcommand((subcommand) =>
          subcommand
            .setName("server")
            .setDescription("Show vouches that you have added to this server"),
        )
        .addSubcommand((subcommand) =>
          subcommand
            .setName("user")
            .setDescription("Show vouches that you have added to users"),
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

    if (!schema)
      return await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(Colors.Red)
            .setDescription(
              `${formatEmoji(
                config.emojis.fail,
                true,
              )} | A vouching system has not been setup in this server! Please ask your admins to run the </setup-vouches users:1235815364148068393> or </setup-vouches server:1235815364148068393> command!`,
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

    if (subcommand === "server")
      vouches = schema.raw.guildVouches.vouches.filter(
        (vouch) => vouch.userId === interaction.user.id,
      );
    if (subcommand === "user")
      vouches = schema.raw.userVouches.vouches.filter(
        (vouch) => vouch.userId === interaction.user.id,
      );

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
    const message = await interaction.editReply(await embed(vouches, 0));
    startCollector(interaction, message, vouches, 0);
  }
}

const embed = async (vouches: VouchData[], currentCount: number) => {
  const vouch = vouches[currentCount];
  const finalEmbed = new EmbedBuilder()
    .setFields([
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
    });
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
        await i.update(await embed(vouches, currentCount));
        collector.stop("changed");
        startCollector(interaction, message, vouches, currentCount);
      } else {
        currentCount--;
        await i.update(await embed(vouches, currentCount));
        collector.stop("changed");
        startCollector(interaction, message, vouches, currentCount);
      }
    } else if (i.customId == "next") {
      if (currentCount == vouches.length - 1) {
        currentCount = 0;
        await i.update(await embed(vouches, currentCount));
        collector.stop("changed");
        startCollector(interaction, message, vouches, currentCount);
      } else {
        currentCount++;
        await i.update(await embed(vouches, currentCount));
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
