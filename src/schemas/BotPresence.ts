import {
  Collection,
  type Client,
  type Snowflake,
  PresenceStatusData,
} from "discord.js";
import type { WithId } from "mongodb";
import { database } from "../mongo.js";

export interface rawPresenceData {
  clientId: Snowflake;
  presence: PresenceStatusData;
  activityType: number | null;
  activityName: string | null;
  previousActivities: string[];
}

const presence = database.collection<rawPresenceData>("presence");

export class Presence {
  private constructor(
    public readonly client: Client<true>,
    public readonly raw: WithId<rawPresenceData>
  ) {}
  public async update(data: Partial<rawPresenceData>): Promise<this> {
    await presence.updateOne(
      { _id: this.raw._id },
      { $set: Object.assign(this.raw, data) }
    );

    return this;
  }

  public static async find(client: Client<true>): Promise<Presence | null> {
    if (this.cache.has(client.id as string))
      return this.cache.get(client.id as string)!;

    const raw = await presence.findOne({ clientId: client.id as string });

    if (!raw) return null;

    const schema = new Presence(client, raw);

    this.cache.set(client.id as string, schema);

    return schema;
  }

  public static async create(
    client: Client<true>,
    data: rawPresenceData
  ): Promise<Presence> {
    if (this.cache.has(data.clientId)) return this.cache.get(data.clientId)!;

    const { insertedId } = await presence.insertOne(data);

    const raw = await presence.findOne({ _id: insertedId });

    const schema = new Presence(client, raw!);

    this.cache.set(data.clientId, schema);

    return schema;
  }

  public static async get(
    client: Client<true>,
    data: rawPresenceData
  ): Promise<Presence> {
    return (await this.find(client)) ?? (await this.create(client, data));
  }

  public static readonly cache = new Collection<Snowflake, Presence>();
}
