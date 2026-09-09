import { execSync } from "child_process";
import { writeFileSync } from "fs";

const dbUrl = process.env.DATABASE_URL;

if (!dbUrl) {
  console.log("No DATABASE_URL, skipping migration");
  process.exit(0);
}

const url = new URL(dbUrl);

const config = {
  dialect: "mysql",
  schema: "./src/db/schema.ts",
  dbCredentials: {
    host: url.hostname,
    port: parseInt(url.port),
    user: url.username,
    password: url.password,
    database: url.pathname.slice(1).split("?")[0],
    ssl: { rejectUnauthorized: false }
  }
};

writeFileSync("drizzle.config.json", JSON.stringify(config, null, 2));
console.log("✅ drizzle.config.json generated");

try {
  execSync("npx drizzle-kit push --force", { stdio: "inherit" });
  console.log("✅ Migration done!");
} catch (e) {
  console.error("❌ Migration failed:", e.message);
  process.exit(0);
}