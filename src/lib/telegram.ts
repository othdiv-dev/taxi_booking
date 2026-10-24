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
  offeredPrice?: string | number | null;
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

  const displayPrice = booking.offeredPrice
    ? Number(booking.offeredPrice).toFixed(2)
    : Number(booking.totalPrice).toFixed(2);

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
    `💶 *Prix:* ${displayPrice}€`,
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
  // Remplacer le message du groupe par une confirmation simple (sans nom de chauffeur)
  try {
    await telegramApi("editMessageText", {
      chat_id: chatId,
      message_id: messageId,
      text: `✅ Rit *#${booking.reference}* — Toegewezen`,
      parse_mode: "Markdown",
      reply_markup: { inline_keyboard: [] },
    });
  } catch (e) {
    console.warn("markBookingAccepted editMessage failed (non-bloquant):", e);
  }
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

// ─── Flux chauffeur après acceptation ────────────────────────────────────────

/** Formate le bloc d'infos complet de la course — réutilisé partout */
export function formatDriverBookingMessage(booking: TelegramBooking, statusLine?: string): string {
  const dt = new Date(booking.pickupDatetime);
  const formattedDate = dt.toLocaleString("nl-NL", {
    day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
    timeZone: "Europe/Amsterdam",
  });

  // Toujours utiliser offeredPrice si disponible
  const displayPrice = booking.offeredPrice
    ? Number(booking.offeredPrice).toFixed(2)
    : Number(booking.totalPrice).toFixed(2);

  const lines = [
    `🚖 *Rit #${booking.reference}:* ${formattedDate}`,
    `auto : ${booking.passengers}pax.`,
    `Van: ${booking.pickupAddress}`,
    `Naar: ${booking.dropoffAddress}`,
    `[Bekijk route](https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(booking.pickupAddress)}&destination=${encodeURIComponent(booking.dropoffAddress)})`,
    `Chauffeursprijs: € ${displayPrice}`,
    `Ruimbagage: ${booking.luggage > 0 ? "Ja" : "Nee"}`,
    `Contactpersoon: ${booking.customerName} ${booking.customerPhone}`,
    `Betaal methode: ONLINE`,
  ];

  if (booking.customerNotes) {
    lines.push(``, `*Bericht van klant: ${booking.customerNotes}*`);
  }

  if (statusLine) {
    lines.push(``, statusLine);
  }

  return lines.join("\n");
}

/** Envoie le message privé au chauffeur après acceptation */
export async function sendDriverPrivateBooking(
  driverChatId: number,
  bookingId: number,
  booking: TelegramBooking,
): Promise<{ message_id: number } | null> {
  const text = formatDriverBookingMessage(booking, `✅ *Status: Toegewezen*`);
  return telegramApi<{ message_id: number }>("sendMessage", {
    chat_id: driverChatId,
    text,
    parse_mode: "Markdown",
    disable_web_page_preview: true,
    reply_markup: {
      inline_keyboard: [[
        { text: "❌ Annuleren",            callback_data: `cancel_confirm:${bookingId}` },
        { text: "🚗 Onderweg naar klant", callback_data: `on_way:${bookingId}` },
      ]],
    },
  });
}

/** Édite le message privé chauffeur */
export async function editDriverMessage(
  chatId: number,
  messageId: number,
  text: string,
  inlineKeyboard: Array<Array<{ text: string; callback_data: string }>> = [],
) {
  await telegramApi("editMessageText", {
    chat_id: chatId,
    message_id: messageId,
    text,
    parse_mode: "Markdown",
    disable_web_page_preview: true,
    reply_markup: inlineKeyboard.length > 0 ? { inline_keyboard: inlineKeyboard } : { inline_keyboard: [] },
  });
}
