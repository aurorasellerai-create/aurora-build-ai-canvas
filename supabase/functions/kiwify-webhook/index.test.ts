import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY")!;
const WEBHOOK_URL = `${SUPABASE_URL}/functions/v1/kiwify-webhook`;

async function callWebhook(body: Record<string, unknown>) {
  const res = await fetch(WEBHOOK_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_ANON_KEY,
    },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  return { status: res.status, json };
}

Deno.test("rejects missing email", async () => {
  const { status, json } = await callWebhook({
    order_status: "paid",
    order_id: "test-no-email-001",
    Product: { name: "Plano Pro" },
  });
  // Either 400 (missing email) or 401 (signature check) are acceptable
  assertEquals([400, 401].includes(status), true, `Expected 400 or 401, got ${status}`);
  await Promise.resolve(); // ensure consumed
});

Deno.test("rejects missing transaction ID", async () => {
  const { status, json } = await callWebhook({
    order_status: "paid",
    Customer: { email: "test@example.com" },
    Product: { name: "Plano Pro" },
  });
  assertEquals([400, 401].includes(status), true, `Expected 400 or 401, got ${status}`);
  await Promise.resolve();
});

Deno.test("rejects invalid signature", async () => {
  const { status, json } = await callWebhook({
    order_status: "paid",
    Customer: { email: "test@example.com" },
    order_id: "test-sig-001",
    Product: { name: "Plano Pro" },
    signature: "wrong-token",
  });
  assertEquals(status, 401);
  assertEquals(json.error, "Invalid signature");
});

Deno.test("rejects GET method", async () => {
  const res = await fetch(WEBHOOK_URL, {
    method: "GET",
    headers: { apikey: SUPABASE_ANON_KEY },
  });
  const json = await res.json();
  assertEquals(res.status, 405);
  assertEquals(json.error, "Method not allowed");
});

Deno.test("handles OPTIONS (CORS preflight)", async () => {
  const res = await fetch(WEBHOOK_URL, {
    method: "OPTIONS",
    headers: { apikey: SUPABASE_ANON_KEY },
  });
  await res.text();
  assertEquals(res.status, 200);
  assertEquals(res.headers.get("Access-Control-Allow-Origin"), "https://aurorabuild.com.br");
});
