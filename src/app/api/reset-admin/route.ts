import { NextResponse } from "next/server";
import { db } from "@/db";
import { admins } from "@/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get("secret");
  const email = searchParams.get("email");
  const newPassword = searchParams.get("password");

  if (secret !== process.env.AUTH_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!email || !newPassword) {
    return NextResponse.json({ error: "email et password requis" }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);

  await db.update(admins)
    .set({ passwordHash })
    .where(eq(admins.email, email));

  return NextResponse.json({ ok: true, message: `Mot de passe réinitialisé pour ${email}` });
}