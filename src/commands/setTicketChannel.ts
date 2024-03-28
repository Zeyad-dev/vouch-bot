import { Command } from "@sapphire/framework";
import {
  ActionRowBuilder,
  ChannelType,
  Colors,
  EmbedBuilder,
  MessageActionRowComponentBuilder,
  PermissionsBitField,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  TextChannel,
  channelMention,
  formatEmoji,
} from "discord.js";
import { TicketsSchema } from "../schemas/TicketsSchema";

export class PingCommand extends Command {
  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand(
      (command) =>
        command
          .setName("set-ticket-channel")
          .setDescription("Set the channel for the ticket message")
          .setDMPermission(false)
          .addChannelOption((option) =>
            option
              .setName("channel")
              .setDescription(
                "The channel to set and post the ticket message to"
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
    const channel = (
      interaction.options.getChannel("channel", true) as TextChannel
    ).id;

    const schema = await TicketsSchema.get(interaction.client, {
      guildId: interaction.guild!.id,
    });

    await schema.update({
      channel,
    });

    await interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setDescription(
            `${formatEmoji("1221897469592600677", true)} | ${channelMention(
              channel
            )} has been set as the ticket channel!`
          )
          .setColor(Colors.Green),
      ],
    });

    const ticketChannel = (await interaction.guild!.channels.fetch(
      channel
    )) as TextChannel;

    await ticketChannel.send({
      embeds: [
        new EmbedBuilder()
          .setTitle("Ticket Services")
          .setDescription(
            `Here at **${interaction.guild?.name}**, we provide you with the best ticket experience possible.\nPlease pick from the below drop down one of our services and one of our support members shall soon respond!`
          )
          .setColor(Colors.Blue),
      ],
      components: [
        new ActionRowBuilder<MessageActionRowComponentBuilder>().setComponents([
          new StringSelectMenuBuilder()
            .setMaxValues(1)
            .setPlaceholder("Select one of our services here")
            .setCustomId("ticketDropdown")
            .setOptions([
              new StringSelectMenuOptionBuilder()
                .setLabel("Discord nitro")
                .setValue("nitro")
                .setDescription("Purchase discord nitro here")
                .setEmoji("1222188923430637660"),
              new StringSelectMenuOptionBuilder()
                .setLabel("Server boosts")
                .setValue("boosts")
                .setDescription("Purchase server boosts here")
                .setEmoji("1222189014115680326"),
              new StringSelectMenuOptionBuilder()
                .setLabel("Tokens")
                .setValue("tokens")
                .setDescription("Purchase tokens here")
                .setEmoji("1222189237139542097"),
              // new StringSelectMenuOptionBuilder()
              //   .setLabel("Members")
              //   .setValue("members")
              //   .setDescription("Purchase members here")
              //   .setEmoji("1222189117861789706"),
              new StringSelectMenuOptionBuilder()
                .setLabel("Support")
                .setValue("support")
                .setDescription("Open support tickets here")
                .setEmoji("1222189395575050434"),
            ]),
        ]),
      ],
    });
  }
}
