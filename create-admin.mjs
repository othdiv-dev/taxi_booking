import bcrypt from "bcryptjs";
import mysql from "mysql2/promise";
import { readFileSync } from "fs";
import { createInterface } from "readline";

// ─── Charger .env.local automatiquement ─────────────────────────────────────
try {
  const env = readFileSync(".env.local", "utf8");
  for (const line of env.split("\n")) {
    const match = line.match(/^([^#=\s][^=]*)=(.*)$/);
    if (match) process.env[match[1].trim()] ??= match[2].trim().replace(/^["']|["']$/g, "");
  }
} catch {
  // .env.local absent — on utilise les variables d'environnement existantes
}

// ─── Saisie interactive ──────────────────────────────────────────────────────
const rl = createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise((res) => rl.question(q, res));

async function askHidden(label) {
  process.stdout.write(label);
  return new Promise((resolve) => {
    const chars = [];
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", function h(c) {
      if (c === "\r" || c === "\n") {
        process.stdin.setRawMode(false);
        process.stdin.pause();
        process.stdin.removeListener("data", h);
        process.stdout.write("\n");
        resolve(chars.join(""));
      } else if (c === "\u0003") {
        process.exit();
      } else if (c === "\u007f") {
        chars.pop();
      } else {
        chars.push(c);
      }
    });
  });
}

// ─── Main ────────────────────────────────────────────────────────────────────
console.log("\n🚕  CityTaxi — Création / mise à jour d'un administrateur\n");

const name     = (await ask("Nom complet : ")).trim();
const email    = (await ask("Email       : ")).trim().toLowerCase();
const password = await askHidden("Mot de passe : ");
rl.close();

if (!name || !email || !password) {
  console.error("\n❌ Tous les champs sont obligatoires.");
  process.exit(1);
}
if (password.length < 8) {
  console.error("\n❌ Le mot de passe doit contenir au moins 8 caractères.");
  process.exit(1);
}
if (!process.env.DATABASE_URL) {
  console.error("\n❌ DATABASE_URL n'est pas défini dans .env.local.");
  process.exit(1);
}

console.log("\n⏳ Hachage du mot de passe…");
const passwordHash = await bcrypt.hash(password, 12);

const conn = await mysql.createConnection(process.env.DATABASE_URL);

try {
  await conn.execute(
    `INSERT INTO admins (name, email, password_hash, created_at)
     VALUES (?, ?, ?, NOW())
     ON DUPLICATE KEY UPDATE name = VALUES(name), password_hash = VALUES(password_hash)`,
    [name, email, passwordHash]
  );
  console.log(`\n✅ Admin "${name}" (${email}) créé / mis à jour avec succès.`);
  console.log("   Connectez-vous sur /admin/login\n");
} finally {
  await conn.end();
}
