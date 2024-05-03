import { Listener } from "@sapphire/framework";
import { Events, type Client } from "discord.js";
export class ReadyListener extends Listener<Events.ClientReady> {
  public constructor(
    context: Listener.LoaderContext,
    options: Listener.Options,
  ) {
    super(context, { ...options, once: true, event: Events.ClientReady });
  }

  public async run(client: Client<true>) {
    this.container.logger.info(
      `✅ | Successfully logged in as ${client.user.username}#${client.user.tag}`,
    );
  }
}
