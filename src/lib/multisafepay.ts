export type CreateOrderInput = {
  orderId: string;
  amountEuros: number;
  description: string;
  customerName: string;
  customerEmail: string;
  redirectBaseUrl: string;
  notificationUrl: string;
};

export type CreateOrderResult = {
  demo: boolean;
  paymentUrl: string;
  transactionId: string;
};

function isConfigured(): boolean {
  return Boolean(process.env.MULTISAFEPAY_API_KEY);
}

export function isMultisafepayConfigured(): boolean {
  return isConfigured();
}

export async function createPaymentOrder(input: CreateOrderInput): Promise<CreateOrderResult> {
  const apiKey = process.env.MULTISAFEPAY_API_KEY;

  if (!apiKey) {
    // Demo mode: no gateway configured, simulate an instant successful redirect
    // straight to our own confirmation endpoint which finalizes the booking.
    return {
      demo: true,
      paymentUrl: `${input.redirectBaseUrl}/api/payments/demo-complete?order=${encodeURIComponent(input.orderId)}`,
      transactionId: `DEMO-${input.orderId}`,
    };
  }

  const testMode = process.env.MULTISAFEPAY_TEST_MODE !== "false";
  const baseUrl = testMode ? "https://testapi.multisafepay.com" : "https://api.multisafepay.com";

  const res = await fetch(`${baseUrl}/v1/json/orders?api_key=${encodeURIComponent(apiKey)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      type: "redirect",
      order_id: input.orderId,
      currency: "EUR",
      amount: Math.round(input.amountEuros * 100),
      description: input.description,
      customer: {
        first_name: input.customerName,
        email: input.customerEmail,
      },
      payment_options: {
        notification_url: input.notificationUrl,
        redirect_url: `${input.redirectBaseUrl}/confirmation/${input.orderId}`,
        cancel_url: `${input.redirectBaseUrl}/confirmation/${input.orderId}?cancelled=1`,
        notification_method: "POST",
      },
    }),
  });

  const data = await res.json();

  if (!data.success) {
    throw new Error(data.error_info || "MultiSafepay order creation failed");
  }

  return {
    demo: false,
    paymentUrl: data.data.payment_url,
    transactionId: data.data.order_id,
  };
}
