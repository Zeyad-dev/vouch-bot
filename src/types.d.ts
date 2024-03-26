export {};

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      readonly DISCORD_TOKEN: string;
      readonly MONGO_URI: string;
    }
  }
}
