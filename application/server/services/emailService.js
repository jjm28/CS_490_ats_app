// services/emailService.js
import nodemailer from "nodemailer";

const {
  SMTP_HOST,
  SMTP_PORT,
  SMTP_USER,
  SMTP_PASS,
  EMAIL_FROM,
  FRONTEND_ORIGIN,
} = process.env;

// Basic transporter using SMTP
const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: Number(SMTP_PORT || 587),
  secure: false, // true for 465, false for 587
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASS,
  },
});

/**
 * Send supporter invite email with magic link.
 */
export async function sendSupporterInviteEmail({
  toEmail,
  supporterName,
  jobSeekerName,
  relationship,
  inviteToken,
}) {
  if (!FRONTEND_ORIGIN) {
    console.warn(
      "FRONTEND_ORIGIN is not set, cannot build supporter invite link"
    );
    return;
  }

  const acceptUrl = `${FRONTEND_ORIGIN}/supporter/accept?token=${encodeURIComponent(
    inviteToken
  )}`;

  const subject = `${jobSeekerName || "Someone"} invited you to support their job search`;
  const greetingName = supporterName || "there";

  const textBody = `
Hi ${greetingName},

${jobSeekerName || "A job seeker"} has invited you to support them${
    relationship ? ` as their ${relationship}` : ""
  } in their job search using the ATS for Candidates platform.

You’ll be able to see a privacy-friendly summary of their progress and learn how to support them without seeing sensitive details they don’t want to share.

To accept the invite and view their support dashboard, click this link:
${acceptUrl}

If you weren’t expecting this email, you can ignore it.
`;

  const htmlBody = `
  <p>Hi ${greetingName},</p>
  <p>
    <strong>${jobSeekerName || "A job seeker"}</strong> has invited you to support them${
    relationship ? ` as their ${relationship}` : ""
  } in their job search using the ATS for Candidates platform.
  </p>
  <p>
    You’ll be able to see a privacy-friendly summary of their progress and learn how to support them
    without seeing sensitive details they don’t want to share.
  </p>
  <p style="margin: 16px 0;">
    <a href="${acceptUrl}"
       style="background-color:#2563eb;color:#ffffff;padding:10px 16px;border-radius:6px;text-decoration:none;">
      Accept invite &amp; view dashboard
    </a>
  </p>
  <p>If the button doesn’t work, copy and paste this link into your browser:</p>
  <p><code style="font-size:12px;">${acceptUrl}</code></p>
  <p style="font-size:12px;color:#888;">
    If you weren’t expecting this email, you can ignore it.
  </p>
  `;

  await transporter.sendMail({
    from: EMAIL_FROM || "no-reply@example.com",
    to: toEmail,
    subject,
    text: textBody,
    html: htmlBody,
  });
}

export async function sendPartnerInviteEmail({
  toEmail,
  partnerName,
  jobSeekerName,
  inviteToken,
}) {
  if (!FRONTEND_ORIGIN) {
    console.warn(
      "FRONTEND_ORIGIN is not set, cannot build partner invite link"
    );
    return;
  }

  const acceptUrl = `${FRONTEND_ORIGIN}/job-sharing/accept?token=${encodeURIComponent(
    inviteToken
  )}`;

  const subject = `${
    jobSeekerName || "A job seeker"
  } invited you to be an accountability partner`;
  const greetingName = partnerName || "there";

  const textBody = `
Hi ${greetingName},

${jobSeekerName || "A job seeker"} has invited you to be an accountability partner in their job search using the ATS for Candidates platform.

If you accept, you'll get access to a shared progress dashboard where you can see their goals, celebrate milestones, and leave encouragement—without seeing any sensitive details they choose not to share.

To accept the invite and view their dashboard, click this link:
${acceptUrl}

If you weren’t expecting this email, you can ignore it.
`;

  const htmlBody = `
  <p>Hi ${greetingName},</p>
  <p>
    <strong>${jobSeekerName || "A job seeker"}</strong> has invited you to be an
    accountability partner in their job search using the ATS for Candidates platform.
  </p>
  <p>
    If you accept, you'll get access to a shared progress dashboard where you can see their
    goals, celebrate milestones, and leave encouragement—without seeing sensitive details
    they choose not to share.
  </p>
  <p style="margin: 16px 0;">
    <a href="${acceptUrl}"
       style="background-color:#2563eb;color:#ffffff;padding:10px 16px;border-radius:6px;text-decoration:none;">
      Accept invite &amp; view dashboard
    </a>
  </p>
  <p>If the button doesn’t work, copy and paste this link into your browser:</p>
  <p><code style="font-size:12px;">${acceptUrl}</code></p>
  <p style="font-size:12px;color:#888;">
    If you weren’t expecting this email, you can ignore it.
  </p>
  `;

  await transporter.sendMail({
    from: EMAIL_FROM || "no-reply@example.com",
    to: toEmail,
    subject,
    text: textBody,
    html: htmlBody,
  });
}

