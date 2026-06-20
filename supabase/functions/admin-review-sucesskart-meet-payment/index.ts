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

  const { data: adminProfile } = await adminClient
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (!adminProfile || adminProfile.role !== "admin") {
    return errorResponse("Admin access required.", 403);
  }

  let payload: {
    payment_id?: string;
    action?: "approve" | "reject";
    user_id?: string;
  };
  try {
    payload = await req.json();
  } catch {
    return errorResponse("Invalid request body.", 400);
  }

  if (!payload.payment_id || !payload.action || !payload.user_id) {
    return errorResponse("payment_id, action, and user_id are required.", 400);
  }

  const { data: payment } = await adminClient
    .from("payments")
    .select("id, user_id, status")
    .eq("id", payload.payment_id)
    .maybeSingle();

  if (!payment) return errorResponse("Payment not found.", 404);
  if (payment.status !== "pending") return errorResponse("Payment is not in pending state.", 400);

  const now = new Date().toISOString();

  if (payload.action === "reject") {
    await adminClient.from("payments").update({
      status: "failed",
      failure_reason: "Rejected by admin.",
      updated_at: now,
    }).eq("id", payment.id);

    return jsonResponse({ status: "rejected", payment_id: payment.id });
  }

  if (payload.action === "approve") {
    // Check if user already has an active API key
    const { data: existingKey } = await adminClient
      .from("sucesskart_meet_api_keys")
      .select("id, minutes_remaining")
      .eq("user_id", payload.user_id)
      .eq("is_active", true)
      .maybeSingle();

    if (existingKey) {
      // Recharge: add 90 minutes to existing key
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
      // New key: create with 90 minutes
      const apiKey = crypto.randomUUID();

      const { error: keyError } = await adminClient.from("sucesskart_meet_api_keys").insert({
        user_id: payload.user_id,
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
      paid_at: now,
      gateway_signature: "Approved by admin",
      failure_reason: null,
      updated_at: now,
    }).eq("id", payment.id);

    return jsonResponse({
      status: "approved",
      payment_id: payment.id,
    });
  }

  return errorResponse("Invalid action.", 400);
});
