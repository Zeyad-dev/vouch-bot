import { Command } from "@sapphire/framework";
import { TicketsSchema } from "../schemas/TicketsSchema";
import {
  ButtonStyle,
  Colors,
  EmbedBuilder,
  formatEmoji,
  PermissionsBitField,
  UserSelectMenuBuilder,
  roleMention,
  userMention,
  ButtonComponent,
  RoleSelectMenuComponent,
  UserSelectMenuComponent,
  Snowflake,
} from "discord.js";
import {
  ActionRowBuilder,
  ButtonBuilder,
  MessageActionRowComponentBuilder,
  RoleSelectMenuBuilder,
} from "@discordjs/builders";

export class PingCommand extends Command {
  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand((command) =>
      command
        .setName("set-ticket-managers")
        .setDescription("Adds roles/users to be able to manage and see tickets")
        .setDMPermission(false)
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

    const schema = await TicketsSchema.get(interaction.client, {
      guildId: interaction.guild!.id,
    });

    let users: Snowflake[];
    let roles: Snowflake[];

    const roleSelectMenu = new RoleSelectMenuBuilder()
      .setCustomId("roles")
      .setMaxValues(interaction.guild!.roles.cache.size)
      .setPlaceholder("Select roles here")
      .setMinValues(0);
    if (schema.raw.roleManagers)
      roleSelectMenu.setDefaultRoles(schema.raw.roleManagers);
    const userSelectMenu = new UserSelectMenuBuilder()
      .setCustomId("users")
      .setMaxValues(interaction.guild!.memberCount)
      .setPlaceholder("Select users here")
      .setMinValues(0);
    if (schema.raw.userManagers)
      userSelectMenu.setDefaultUsers(schema.raw.userManagers);

    const message = await interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setTitle("Select users/roles to set as ticket managers")
          .setDescription(
            "Use the dropdown menus below to set the ticket managers."
          )
          .setColor(Colors.Blue),
      ],
      components: [
        new ActionRowBuilder<MessageActionRowComponentBuilder>().setComponents(
          roleSelectMenu
        ),
        new ActionRowBuilder<MessageActionRowComponentBuilder>().setComponents(
          userSelectMenu
        ),
        new ActionRowBuilder<MessageActionRowComponentBuilder>().setComponents(
          new ButtonBuilder()
            .setCustomId("confirm")
            .setLabel("Confirm")
            .setStyle(ButtonStyle.Success)
        ),
        new ActionRowBuilder<MessageActionRowComponentBuilder>().setComponents(
          new ButtonBuilder()
            .setCustomId("cancel")
            .setLabel("Cancel")
            .setStyle(ButtonStyle.Danger)
        ),
      ],
    });

    const collector = message.createMessageComponentCollector({
      time: 600000,
    });

    collector.on("collect", async (i) => {
      if (i.isRoleSelectMenu()) {
        roles = i.values;
        i.reply({
          content: `Selected roles:\n${i.values.map((role) =>
            roleMention(role)
          )}`,
          ephemeral: true,
        });
      }
      if (i.isUserSelectMenu()) {
        users = i.values;
        i.reply({
          content: `Selected users:\n${i.values.map((user) =>
            userMention(user)
          )}`,
          ephemeral: true,
        });
      }
      if (i.isButton()) {
        if (i.customId == "cancel") {
          collector.stop("cancelled");
          await i.update({
            embeds: [
              new EmbedBuilder()
                .setDescription("This action has been cancelled!")
                .setColor(Colors.Red),
            ],
            components: [],
          });
        } else if (i.customId == "confirm") {
          collector.stop("confirmed");
          await schema.update({
            userManagers: users,
            roleManagers: roles,
          });
          await i.update({
            embeds: [
              new EmbedBuilder()
                .setDescription(
                  "The manager roles/users have been successfully updated!"
                )
                .setColor(Colors.Green),
            ],
            components: [],
          });
        }
      }
    });

    collector.on("end", async (_c, reason) => {
      if (reason == "confirmed" || reason == "cancelled") return;
      const buttons = message.components[2].components.map((button) =>
        new ButtonBuilder((button as ButtonComponent).toJSON()).setDisabled(
          true
        )
      );
      const roleSelectMenu = message.components[0].components.map((menu) =>
        new RoleSelectMenuBuilder(
          (menu as RoleSelectMenuComponent).toJSON()
        ).setDisabled(true)
      );
      const userSelectMenu = message.components[0].components.map((menu) =>
        new UserSelectMenuBuilder(
          (menu as UserSelectMenuComponent).toJSON()
        ).setDisabled(true)
      );
      await message.edit({
        components: [
          new ActionRowBuilder<MessageActionRowComponentBuilder>().setComponents(
            roleSelectMenu
          ),
          new ActionRowBuilder<MessageActionRowComponentBuilder>().setComponents(
            userSelectMenu
          ),
          new ActionRowBuilder<MessageActionRowComponentBuilder>().setComponents(
            buttons
          ),
        ],
      });
    });
  }
}
