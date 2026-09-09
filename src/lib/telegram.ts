export type TelegramBooking = {
  reference: string;
  pickupAddress: string;
  dropoffAddress: string;
  pickupDatetime: Date;
  passengers: number;
  luggage: number;
  vehicleType: string;
  distanceKm: string | number;
  totalPrice: string | number;
  customerName: string;
  customerPhone: string;
  flightNumber?: string | null;
  customerNotes?: string | null;
};

function botToken(): string | undefined {
  return process.env.TELEGRAM_BOT_TOKEN;
}

export function isTelegramConfigured(): boolean {
  return Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID);
}

async function telegramApi<T = unknown>(method: string, body: Record<string, unknown>): Promise<T | null> {
  const token = botToken();
  if (!token) return null;

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!data.ok) {
      console.error(`Telegram API error (${method}):`, data.description);
      return null;
    }
    return data.result as T;
  } catch (error) {
    console.error(`Telegram API request failed (${method}):`, error);
    return null;
  }
}

function formatBookingMessage(booking: TelegramBooking, statusLine = "🟡 En attente d'un chauffeur"): string {
  const dt = new Date(booking.pickupDatetime);
  const formattedDate = dt.toLocaleString("fr-FR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "Europe/Amsterdam",
  });

  return [
    `🚖 *Nouvelle course - ${booking.reference}*`,
    "",
    `📍 *Départ:* ${booking.pickupAddress}`,
    `🏁 *Arrivée:* ${booking.dropoffAddress}`,
    `🕐 *Heure:* ${formattedDate}`,
    booking.flightNumber ? `✈️ *Vol:* ${booking.flightNumber}` : null,
    `📏 *Distance:* ${booking.distanceKm} km`,
    `👥 *Passagers:* ${booking.passengers} · 🧳 *Bagages:* ${booking.luggage}`,
    `🚗 *Véhicule:* ${booking.vehicleType}`,
    `💶 *Prix:* ${Number(booking.totalPrice).toFixed(2)}€`,
    booking.customerNotes ? `📝 *Notes:* ${booking.customerNotes}` : null,
    "",
    statusLine,
  ]
    .filter(Boolean)
    .join("\n");
}

export async function sendBookingToGroup(bookingId: number, booking: TelegramBooking) {
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!chatId) return null;

  const text = formatBookingMessage(booking);

  const result = await telegramApi<{ message_id: number; chat: { id: number } }>("sendMessage", {
    chat_id: chatId,
    text,
    parse_mode: "Markdown",
    reply_markup: {
      inline_keyboard: [[{ text: "✅ J'accepte cette course", callback_data: `accept:${bookingId}` }]],
    },
  });

  return result;
}

export async function deleteMessage(chatId: number, messageId: number) {
  await telegramApi("deleteMessage", {
    chat_id: chatId,
    message_id: messageId,
  });
}

export async function markBookingAccepted(
  chatId: number,
  messageId: number,
  booking: TelegramBooking,
  driverName: string,
) {
  // Supprimer le message du groupe — la course est prise, les autres chauffeurs n'ont plus à la voir
  await deleteMessage(chatId, messageId);

  // Envoyer un message discret de confirmation dans le groupe (optionnel, peut être retiré)
  await telegramApi("sendMessage", {
    chat_id: chatId,
    text: `✅ Course *${booking.reference}* acceptée `,
    parse_mode: "Markdown",
  });
}

export async function answerCallbackQuery(callbackQueryId: string, text: string, showAlert = false) {
  await telegramApi("answerCallbackQuery", {
    callback_query_id: callbackQueryId,
    text,
    show_alert: showAlert,
  });
}

export async function setTelegramWebhook(url: string) {
  return telegramApi("setWebhook", {
    url,
    secret_token: process.env.TELEGRAM_WEBHOOK_SECRET || undefined,
    allowed_updates: ["callback_query", "message"],
  });
}

export async function telegramSend(chatId: number, text: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return;
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "Markdown",
    }),
  });
}
export async function notifyAdminNewDriver(driver: {
  firstName: string;
  lastName: string;
  phone: string;
  vehicleType: string;
  telegramChatId: number;
  telegramUsername?: string | null;
}) {
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!chatId) return null;

  const username = driver.telegramUsername ? `@${driver.telegramUsername}` : `ID: ${driver.telegramChatId}`;

  return telegramApi("sendMessage", {
    chat_id: chatId,
    text:
      `🆕 *Nouveau chauffeur inscrit*\n\n` +
      `👤 ${driver.firstName} ${driver.lastName}\n` +
      `📞 ${driver.phone}\n` +
      `🚗 ${driver.vehicleType}\n` +
      `💬 Telegram: ${username}\n\n` +
      `⏳ En attente de validation.`,
    parse_mode: "Markdown",
  });
}

// Message privé au chauffeur validé
export async function notifyDriverValidated(telegramChatId: number, firstName: string) {
  const groupLink = process.env.TELEGRAM_GROUP_LINK;

  return telegramApi("sendMessage", {
    chat_id: telegramChatId,
    text:
      `✅ *Félicitations ${firstName} !*\n\n` +
      `Votre compte chauffeur a été *validé* par l'administrateur.\n\n` +
      `🚖 Vous allez maintenant recevoir les demandes de courses directement ici en privé.\n` +
      `Appuyez sur *✅ J'accepte cette course* pour accepter une course.\n\n` +
      (groupLink ? `👥 Rejoignez le groupe des chauffeurs :\n${groupLink}` : ``),
    parse_mode: "Markdown",
  });
}

