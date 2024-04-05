import { Listener } from "@sapphire/framework";
import {
  ActionRowBuilder,
  AutocompleteInteraction,
  BaseInteraction,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  Colors,
  EmbedBuilder,
  Events,
  MessageActionRowComponentBuilder,
  OverwriteResolvable,
  PermissionsBitField,
  Snowflake,
  StringSelectMenuInteraction,
  TextChannel,
  channelMention,
  formatEmoji,
  userMention,
} from "discord.js";
import { Tickets, TicketsSchema } from "../schemas/TicketsSchema";
import * as sourcebin from "sourcebin";
import { Presence } from "../schemas/BotPresence";
export class ReadyListener extends Listener<Events.InteractionCreate> {
  public constructor(
    context: Listener.LoaderContext,
    options: Listener.Options
  ) {
    super(context, {
      ...options,
      once: false,
      event: Events.InteractionCreate,
    });
  }

  public async run(
    interaction:
      | StringSelectMenuInteraction
      | ButtonInteraction
      | AutocompleteInteraction
  ) {
    const schema = await TicketsSchema.find(
      interaction.client,
      interaction.guild!.id
    );
    if (schema) {
      if (
        interaction.isStringSelectMenu() &&
        interaction.customId == "ticketDropdown"
      ) {
        if (
          schema.raw.tickets &&
          schema.raw.tickets.find(
            (ticket) =>
              ticket.userId === interaction.user.id &&
              ticket.status === "pending"
          )
        )
          return interaction.reply({
            embeds: [
              new EmbedBuilder()
                .setDescription(
                  `${formatEmoji(
                    "1221828309743046677",
                    true
                  )} | You already have a ticket open! Please close the pending ticket before opening a new one!`
                )
                .setColor(Colors.Red),
            ],
            ephemeral: true,
          });
        switch (interaction.values[0]) {
          case "nitro": {
            await createTicket(interaction, schema, "nitro");
            break;
          }
          case "boosts": {
            await createTicket(interaction, schema, "boosts");
            break;
          }
          case "tokens": {
            await createTicket(interaction, schema, "tokens");
            break;
          }
          // case "members": {
          //   await createTicket(interaction, schema, "members");
          //   break;
          // }
          case "support": {
            await createTicket(interaction, schema, "support");
            break;
          }
        }
      }
      if (interaction.isButton() && interaction.customId === "close") {
        await interaction.deferReply({
          ephemeral: false,
        });
        const { tickets } = schema.raw;
        const thisTicketData = tickets!.find(
          (ticket) => ticket.channelId === interaction.channel!.id
        ) as Tickets;
        const nextActionTime = thisTicketData.lastChannelEditTime! + 600000;
        if (Date.now() < nextActionTime)
          return interaction
            .editReply({
              embeds: [
                new EmbedBuilder()
                  .setDescription(
                    `${formatEmoji(
                      "1221828309743046677",
                      true
                    )} | Please wait **${Math.floor(
                      (nextActionTime - Date.now()) / 60000
                    )} more minutes** before executing another action in this ticket!`
                  )
                  .setColor(Colors.Red),
              ],
            })
            .then((message) => {
              setTimeout(async () => {
                await message.delete();
              }, 10000);
            });
        if (thisTicketData.status == "closed")
          return interaction.editReply({
            embeds: [
              new EmbedBuilder()
                .setDescription(
                  `${formatEmoji(
                    "1221828309743046677",
                    true
                  )} | This ticket is already closed!`
                )
                .setColor(Colors.Red),
            ],
          });
        thisTicketData.status = "closed";
        await schema.update(schema.raw);

        await (interaction.channel as TextChannel).edit({
          name:
            "closed-" +
            (interaction.channel as TextChannel).name.replace("ticket", ""),
        });
        await changePermissions(
          interaction,
          schema,
          interaction.channel as TextChannel,
          "closed"
        );
        const transcriptBin = await sourcebin.create({
          title: `Transcript`,
          files: [
            {
              content: (await interaction.channel?.messages.fetch())!
                .reverse()
                .map(
                  (m) =>
                    `${new Date(m.createdAt).toLocaleString("en-US")} - ${
                      m.author.tag
                    }: ${
                      m.attachments.size > 0
                        ? m.attachments.first()!.proxyURL
                        : m.content
                    }`
                )
                .join("\n"),
            },
          ],
        });
        const user = await interaction.client.users.fetch(
          tickets?.find((ticket) => ticket.channelId == interaction.channelId)
            ?.userId as Snowflake
        );
        let sentStatus: boolean;
        try {
          await user.send({
            content: `Here is your copy from your recent ticket's transcript!\n\n${transcriptBin.url}`,
          });
          sentStatus = true;
        } catch (err) {
          sentStatus = false;
        }
        await interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setDescription(
                `${formatEmoji(
                  "1221897469592600677",
                  true
                )} | Ticket has been successfully closed! ${
                  sentStatus
                    ? "A transcript of this ticket has been sent to the ticket author!"
                    : "Unfortunately, I could not send the a copy of the transcript to the user!"
                }`
              )
              .setColor(Colors.Red),
          ],
          components: [
            new ActionRowBuilder<MessageActionRowComponentBuilder>().setComponents(
              new ButtonBuilder()
                .setLabel("Re-open")
                .setCustomId("reopen")
                .setStyle(ButtonStyle.Primary),
              new ButtonBuilder()
                .setLabel("Delete this ticket")
                .setCustomId("deleteTicket")
                .setStyle(ButtonStyle.Danger)
            ),
          ],
        });
        thisTicketData.transcriptSentStatus = sentStatus;
        thisTicketData.transcript = transcriptBin.url;
        thisTicketData.lastChannelEditTime = Date.now();
        await schema.update(schema.raw);
      }
      if (interaction.isButton() && interaction.customId == "reopen") {
        await interaction.deferReply({
          ephemeral: false,
        });
        const { tickets } = schema.raw;
        const thisTicketData = tickets!.find(
          (ticket) => ticket.channelId === interaction.channel!.id
        ) as Tickets;
        const nextActionTime = thisTicketData.lastChannelEditTime! + 600000;
        if (Date.now() < nextActionTime) {
          return interaction
            .editReply({
              embeds: [
                new EmbedBuilder()
                  .setDescription(
                    `${formatEmoji(
                      "1221828309743046677",
                      true
                    )} | Please wait **${Math.floor(
                      (nextActionTime - Date.now()) / 60000
                    )} more minutes** before executing another action in this ticket!`
                  )
                  .setColor(Colors.Red),
              ],
            })
            .then((message) => {
              setTimeout(async () => {
                await message.delete();
              }, 10000);
            });
        }
        await (interaction.channel as TextChannel).edit({
          name:
            (interaction.channel as TextChannel).name.replace("closed-", "") +
            "-ticket",
        });
        await changePermissions(
          interaction,
          schema,
          interaction.channel as TextChannel,
          "pending"
        );
        thisTicketData.status = "pending";
        thisTicketData.transcriptSentStatus = null;
        thisTicketData.transcript = null;
        thisTicketData.lastChannelEditTime = Date.now();
        await schema.update(schema.raw);
        await interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setDescription(
                `${formatEmoji(
                  "1221897469592600677",
                  true
                )} | Ticket has been successfully re-opened!`
              )
              .setColor(Colors.Green),
          ],
        });
        await interaction.message.delete();
        await interaction.channel?.send({
          content: `${userMention(
            thisTicketData.userId
          )} | This ticket has been re-opened!`,
        });
      }
      if (interaction.isButton() && interaction.customId == "deleteTicket") {
        await interaction.reply({
          content: `${formatEmoji(
            "1221897469592600677",
            true
          )} | This ticket channel will be deleted in 10 seconds!`,
        });
        setTimeout(async () => {
          await interaction.channel?.delete("Ticket closed");
        }, 10000);
      }
    }
    if (interaction.isAutocomplete()) {
      const focused = interaction.options.getFocused();
      const presenceSchema = await Presence.find(interaction.client);
      if (!presenceSchema) return;
      const filteredStatuses = presenceSchema.raw.previousActivities.filter(
        (status) => status.startsWith(focused)
      );
      await interaction.respond(
        filteredStatuses.map((status) => ({ name: status, value: status }))
      );
    }
  }
}

const createTicket = async (
  interaction: StringSelectMenuInteraction,
  schema: TicketsSchema,
  type: string
) => {
  schema.raw.totalTicketNumber
    ? schema.raw.totalTicketNumber++
    : (schema.raw.totalTicketNumber = 1);
  const channel = (await interaction.guild?.channels.create({
    name: `ticket #${schema.raw.totalTicketNumber}`,
  })) as TextChannel;
  if (schema.raw.category)
    await channel.edit({
      parent: schema.raw.category,
    });
  await changePermissions(interaction, schema, channel, "pending");
  interaction.reply({
    embeds: [
      new EmbedBuilder()
        .setDescription(
          `${formatEmoji(
            "1221897469592600677",
            true
          )} | Your ticket has been created! (${channelMention(channel.id)})`
        )
        .setColor(Colors.Green),
    ],
    ephemeral: true,
  });
  try {
    interaction.message.edit({
      components: interaction.message.components,
    });
  } catch (err) {}
  const ticketData = {
    userId: interaction.user.id,
    type,
    channelId: channel.id,
    status: "pending",
    ticketOpenedAt: Date.now(),
    ticketNumber: schema.raw.totalTicketNumber,
  };
  schema.raw.tickets
    ? schema.raw.tickets.push(ticketData)
    : (schema.raw.tickets = [ticketData]);
  await schema.update(schema.raw);

  await channel.send({
    content: userMention(interaction.user.id),
    embeds: [
      new EmbedBuilder()
        .setTitle("Welcome!")
        .setDescription(
          "Please wait, one of our support members will soon be here to complete your request"
        )
        .setColor(Colors.Blue)
        .setFooter({
          text: `Brought to you by ${interaction.client.user.username}`,
          iconURL: interaction.client.user.displayAvatarURL(),
        }),
    ],
    components: [
      new ActionRowBuilder<MessageActionRowComponentBuilder>().setComponents([
        new ButtonBuilder()
          .setLabel("Close this ticket")
          .setCustomId("close")
          .setStyle(ButtonStyle.Danger),
      ]),
    ],
  });
};

export const changePermissions = async (
  interaction: BaseInteraction,
  schema: TicketsSchema,
  channel: TextChannel,
  status: string
) => {
  const permissionOverwrites: OverwriteResolvable[] = [];
  schema.raw.roleManagers?.map((roleId) => {
    permissionOverwrites.push({
      id: roleId,
      allow: PermissionsBitField.Flags.ViewChannel,
    });
  });
  schema.raw.userManagers?.map((userId) => {
    permissionOverwrites.push({
      id: userId,
      allow: PermissionsBitField.Flags.ViewChannel,
    });
  });
  permissionOverwrites.push({
    id: interaction.guild?.roles.everyone.id as Snowflake,
    deny: PermissionsBitField.Flags.ViewChannel,
  });
  status == "pending"
    ? permissionOverwrites.push({
        id: interaction.user.id,
        allow: PermissionsBitField.Flags.ViewChannel,
      })
    : permissionOverwrites.push({
        id: interaction.user.id,
        deny: PermissionsBitField.Flags.ViewChannel,
      });
  await channel.edit({
    permissionOverwrites,
  });
};
