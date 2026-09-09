import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.FROM_EMAIL || "noreply@citytaxi.com";

export type BookingEmailData = {
  to: string;
  customerName: string;
  reference: string;
  pickupAddress: string;
  dropoffAddress: string;
  pickupDatetime: string;
  vehicleType: string;
  passengers: number;
  luggage: number;
  totalPrice: number;
  distanceKm: number;
  durationMinutes: number;
  flightNumber?: string | null;
};

function formatVehicle(type: string): string {
  const map: Record<string, string> = { sedan: "Berline", van: "Van (7 places)", luxury: "Luxe" };
  return map[type] ?? type;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("fr-FR", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export async function sendBookingConfirmation(data: BookingEmailData) {
  const html = `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

        <!-- Header -->
        <tr><td style="background:linear-gradient(135deg,#0f172a,#1e293b);padding:32px 40px;text-align:center;">
          <p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:3px;color:#fbbf24;text-transform:uppercase;">Réservation confirmée</p>
          <h1 style="margin:0;font-size:28px;font-weight:800;color:#ffffff;">🚕 CityTaxi</h1>
        </td></tr>

        <!-- Greeting -->
        <tr><td style="padding:32px 40px 0;">
          <p style="margin:0;font-size:16px;color:#1e293b;">Bonjour <strong>${data.customerName}</strong>,</p>
          <p style="margin:8px 0 0;font-size:14px;color:#64748b;line-height:1.6;">
            Votre course a bien été enregistrée. Voici le récapitulatif de votre réservation.
          </p>
        </td></tr>

        <!-- Reference badge -->
        <tr><td style="padding:24px 40px 0;">
          <div style="background:#fefce8;border:2px solid #fbbf24;border-radius:12px;padding:16px 24px;text-align:center;">
            <p style="margin:0;font-size:11px;font-weight:700;letter-spacing:2px;color:#92400e;text-transform:uppercase;">Numéro de réservation</p>
            <p style="margin:4px 0 0;font-size:28px;font-weight:900;color:#0f172a;letter-spacing:2px;">${data.reference}</p>
          </div>
        </td></tr>

        <!-- Trip details -->
        <tr><td style="padding:24px 40px 0;">
          <h2 style="margin:0 0 16px;font-size:13px;font-weight:700;letter-spacing:2px;color:#94a3b8;text-transform:uppercase;">Détails du trajet</h2>
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding:12px 16px;background:#f8fafc;border-radius:10px 10px 0 0;border-bottom:1px solid #e2e8f0;">
                <p style="margin:0;font-size:11px;font-weight:600;color:#10b981;text-transform:uppercase;letter-spacing:1px;">📍 Départ</p>
                <p style="margin:4px 0 0;font-size:14px;font-weight:600;color:#1e293b;">${data.pickupAddress}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:12px 16px;background:#f8fafc;border-radius:0 0 10px 10px;">
                <p style="margin:0;font-size:11px;font-weight:600;color:#f59e0b;text-transform:uppercase;letter-spacing:1px;">🏁 Arrivée</p>
                <p style="margin:4px 0 0;font-size:14px;font-weight:600;color:#1e293b;">${data.dropoffAddress}</p>
              </td>
            </tr>
          </table>
        </td></tr>

        <!-- Info grid -->
        <tr><td style="padding:16px 40px 0;">
          <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate;border-spacing:8px;">
            <tr>
              <td style="background:#f8fafc;border-radius:10px;padding:12px 16px;width:50%;">
                <p style="margin:0;font-size:11px;color:#94a3b8;font-weight:600;text-transform:uppercase;">📅 Date & Heure</p>
                <p style="margin:4px 0 0;font-size:13px;font-weight:700;color:#1e293b;">${formatDate(data.pickupDatetime)}</p>
              </td>
              <td style="background:#f8fafc;border-radius:10px;padding:12px 16px;width:50%;">
                <p style="margin:0;font-size:11px;color:#94a3b8;font-weight:600;text-transform:uppercase;">🚗 Véhicule</p>
                <p style="margin:4px 0 0;font-size:13px;font-weight:700;color:#1e293b;">${formatVehicle(data.vehicleType)}</p>
              </td>
            </tr>
            <tr>
              <td style="background:#f8fafc;border-radius:10px;padding:12px 16px;">
                <p style="margin:0;font-size:11px;color:#94a3b8;font-weight:600;text-transform:uppercase;">👥 Passagers</p>
                <p style="margin:4px 0 0;font-size:13px;font-weight:700;color:#1e293b;">${data.passengers} passager${data.passengers > 1 ? "s" : ""}</p>
              </td>
              <td style="background:#f8fafc;border-radius:10px;padding:12px 16px;">
                <p style="margin:0;font-size:11px;color:#94a3b8;font-weight:600;text-transform:uppercase;">🧳 Bagages</p>
                <p style="margin:4px 0 0;font-size:13px;font-weight:700;color:#1e293b;">${data.luggage} bagage${data.luggage > 1 ? "s" : ""}</p>
              </td>
            </tr>
            ${data.flightNumber ? `
            <tr>
              <td colspan="2" style="background:#f8fafc;border-radius:10px;padding:12px 16px;">
                <p style="margin:0;font-size:11px;color:#94a3b8;font-weight:600;text-transform:uppercase;">✈️ N° de vol</p>
                <p style="margin:4px 0 0;font-size:13px;font-weight:700;color:#1e293b;">${data.flightNumber}</p>
              </td>
            </tr>` : ""}
          </table>
        </td></tr>

        <!-- Price -->
        <tr><td style="padding:24px 40px 0;">
          <div style="background:linear-gradient(135deg,#0f172a,#1e293b);border-radius:12px;padding:20px 24px;display:flex;justify-content:space-between;align-items:center;">
            <table width="100%"><tr>
              <td>
                <p style="margin:0;font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;">Prix total</p>
                <p style="margin:4px 0 0;font-size:32px;font-weight:900;color:#ffffff;">${data.totalPrice.toFixed(2)}<span style="font-size:20px;color:#fbbf24;">€</span></p>
              </td>
              <td style="text-align:right;">
                <p style="margin:0;font-size:14px;color:#e2e8f0;font-weight:600;">${data.distanceKm} km</p>
                <p style="margin:4px 0 0;font-size:12px;color:#94a3b8;">~${data.durationMinutes} min</p>
              </td>
            </tr></table>
          </div>
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:32px 40px;text-align:center;border-top:1px solid #f1f5f9;margin-top:32px;">
          <p style="margin:0;font-size:13px;color:#64748b;">
            Des questions ? Contactez-nous 24h/24, 7j/7
          </p>
          <p style="margin:8px 0 0;font-size:13px;color:#0f172a;font-weight:700;">
            📞 +31 (0) 20 244 5555
          </p>
          <p style="margin:24px 0 0;font-size:11px;color:#cbd5e1;">
            © CityTaxi · Tous droits réservés
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

  await resend.emails.send({
    from: FROM,
    to: data.to,
    subject: `✅ Réservation confirmée — ${data.reference} | CityTaxi`,
    html,
  });
}
