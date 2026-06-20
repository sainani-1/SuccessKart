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

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return errorResponse("Method not allowed.", 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const razorpayKeyId = Deno.env.get("RAZORPAY_KEY_ID");
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
    gateway?: string;
    transaction_id?: string;
    screenshot_url?: string;
    user_upi_id?: string;
    user_upi_name?: string;
    payment_note?: string;
  };
  try {
    payload = await req.json();
  } catch {
    return errorResponse("Invalid request body.", 400);
  }

  const gateway = payload?.gateway === "manual" ? "manual" : "razorpay";

  const { data: priceSetting } = await adminClient
    .from("settings")
    .select("value")
    .eq("key", "sucesskart_meet_price")
    .maybeSingle();

  const price = Number(priceSetting?.value || 499);
  const now = new Date().toISOString();

  const metadata: Record<string, string> = {
    product: "sucesskart_meet",
    gateway: gateway,
  };

  if (gateway === "manual") {
    if (payload.transaction_id) metadata.transaction_id = payload.transaction_id;
    if (payload.screenshot_url) metadata.screenshot_url = payload.screenshot_url;
    if (payload.user_upi_id) metadata.user_upi_id = payload.user_upi_id;
    if (payload.user_upi_name) metadata.user_upi_name = payload.user_upi_name;
    if (payload.payment_note) metadata.payment_note = payload.payment_note;
  }

  const { data: payment, error: paymentError } = await adminClient
    .from("payments")
    .insert({
      user_id: user.id,
      plan_code: "sucesskart_meet",
      gateway: gateway,
      status: gateway === "manual" ? "pending" : "created",
      base_amount: price,
      discount_amount: 0,
      final_amount: price,
      amount: price,
      currency: "INR",
      payment_tag: "sucesskart_meet",
      metadata: metadata,
    })
    .select("id, status")
    .single();

  if (paymentError || !payment) {
    return errorResponse(paymentError?.message || "Failed to create payment record.", 500);
  }

  if (gateway === "manual") {
    // Create notification for user
    try {
      await adminClient.rpc("send_notification", {
        p_user_id: user.id,
        p_title: "SucessKart Meet Payment Submitted",
        p_content: `Your payment request of ₹${price} for SucessKart Meet API has been submitted. Admin will verify and credit your account shortly.`,
        p_type: "payment_manual",
      });
    } catch {
      // notification is optional
    }

    return jsonResponse({
      mode: "manual",
      payment_id: payment.id,
      amount: price,
      status: "pending",
    });
  }

  if (!razorpayKeyId || !razorpayKeySecret) {
    await adminClient.from("payments").update({
      status: "failed",
      failure_reason: "Razorpay environment variables are missing.",
      updated_at: now,
    }).eq("id", payment.id);
    return errorResponse("Payment gateway is not configured.", 500);
  }

  const auth = btoa(`${razorpayKeyId}:${razorpayKeySecret}`);
  const razorpayResponse = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: Math.round(price * 100),
      currency: "INR",
      receipt: `skm_${payment.id}`,
      notes: {
        payment_id: payment.id,
        user_id: user.id,
        product: "sucesskart_meet",
      },
    }),
  });

  const razorpayOrder = await razorpayResponse.json();
  if (!razorpayResponse.ok || !razorpayOrder?.id) {
    await adminClient.from("payments").update({
      status: "failed",
      failure_reason: razorpayOrder?.error?.description || "Failed to create Razorpay order.",
      updated_at: now,
    }).eq("id", payment.id);
    return errorResponse(
      razorpayOrder?.error?.description || "Failed to create Razorpay order.",
      razorpayResponse.status || 500,
    );
  }

  await adminClient.from("payments").update({
    gateway_order_id: razorpayOrder.id,
    updated_at: now,
  }).eq("id", payment.id);

  return jsonResponse({
    mode: "razorpay",
    key_id: razorpayKeyId,
    payment_id: payment.id,
    order_id: razorpayOrder.id,
    amount: razorpayOrder.amount,
    currency: razorpayOrder.currency || "INR",
  });
});
