import { env } from "node:process";
import { MongoClient } from "mongodb";

export const mongo = new MongoClient(env.MONGO_URI);

export const database = mongo.db("test");
