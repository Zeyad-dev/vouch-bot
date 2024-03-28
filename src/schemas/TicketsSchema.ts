import { Collection, type Client, type Snowflake } from "discord.js";
import type { WithId } from "mongodb";
import { database } from "../mongo.js";

export interface Tickets {
  userId: Snowflake;
  type: string;
  channelId: Snowflake;
  status: string;
  transcript?: string | null;
  transcriptSentStatus?: boolean | null;
  lastChannelEditTime?: number;
  ticketOpenedAt: number;
  ticketNumber: number;
}
export interface RawTicketsSchema {
  guildId: Snowflake;
  channel?: Snowflake;
  category?: Snowflake | null;
  userManagers?: Snowflake[];
  roleManagers?: Snowflake[];
  tickets?: Tickets[];
  totalTicketNumber?: number;
}

const ticketSystem = database.collection<RawTicketsSchema>("ticketSystem");

export class TicketsSchema {
  private constructor(
    public readonly client: Client<true>,
    public readonly raw: WithId<RawTicketsSchema>
  ) {}

  public async update(data: Partial<RawTicketsSchema>): Promise<this> {
    await ticketSystem.updateOne(
      { _id: this.raw._id },
      { $set: Object.assign(this.raw, data) }
    );

    return this;
  }

  public static async find(
    client: Client<true>,
    guildId: Snowflake
  ): Promise<TicketsSchema | null> {
    if (this.cache.has(guildId)) return this.cache.get(guildId)!;

    const raw = await ticketSystem.findOne({ guildId });

    if (!raw) return null;

    const schema = new TicketsSchema(client, raw);

    this.cache.set(guildId, schema);

    return schema;
  }

  public static async create(
    client: Client<true>,
    data: RawTicketsSchema
  ): Promise<TicketsSchema> {
    if (this.cache.has(data.guildId)) return this.cache.get(data.guildId)!;

    const { insertedId } = await ticketSystem.insertOne(data);

    const raw = await ticketSystem.findOne({ _id: insertedId });

    const schema = new TicketsSchema(client, raw!);

    this.cache.set(data.guildId, schema);

    return schema;
  }

  public static async get(
    client: Client<true>,
    data: RawTicketsSchema
  ): Promise<TicketsSchema> {
    return (
      (await this.find(client, data.guildId)) ??
      (await this.create(client, data))
    );
  }

  public static readonly cache = new Collection<Snowflake, TicketsSchema>();
}
