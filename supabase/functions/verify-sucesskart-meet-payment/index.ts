import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

const jsonResponse = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: corsHeaders });

const errorResponse = (message: string, status = 400) =>
  jsonResponse({ error: message }, status);

const toHex = (buffer: ArrayBuffer) =>
  Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return errorResponse("Method not allowed.", 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const razorpayKeySecret = Deno.env.get("RAZORPAY_KEY_SECRET");

  if (!supabaseUrl || !serviceRoleKey || !anonKey) {
    return errorResponse("Missing Supabase environment variables.", 500);
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return errorResponse("Missing Authorization bearer token.", 401);

  const jwt = authHeader.replace("Bearer ", "").trim();
  const adminClient = createClient(supabaseUrl, serviceRoleKey);
  const authClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
  });

  const { data: { user }, error: userError } = await authClient.auth.getUser();
  if (userError || !user?.id) return errorResponse("Invalid user session.", 401);

  let payload: {
    payment_id?: string;
    razorpay_order_id?: string;
    razorpay_payment_id?: string;
    razorpay_signature?: string;
  };
  try {
    payload = await req.json();
  } catch {
    return errorResponse("Invalid request body.", 400);
  }

  if (!payload.payment_id) return errorResponse("payment_id is required.", 400);

  const { data: payment, error: paymentError } = await adminClient
    .from("payments")
    .select("id, user_id, gateway, gateway_order_id, status, amount")
    .eq("id", payload.payment_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (paymentError || !payment) return errorResponse("Payment record not found.", 404);
  if (payment.status === "success") return jsonResponse({ status: "success", payment_id: payment.id, already_verified: true });

  if (payment.gateway !== "razorpay") {
    return errorResponse("Only Razorpay payments can be auto-verified.", 400);
  }

  if (!payload.razorpay_order_id || !payload.razorpay_payment_id || !payload.razorpay_signature) {
    return errorResponse("Missing Razorpay verification fields.", 400);
  }

  if (!payment.gateway_order_id || payment.gateway_order_id !== payload.razorpay_order_id) {
    await adminClient.from("payments").update({
      status: "failed",
      failure_reason: "Razorpay order mismatch.",
      updated_at: new Date().toISOString(),
    }).eq("id", payment.id);
    return errorResponse("Order verification failed.", 400);
  }

  if (!razorpayKeySecret) return errorResponse("Razorpay secret is not configured.", 500);

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(razorpayKeySecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signed = await crypto.subtle.sign("HMAC", key, encoder.encode(`${payload.razorpay_order_id}|${payload.razorpay_payment_id}`));
  const verified = toHex(signed) === payload.razorpay_signature.toLowerCase();

  if (!verified) {
    await adminClient.from("payments").update({
      status: "failed",
      gateway_payment_id: payload.razorpay_payment_id,
      gateway_signature: payload.razorpay_signature,
      failure_reason: "Invalid Razorpay signature.",
      updated_at: new Date().toISOString(),
    }).eq("id", payment.id);
    return errorResponse("Payment signature verification failed.", 400);
  }

  const apiKey = crypto.randomUUID();
  const now = new Date().toISOString();

  // Check if user already has an active API key
  const { data: existingKey } = await adminClient
    .from("sucesskart_meet_api_keys")
    .select("id, minutes_remaining")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .maybeSingle();

  if (existingKey) {
    // Recharge: add 90 minutes
    const { error: updateError } = await adminClient
      .from("sucesskart_meet_api_keys")
      .update({
        minutes_remaining: (existingKey.minutes_remaining || 0) + 90,
        updated_at: now,
      })
      .eq("id", existingKey.id);

    if (updateError) {
      return errorResponse("Failed to update minutes: " + updateError.message, 500);
    }
  } else {
    // New key with 90 minutes
    const { error: keyError } = await adminClient.from("sucesskart_meet_api_keys").insert({
      user_id: user.id,
      api_key: apiKey,
      payment_id: payment.id,
      is_active: true,
      minutes_remaining: 90,
    });

    if (keyError) {
      return errorResponse("Failed to generate API key: " + keyError.message, 500);
    }
  }

  await adminClient.from("payments").update({
    status: "success",
    gateway_payment_id: payload.razorpay_payment_id,
    gateway_signature: payload.razorpay_signature,
    gateway_ref: payload.razorpay_payment_id,
    paid_at: now,
    failure_reason: null,
    updated_at: now,
  }).eq("id", payment.id);

  return jsonResponse({
    status: "success",
    payment_id: payment.id,
    api_key: apiKey,
  });
});
