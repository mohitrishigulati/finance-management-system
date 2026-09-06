/**
 * WhatsApp adapter. If WHATSAPP_CLOUD_API_TOKEN is unset (the default in
 * dev, per docs/DECISIONS.md — Meta business verification takes days to
 * weeks), messages are logged to the console instead of sent. Either way
 * every send is written to message_log by the caller, so the Scoreboard and
 * exports behave identically regardless of which path ran.
 */
export interface SendResult {
  status: "sent" | "failed";
  providerMessageId?: string;
}

export async function sendWhatsAppMessage(to: string, body: string): Promise<SendResult> {
  const token = process.env.WHATSAPP_CLOUD_API_TOKEN;
  const phoneId = process.env.WHATSAPP_CLOUD_API_PHONE_ID;

  if (!token || !phoneId) {
    // eslint-disable-next-line no-console
    console.log(`[whatsapp:mock] to=${to}\n${body}\n`);
    return { status: "sent", providerMessageId: `mock-${Date.now()}` };
  }

  const res = await fetch(`https://graph.facebook.com/v20.0/${phoneId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body },
    }),
  });

  if (!res.ok) return { status: "failed" };
  const json = (await res.json()) as { messages?: { id: string }[] };
  return { status: "sent", providerMessageId: json.messages?.[0]?.id };
}
