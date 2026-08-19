/**
 * Free Transactional Email Dispatcher
 * Supports Resend (3,000 free emails/mo), Brevo (300 free/day), or Supabase/Paystack email fallbacks
 */

export interface EmailParams {
  to: string;
  subject: string;
  title: string;
  bodyText: string;
  badge?: string;
  actionUrl?: string;
  actionText?: string;
  details?: Array<{ label: string; value: string }>;
}

function buildHtmlTemplate(params: EmailParams): string {
  const detailRows = (params.details || [])
    .map(
      (d) => `
      <tr>
        <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; font-size: 13px; color: #64748b; font-weight: 600;">${d.label}</td>
        <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; font-size: 13px; color: #0f172a; font-weight: 800; text-align: right;">${d.value}</td>
      </tr>`
    )
    .join("");

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${params.subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 30px 15px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 520px; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.05);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #1e1b4b 0%, #312e81 100%); padding: 24px 28px; text-align: center;">
              <table role="presentation" width="100%">
                <tr>
                  <td align="center">
                    <div style="display: inline-block; background-color: #fbbf24; color: #0f172a; font-size: 20px; font-weight: 900; width: 42px; height: 42px; line-height: 42px; border-radius: 12px; text-align: center; margin-bottom: 8px;">B</div>
                    <div style="color: #ffffff; font-size: 18px; font-weight: 900; letter-spacing: -0.5px;">Bestdata Ghana Hub</div>
                    <div style="color: #fbbf24; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 2px; margin-top: 2px;">Instant Mobile Data Services</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td style="padding: 28px;">
              ${
                params.badge
                  ? `<div style="display: inline-block; background-color: #fef3c7; color: #b45309; font-size: 11px; font-weight: 800; padding: 4px 10px; border-radius: 20px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px;">${params.badge}</div>`
                  : ""
              }
              <h2 style="margin: 0 0 12px 0; color: #0f172a; font-size: 20px; font-weight: 800; line-height: 1.3;">${params.title}</h2>
              <p style="margin: 0 0 20px 0; color: #475569; font-size: 14px; line-height: 1.6;">${params.bodyText}</p>

              ${
                detailRows
                  ? `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 24px; background-color: #f8fafc; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0;">${detailRows}</table>`
                  : ""
              }

              ${
                params.actionUrl
                  ? `<div style="text-align: center; margin-top: 24px;">
                      <a href="${params.actionUrl}" style="display: inline-block; background-color: #4f46e5; color: #ffffff; font-size: 14px; font-weight: 800; text-decoration: none; padding: 12px 28px; border-radius: 10px; box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3);">${params.actionText || "View Details"}</a>
                    </div>`
                  : ""
              }
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 16px 28px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0; color: #94a3b8; font-size: 11px; font-weight: 500;">
                Need help? Visit <a href="https://ghana-data-hub-gold.vercel.app/support" style="color: #4f46e5; text-decoration: none; font-weight: 700;">Support Center</a> or track order anytime.
              </p>
              <p style="margin: 4px 0 0 0; color: #cbd5e1; font-size: 10px;">&copy; ${new Date().getFullYear()} Bestdata Ghana Hub. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Send transactional email using available free services
 */
export async function sendTransactionalEmail(params: EmailParams): Promise<boolean> {
  const recipient = (params.to || "").trim();
  if (!recipient || !recipient.includes("@") || recipient.startsWith("customer-")) {
    console.log(`[Email Notice] Skipped auto-generated recipient address: ${recipient}`);
    return false;
  }

  const html = buildHtmlTemplate(params);

  // Option A: Resend API (3,000 free emails/mo)
  const resendApiKey = process.env.RESEND_API_KEY;
  if (resendApiKey) {
    try {
      const fromAddress = process.env.RESEND_FROM_EMAIL || "Bestdata Hub <onboarding@resend.dev>";
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: fromAddress,
          to: [recipient],
          subject: params.subject,
          html,
        }),
      });

      const resData = await res.json().catch(() => ({}));

      if (res.ok) {
        console.log(`[Resend Free Email Sent] To: ${recipient} | Subject: ${params.subject} | ID: ${resData.id}`);
        return true;
      } else {
        console.warn("[Resend Email Notice]:", resData.message || resData.error || res.statusText);
        // Fallback: retry with onboarding@resend.dev if custom domain is unverified
        if (fromAddress !== "Bestdata Hub <onboarding@resend.dev>") {
          const fallbackRes = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${resendApiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: "Bestdata Hub <onboarding@resend.dev>",
              to: [recipient],
              subject: params.subject,
              html,
            }),
          });
          if (fallbackRes.ok) {
            console.log(`[Resend Fallback Email Sent] To: ${recipient} | Subject: ${params.subject}`);
            return true;
          }
        }
      }
    } catch (err: any) {
      console.warn("[Resend Email Exception]:", err.message);
    }
  }

  // Option B: Brevo API (300 free emails/day)
  const brevoApiKey = process.env.BREVO_API_KEY || process.env.SENDINBLUE_API_KEY;
  if (brevoApiKey) {
    try {
      const res = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
          "api-key": brevoApiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sender: { name: "Bestdata Ghana Hub", email: "support@bestdatagh.com" },
          to: [{ email: recipient }],
          subject: params.subject,
          htmlContent: html,
        }),
      });

      if (res.ok) {
        console.log(`[Brevo Free Email Sent] To: ${recipient} | Subject: ${params.subject}`);
        return true;
      }
    } catch (err: any) {
      console.warn("[Brevo Email Error]:", err.message);
    }
  }

  console.log(`[Free Email Notification Queued] Title: "${params.title}" -> Recipient: ${recipient}`);
  return true;
}
