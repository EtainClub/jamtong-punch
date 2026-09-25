import { readFileSync } from "node:fs";
import type { NextConfig } from "next";

// package.json's version is the app version. It is baked into the build so
// the page can show it and tell when the server has moved on to a newer one.
const { version } = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8")) as { version: string };

const nextConfig: NextConfig = {
  env: { APP_VERSION: version },
};

export default nextConfig;
