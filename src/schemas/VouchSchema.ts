import {
  Collection,
  type Client,
  type Snowflake,
} from "discord.js";
import type { WithId } from "mongodb";
import { database } from "../mongo.js";

export interface VoucherData {
  userId: Snowflake;
  message: string;
  stars: number;
  proof: string | null;
  timestamp: number;
}

interface RawVouchSchema {
  guildId: Snowflake;
  vouches?: VoucherData[];
  channel?: Snowflake;
}

const vouchSystem = database.collection<RawVouchSchema>("vouchSystem");

export class VouchSchema {
  private constructor(
    public readonly client: Client<true>,
    public readonly raw: WithId<RawVouchSchema>
  ) {}

  public async addVouch(data: RawVouchSchema): Promise<this> {
    if (!this.raw.vouches?.length) {
      return this.update(data);
    } else {
      this.raw.vouches?.push(data.vouches![0]);
      await vouchSystem.replaceOne({ _id: this.raw._id }, this.raw);

      return this;
    }
  }

  //   public async updateVouchChannel(data: TextChannel): Promise<this> {
  //     this.raw.channel = data;
  //     console.log(this.raw)
  //     await vouchSystem.updateOne({ _id: this.raw._id }, this.raw);

  //     return this;
  //   }

  public async update(data: Partial<RawVouchSchema>): Promise<this> {
    await vouchSystem.updateOne(
      { _id: this.raw._id },
      { $set: Object.assign(this.raw, data) }
    );

    return this;
  }

  public static async find(
    client: Client<true>,
    guildId: Snowflake
  ): Promise<VouchSchema | null> {
    if (this.cache.has(guildId)) return this.cache.get(guildId)!;

    const raw = await vouchSystem.findOne({ guildId });

    if (!raw) return null;

    const schema = new VouchSchema(client, raw);

    this.cache.set(guildId, schema);

    return schema;
  }

  public static async create(
    client: Client<true>,
    data: RawVouchSchema
  ): Promise<VouchSchema> {
    if (this.cache.has(data.guildId)) return this.cache.get(data.guildId)!;

    const { insertedId } = await vouchSystem.insertOne(data);

    const raw = await vouchSystem.findOne({ _id: insertedId });

    const schema = new VouchSchema(client, raw!);

    this.cache.set(data.guildId, schema);

    return schema;
  }

  public static async get(
    client: Client<true>,
    data: RawVouchSchema
  ): Promise<VouchSchema> {
    return (
      (await this.find(client, data.guildId)) ??
      (await this.create(client, data))
    );
  }

  public static readonly cache = new Collection<Snowflake, VouchSchema>();
}
