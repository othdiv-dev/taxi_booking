import { NextResponse } from "next/server";
import { setTelegramWebhook } from "@/lib/telegram";

export async function GET(request: Request) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    return NextResponse.json({ error: "TELEGRAM_BOT_TOKEN manquant dans .env.local" }, { status: 500 });
  }

  // Détecte l'URL de base automatiquement
  const url = new URL(request.url);
  const baseUrl = process.env.APP_URL || `${url.protocol}//${url.host}`;
  const webhookUrl = `${baseUrl}/api/webhooks/telegram`;

  const result = await setTelegramWebhook(webhookUrl);

  if (!result) {
    return NextResponse.json({ error: "Échec de la configuration du webhook" }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    message: "✅ Webhook Telegram configuré avec succès !",
    webhookUrl,
  });
}
