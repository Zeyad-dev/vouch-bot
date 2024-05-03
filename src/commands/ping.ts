import { Command } from "@sapphire/framework";

export class PingCommand extends Command {
  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand((command) =>
      command
        .setName("ping")
        .setDescription("Check my latency")
        .setDMPermission(false),
    );
  }

  public override async chatInputRun(
    interaction: Command.ChatInputCommandInteraction,
  ) {
    const msg = await interaction.reply({
      content: "Ping?",
      ephemeral: true,
      fetchReply: true,
    });

    const diff = msg.createdTimestamp - interaction.createdTimestamp;
    const ping = this.container.client.ws.ping;

    await interaction.editReply(
      `Pong 🏓! (Round trip took: ${diff}ms. Heartbeat: ${ping}ms.)`,
    );
  }
}
