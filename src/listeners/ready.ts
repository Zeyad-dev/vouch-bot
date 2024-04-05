import { Listener } from "@sapphire/framework";
import { Events, type Client } from "discord.js";
import { Presence } from "../schemas/BotPresence";
export class ReadyListener extends Listener<Events.ClientReady> {
  public constructor(
    context: Listener.LoaderContext,
    options: Listener.Options
  ) {
    super(context, { ...options, once: true, event: Events.ClientReady });
  }

  public async run(client: Client<true>) {
    const { id, tag } = client.user;

    this.container.logger.info(`Successfully logged in as ${tag} (${id})`);
    const schema = await Presence.find(client);
    if (schema) {
      client.user.setStatus(schema.raw.presence);
      if (schema.raw.activityName && schema.raw.activityType) {
        client.user.setActivity(schema.raw.activityName, {
          type: schema.raw.activityType,
        });
      }
    }
  }
}
