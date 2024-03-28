import { Listener } from "@sapphire/framework";
import { Events, Message, EmbedBuilder, formatEmoji, Colors } from "discord.js";
import { TicketsSchema } from "../schemas/TicketsSchema";
export class ReadyListener extends Listener<Events.MessageCreate> {
  public constructor(
    context: Listener.LoaderContext,
    options: Listener.Options
  ) {
    super(context, { ...options, once: false, event: Events.MessageCreate });
  }

  public async run(message: Message) {
    const schema = await TicketsSchema.find(message.client, message.guild!.id);
    if (
      schema &&
      schema.raw.tickets?.find(
        (ticket) => ticket.channelId == message.channel.id
      )
    ) {
      const embed = new EmbedBuilder()
        .setTitle("Please avoid pinging staff members!")
        .setDescription(
          `${formatEmoji(
            "1221828309743046677",
            true
          )} | Please refrain from pinging staff members! This won't speed up things, instead, it could make staff take an even longer time to reply!`
        )
        .setColor(Colors.Red);
      if (
        (message.mentions.users.find(
          (user) =>
            schema.raw.userManagers?.includes(user.id) ||
            schema.raw.roleManagers?.map(async (role) =>
              message.guild?.roles.cache
                .get(role)
                ?.members.find((member) => member.id === user.id)
            )
        ) ||
          message.mentions.roles.find((role) =>
            schema.raw.roleManagers?.includes(role.id)
          )) &&
        !message.mentions.repliedUser && !message.author.bot
      )
        return message.reply({
          embeds: [embed],
        });
    }
  }
}
