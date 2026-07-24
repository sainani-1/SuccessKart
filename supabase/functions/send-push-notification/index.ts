import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as webPush from "https://esm.sh/web-push@3.6.7";

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

const createAuthorizedClient = (supabaseUrl: string, anonKey: string, jwt: string) =>
  createClient(supabaseUrl, anonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${jwt}`,
      },
    },
  });

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return errorResponse("Method not allowed.", 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");
  const vapidSubject = Deno.env.get("VAPID_SUBJECT") || "mailto:noreply@successkart.vercel.app";

  if (!supabaseUrl || !serviceRoleKey || !anonKey) {
    return errorResponse("Missing Supabase environment variables.", 500);
  }

  if (!vapidPrivateKey) {
    return errorResponse("VAPID_PRIVATE_KEY is not configured.", 500);
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return errorResponse("Missing Authorization bearer token.", 401);
  }

  const jwt = authHeader.replace("Bearer ", "").trim();
  const adminClient = createClient(supabaseUrl, serviceRoleKey);
  const authClient = createAuthorizedClient(supabaseUrl, anonKey, jwt);

  const { data: { user }, error: userError } = await authClient.auth.getUser();
  if (userError || !user?.id) {
    return errorResponse("Invalid user session.", 401);
  }

  const { data: adminProfile } = await adminClient
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .maybeSingle();

  if (adminProfile?.role !== "admin") {
    return errorResponse("Admin access required.", 403);
  }

  let payload: { title?: string; body?: string; target_url?: string; target_role?: string };
  try {
    payload = await req.json();
  } catch {
    return errorResponse("Invalid request body.", 400);
  }

  const title = String(payload.title || "").trim();
  const bodyText = String(payload.body || "").trim();
  const targetUrl = String(payload.target_url || "/app").trim();
  const targetRole = String(payload.target_role || "all").trim();

  if (!title || !bodyText) {
    return errorResponse("title and body are required.", 400);
  }

  webPush.default.setVapidDetails(
    vapidSubject,
    Deno.env.get("VAPID_PUBLIC_KEY") || "",
    vapidPrivateKey
  );

  let query = adminClient
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth, user_id");

  if (targetRole !== "all") {
    const { data: roleUsers } = await adminClient
      .from("profiles")
      .select("id")
      .eq("role", targetRole);

    const userIds = (roleUsers || []).map((u: { id: string }) => u.id);
    if (userIds.length === 0) {
      return jsonResponse({ success: true, sent_count: 0, message: "No subscribers found for role." });
    }
    query = query.in("user_id", userIds);
  }

  const { data: subscriptions, error: subError } = await query;

  if (subError) {
    return errorResponse("Failed to fetch subscriptions: " + subError.message, 500);
  }

  if (!subscriptions || subscriptions.length === 0) {
    return jsonResponse({ success: true, sent_count: 0, message: "No push subscriptions found." });
  }

  const notificationPayload = JSON.stringify({
    title,
    body: bodyText,
    url: targetUrl,
    icon: "/NewLogo.jpeg",
    tag: `admin-push-${Date.now()}`,
  });

  let sentCount = 0;
  const failedEndpoints: string[] = [];

  const sendPromises = subscriptions.map(async (sub: { endpoint: string; p256dh: string; auth: string }) => {
    try {
      await webPush.default.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
        },
        notificationPayload
      );
      sentCount++;
    } catch (err: unknown) {
      const statusCode = (err as { statusCode?: number })?.statusCode;
      if (statusCode === 404 || statusCode === 410) {
        failedEndpoints.push(sub.endpoint);
      }
    }
  });

  await Promise.allSettled(sendPromises);

  if (failedEndpoints.length > 0) {
    await adminClient
      .from("push_subscriptions")
      .delete()
      .in("endpoint", failedEndpoints);
  }

  await adminClient.from("admin_notifications").insert({
    type: "push",
    title,
    content: bodyText,
    target_role: targetRole,
    target_url: targetUrl,
    sent_count: sentCount,
    created_at: new Date().toISOString(),
  });

  return jsonResponse({ success: true, sent_count: sentCount });
});
