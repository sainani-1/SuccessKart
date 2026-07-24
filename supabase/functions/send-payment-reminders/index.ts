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
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return errorResponse("Method not allowed.", 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const mailerSendApiKey = Deno.env.get("MAILERSEND_API_KEY");
  const fromEmail = Deno.env.get("MAILERSEND_FROM_EMAIL") || "noreply@test-69oxl5eke2zl785k.mlsender.net";

  if (!supabaseUrl || !serviceRoleKey) {
    return errorResponse("Missing Supabase environment variables.", 500);
  }

  if (!mailerSendApiKey) {
    return errorResponse("MAILERSEND_API_KEY is not configured.", 500);
  }

  const authHeader = req.headers.get("Authorization");
  const isAdminRequest = !!authHeader?.startsWith("Bearer ");

  if (isAdminRequest) {
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    if (!anonKey) return errorResponse("Missing Supabase anon key.", 500);

    const jwt = authHeader!.replace("Bearer ", "").trim();
    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
    });

    const { data: { user }, error: userError } = await authClient.auth.getUser();
    if (userError || !user?.id) {
      return errorResponse("Invalid user session.", 401);
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: adminProfile } = await adminClient
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (adminProfile?.role !== "admin") {
      return errorResponse("Admin access required.", 403);
    }
  }

  const now = new Date();
  const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  const { data: profiles, error: fetchError } = await adminClient
    .from("profiles")
    .select("id, full_name, email, premium_until")
    .not("premium_until", "is", null);

  if (fetchError) {
    return errorResponse("Failed to fetch profiles: " + fetchError.message, 500);
  }

  const expiringUsers = (profiles || []).filter((p) => {
    if (!p.premium_until || !p.email) return false;
    const expiry = new Date(p.premium_until);
    return expiry <= threeDaysFromNow;
  });

  let sentCount = 0;
  const errors: string[] = [];

  for (const user of expiringUsers) {
    const expiry = new Date(user.premium_until!);
    const diffMs = expiry.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    let statusText: string;
    if (diffDays <= 0) {
      statusText = "has already expired";
    } else if (diffDays === 1) {
      statusText = "expires tomorrow";
    } else {
      statusText = `expires in ${diffDays} days`;
    }

    const userName = user.full_name || "there";
    const upgradeUrl = "https://sucesskart.vercel.app/plans";

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #7c3aed, #2563eb); border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 20px;">
          <h1 style="color: white; margin: 0; font-size: 24px;">SuccessKart</h1>
        </div>
        <div style="background: #f8fafc; border-radius: 12px; padding: 24px; border: 1px solid #e2e8f0;">
          <h2 style="color: #1e293b; margin-top: 0;">Hi ${userName},</h2>
          <p style="color: #475569; font-size: 16px; line-height: 1.6;">
            Your SuccessKart Premium membership <strong>${statusText}</strong>.
          </p>
          <p style="color: #475569; font-size: 16px; line-height: 1.6;">
            Don't lose access to exclusive courses, live classes, mock interviews, and more!
          </p>
          <div style="text-align: center; margin: 28px 0;">
            <a href="${upgradeUrl}" style="display: inline-block; background: linear-gradient(135deg, #7c3aed, #2563eb); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: bold; font-size: 16px;">
              Upgrade Now
            </a>
          </div>
          <p style="color: #94a3b8; font-size: 13px; text-align: center; margin-bottom: 0;">
            If you believe this is a mistake, please contact support.
          </p>
        </div>
        <p style="color: #cbd5e1; font-size: 12px; text-align: center; margin-top: 16px;">
          SuccessKart — Your success, our mission.
        </p>
      </div>
    `;

    try {
      const response = await fetch("https://api.mailersend.com/v1/email", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${mailerSendApiKey}`,
          "Content-Type": "application/json",
          "X-Requested-With": "XMLHttpRequest",
        },
        body: JSON.stringify({
          from: { email: fromEmail, name: "SuccessKart" },
          to: [{ email: user.email }],
          subject: `Your SuccessKart Premium ${diffDays <= 0 ? "Has Expired" : "Expiring Soon"}`,
          html,
        }),
      });

      if (response.ok) {
        sentCount++;
      } else {
        const result = await response.json().catch(() => ({}));
        errors.push(`${user.email}: ${result?.message || "Send failed"}`);
      }

      await adminClient.from("notifications").insert({
        user_id: user.id,
        title: "Premium Expiring Soon",
        content: `Your premium membership ${statusText}. Renew now to continue enjoying all premium features.`,
        type: "payment_reminder",
      });
    } catch (err) {
      errors.push(`${user.email}: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
  }

  return jsonResponse({
    success: true,
    total_found: expiringUsers.length,
    reminders_sent: sentCount,
    errors: errors.length > 0 ? errors : undefined,
  });
});
