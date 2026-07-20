import { spawnSync } from "node:child_process";

const databaseUrl = process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? "";
const isPostgresUrl = databaseUrl.startsWith("postgresql://");
const isLocalDatabase =
  databaseUrl.includes("localhost") || databaseUrl.includes("127.0.0.1");
const hasPlaceholderPassword =
  databaseUrl.includes("[YOUR-PASSWORD]") ||
  databaseUrl.includes("YOUR-PASSWORD");

if (!isPostgresUrl || isLocalDatabase) {
  console.log("Skipping deploy migrations for local or missing DATABASE_URL.");
  process.exit(0);
}

if (hasPlaceholderPassword) {
  console.error("DATABASE_URL still contains a placeholder password.");
  process.exit(1);
}

console.log("Running Prisma deploy migrations.");

const npxCommand = process.platform === "win32" ? "npx.cmd" : "npx";
const result = spawnSync(npxCommand, ["prisma", "migrate", "deploy"], {
  stdio: "inherit",
});

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}

process.exit(result.status ?? 1);
