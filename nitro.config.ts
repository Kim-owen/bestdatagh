import { defineNitroConfig } from "nitro/config";
import { resolve } from "path";

export default defineNitroConfig({
  publicAssets: [
    {
      dir: resolve("./dist/client"),
      baseURL: "/",
    },
  ],
  handlers: [
    {
      route: "/**",
      handler: "./dist/server/server.js",
    },
  ],
});
