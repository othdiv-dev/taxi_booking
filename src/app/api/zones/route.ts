import { NextResponse } from "next/server";
import { db } from "@/db";
import { zones } from "@/db/schema";
import { eq, asc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const activeZones = await db
      .select({ id: zones.id, name: zones.name, slug: zones.slug })
      .from(zones)
      .where(eq(zones.isActive, true))
      .orderBy(asc(zones.name));

    return NextResponse.json(activeZones);
  } catch {
    return NextResponse.json([], { status: 200 });
  }
}
