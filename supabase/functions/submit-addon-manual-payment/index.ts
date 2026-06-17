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
  try {
    if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
    if (req.method !== "POST") return errorResponse("Method not allowed.", 405);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) return errorResponse("Missing Supabase config.", 500);

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return errorResponse("Missing Authorization.", 401);

    const jwt = authHeader.replace("Bearer ", "").trim();
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY") || "", {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
    });

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user?.id) return errorResponse("Invalid session.", 401);

    const { data: profile } = await adminClient
      .from("profiles")
      .select("id, full_name, email, phone")
      .eq("id", user.id)
      .maybeSingle();
    if (!profile) return errorResponse("Profile not found.", 404);

    let body: Record<string, unknown>;
    try { body = await req.json(); } catch { return errorResponse("Invalid JSON.", 400); }

    const addonId = String(body.addon_id || "").trim();
    const addonName = String(body.addon_name || "").trim();
    const addonPrice = Number(body.addon_price || 0);
    const transactionId = String(body.transaction_id || "").trim();
    const upiId = String(body.upi_id || "").trim();
    const upiName = String(body.upi_name || "").trim();
    const paymentNote = String(body.payment_note || "").trim();
    const screenshotUrl = String(body.screenshot_url || "").trim();

    if (!addonId || !addonName || !addonPrice || !transactionId || !upiId || !upiName || !screenshotUrl) {
      return errorResponse("Missing required fields: addon_id, addon_name, addon_price, transaction_id, upi_id, upi_name, screenshot_url.", 400);
    }

    const { data: payment, error: insertError } = await adminClient
      .from("payments")
      .insert({
        user_id: user.id,
        gateway: "manual",
        status: "pending",
        amount: addonPrice * 100,
        final_amount: addonPrice * 100,
        payment_tag: "addon",
        metadata: {
          addon_id: addonId,
          addon_name: addonName,
          addon_price: addonPrice,
          payment_tag: "addon",
          transaction_id: transactionId,
          user_upi_id: upiId,
          user_upi_name: upiName,
          payment_note: paymentNote,
          screenshot_url: screenshotUrl,
          payment_method: "manual",
        },
      })
      .select("id")
      .single();

    if (insertError || !payment) {
      return errorResponse(insertError?.message || "Failed to create payment record.", 500);
    }

    const userName = profile.full_name || "User";
    const userEmail = profile.email || "";
    const userPhone = profile.phone || "-";

    // Send in-app admin notification
    const notifPayload = {
      title: "Add-On Payment Submitted",
      content: `${userName} (${userEmail}) submitted a manual add-on payment for ${addonName}. Amount: ₹${addonPrice}. TX ID: ${transactionId}. UPI: ${upiId} (${upiName}).`,
      type: "payment_manual",
      metadata: {
        payment_id: payment.id,
        addon_name: addonName,
        addon_price: addonPrice,
        transaction_id: transactionId,
        gateway: "manual",
      },
    };

    try {
      await adminClient.rpc("send_notification", {
        p_user_id: user.id,
        p_title: notifPayload.title,
        p_content: notifPayload.content,
        p_type: notifPayload.type,
        p_metadata: notifPayload.metadata,
      });
    } catch {
      // Notifications should never block payment flow
    }

    // Send email to admin
    let adminEmail = "";
    const { data: emailSetting } = await adminClient
      .from("settings")
      .select("value")
      .eq("key", "payment_admin_email")
      .maybeSingle();
    if (emailSetting?.value) adminEmail = String(emailSetting.value).trim();

    if (!adminEmail) {
      const { data: supportEmail } = await adminClient
        .from("settings")
        .select("value")
        .eq("key", "support_contact_email")
        .maybeSingle();
      if (supportEmail?.value) adminEmail = String(supportEmail.value).trim();
    }

    if (adminEmail) {
      const resendApiKey = Deno.env.get("RESEND_API_KEY");
      const fromEmail = Deno.env.get("PAYMENT_FROM_EMAIL") || Deno.env.get("RESEND_FROM_EMAIL") || "onboarding@resend.dev";
      if (resendApiKey) {
        try {
          const now = new Date();
          const createdDate = now.toLocaleString("en-IN", { day: "numeric", month: "numeric", year: "numeric", hour: "numeric", minute: "numeric", second: "numeric", hour12: true });
          await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: { Authorization: `Bearer ${resendApiKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              from: `SucessKart <${fromEmail}>`,
              to: [adminEmail],
              subject: `SucessKart - Add-On Manual Payment from ${userName}`,
              html: `
                <div style="font-family:Inter,Arial,sans-serif;max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;">
                  <div style="background:linear-gradient(135deg,#1e293b,#334155);padding:24px 32px;text-align:center;">
                    <h1 style="color:#ffffff;margin:0;font-size:20px;font-weight:700;">Add-On Manual Payment</h1>
                    <p style="color:#94a3b8;margin:6px 0 0;font-size:14px;">A new add-on payment request has been submitted</p>
                  </div>
                  <div style="padding:24px 32px;">
                    <div style="background:#f8fafc;border-radius:8px;padding:16px;margin-bottom:20px;">
                      <h2 style="font-size:13px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:0.1em;margin:0 0 12px;">User Information</h2>
                      <table style="width:100%;border-collapse:collapse;font-size:14px;">
                        <tr><td style="padding:6px 0;color:#64748b;width:100px;">Name</td><td style="padding:6px 0;color:#0f172a;font-weight:600;">${userName}</td></tr>
                        <tr><td style="padding:6px 0;color:#64748b;">Email</td><td style="padding:6px 0;color:#0f172a;">${userEmail}</td></tr>
                        <tr><td style="padding:6px 0;color:#64748b;">Phone</td><td style="padding:6px 0;color:#0f172a;">${userPhone}</td></tr>
                      </table>
                    </div>
                    <div style="background:#f8fafc;border-radius:8px;padding:16px;margin-bottom:20px;">
                      <h2 style="font-size:13px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:0.1em;margin:0 0 12px;">Add-On Details</h2>
                      <table style="width:100%;border-collapse:collapse;font-size:14px;">
                        <tr><td style="padding:5px 0;color:#64748b;width:140px;">Add-On</td><td style="padding:5px 0;color:#0f172a;">${addonName}</td></tr>
                        <tr><td style="padding:5px 0;color:#64748b;">Amount</td><td style="padding:5px 0;color:#059669;font-weight:700;">₹${addonPrice}</td></tr>
                        <tr><td style="padding:5px 0;color:#64748b;">Status</td><td style="padding:5px 0;"><span style="display:inline-block;background:#fef3c7;color:#92400e;padding:2px 10px;border-radius:999px;font-size:12px;font-weight:600;">Pending</span></td></tr>
                        <tr><td style="padding:5px 0;color:#64748b;">Transaction ID</td><td style="padding:5px 0;color:#0f172a;font-family:monospace;">${transactionId}</td></tr>
                        <tr><td style="padding:5px 0;color:#64748b;">UPI ID</td><td style="padding:5px 0;color:#0f172a;">${upiId}</td></tr>
                        <tr><td style="padding:5px 0;color:#64748b;">UPI Name</td><td style="padding:5px 0;color:#0f172a;">${upiName}</td></tr>
                        <tr><td style="padding:5px 0;color:#64748b;">Payment Note</td><td style="padding:5px 0;color:#0f172a;">${paymentNote || "-"}</td></tr>
                        <tr><td style="padding:5px 0;color:#64748b;">Payment ID</td><td style="padding:5px 0;color:#0f172a;font-family:monospace;">${payment.id}</td></tr>
                        <tr><td style="padding:5px 0;color:#64748b;">Created</td><td style="padding:5px 0;color:#0f172a;">${createdDate}</td></tr>
                      </table>
                    </div>
                    <div style="background:#f8fafc;border-radius:8px;padding:16px;margin-bottom:20px;text-align:center;">
                      <h2 style="font-size:13px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:0.1em;margin:0 0 12px;">Payment Screenshot</h2>
                      <a href="${screenshotUrl}" target="_blank" style="display:inline-block;background:#3b82f6;color:#ffffff;padding:10px 24px;border-radius:6px;text-decoration:none;font-size:14px;font-weight:600;">View Screenshot</a>
                    </div>
                    <div style="text-align:center;margin-top:8px;">
                      <a href="${Deno.env.get("APP_URL") || "https://SucessKart.app"}/app/admin/addon-payments" target="_blank" style="display:inline-block;background:#1e293b;color:#ffffff;padding:12px 32px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600;">Review in Admin Panel</a>
                    </div>
                  </div>
                  <div style="background:#f8fafc;padding:16px 32px;text-align:center;border-top:1px solid #e2e8f0;">
                    <p style="color:#94a3b8;font-size:12px;margin:0;">SucessKart &bull; This is an automated notification from the payment system.</p>
                  </div>
                </div>
              `,
            }),
          });
        } catch {
          // Ignore email failures
        }
      }
    }

    return jsonResponse({ success: true, payment_id: payment.id });
  } catch (error) {
    return errorResponse(error instanceof Error ? error.message : "Unexpected error.", 500);
  }
});
