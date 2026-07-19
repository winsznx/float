import { Resend } from "resend";
import { env } from "./env.js";
import { serviceDb } from "./supabase.js";

// Verified against resend@6.17.2: new Resend(key).emails.send({from,to,subject,html})
let client: Resend | null = null;
function resend(): Resend {
  if (!client) client = new Resend(env.resendApiKey);
  return client;
}

function shell(title: string, body: string, cta?: { label: string; url: string }): string {
  return `<!doctype html><html><body style="margin:0;background:#f3effa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;padding:40px 20px">
<div style="max-width:440px;margin:0 auto;background:#fdfbfe;border:2px solid #1c1726;border-radius:22px;padding:36px;box-shadow:7px 7px 0 0 rgba(28,23,38,.88)">
<p style="margin:0 0 24px;font-size:20px;font-weight:700;letter-spacing:-.02em;color:#1c1726">FLOAT</p>
<h1 style="margin:0 0 12px;font-size:22px;font-weight:700;letter-spacing:-.02em;color:#1c1726">${title}</h1>
<p style="margin:0;font-size:15px;line-height:1.5;color:#6b6478">${body}</p>
${
  cta
    ? `<a href="${cta.url}" style="display:block;margin-top:28px;padding:14px 24px;background:#7c6cf5;border:2px solid #1c1726;border-radius:999px;color:#1c1726;font-size:15px;font-weight:600;text-align:center;text-decoration:none">${cta.label}</a>`
    : ""
}
</div></body></html>`;
}

/** Records the notification in Postgres, then attempts delivery. */
async function record(userId: string | null, type: string, payload: Record<string, unknown>) {
  if (!userId) return;
  await serviceDb()
    .from("notifications")
    .insert({ user_id: userId, type, payload: payload as never });
}

export async function notifyClaim(params: {
  email: string;
  amount: number;
  sendId: string;
}): Promise<void> {
  const url = `${env.webOrigin}/claim/${params.sendId}`;
  await resend().emails.send({
    from: env.emailFrom,
    to: [params.email],
    subject: `You've received $${params.amount.toFixed(2)}`,
    html: shell(
      `You've received $${params.amount.toFixed(2)}`,
      "Someone sent you money on FLOAT. Claim it with your email — no wallet or app install needed.",
      { label: "Claim it", url }
    ),
  });
}

export async function notifySettleRequest(params: {
  email: string;
  splitName: string | null;
  share: number;
  token: string;
}): Promise<void> {
  const url = `${env.webOrigin}/settle/${params.token}`;
  await resend().emails.send({
    from: env.emailFrom,
    to: [params.email],
    subject: `Your share: $${params.share.toFixed(2)}`,
    html: shell(
      `You owe $${params.share.toFixed(2)}`,
      `${params.splitName ?? "A split"} was shared with you. Settle from whatever you hold — FLOAT handles the rest.`,
      { label: "Settle up", url }
    ),
  });
}

export async function notifyLeashGranted(params: {
  email: string;
  limit: number;
  token: string;
}): Promise<void> {
  const url = `${env.webOrigin}/leash/claim/${params.token}`;
  await resend().emails.send({
    from: env.emailFrom,
    to: [params.email],
    subject: `You have access to $${params.limit.toFixed(2)}`,
    html: shell(
      `You've been given a spending key`,
      `You can spend up to $${params.limit.toFixed(2)} from someone's FLOAT balance, within the limits they set. They stay in control and can revoke at any time.`,
      { label: "Open your key", url }
    ),
  });
}

export async function notifyWitness(params: {
  email: string;
  goal: string;
  stake: number;
  token: string;
  userId?: string | null;
}): Promise<void> {
  const url = `${env.webOrigin}/witness/${params.token}`;
  await record(params.userId ?? null, "witness_request", { goal: params.goal, stake: params.stake });
  await resend().emails.send({
    from: env.emailFrom,
    to: [params.email],
    subject: "A pledge needs your verdict",
    html: shell(
      "You're the witness",
      `"${params.goal}" — $${params.stake.toFixed(2)} is at stake. Confirm whether they made it.`,
      { label: "Give your verdict", url }
    ),
  });
}
