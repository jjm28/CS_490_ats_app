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


export async function sendAdvisorInviteEmail({
  toEmail,
  advisorName,
  jobSeekerName,
  inviteToken,
}) {
  if (!FRONTEND_ORIGIN) {
    console.warn(
      "FRONTEND_ORIGIN is not set, cannot build advisor invite link"
    );
    return;
  }

  const acceptUrl = `${FRONTEND_ORIGIN}/advisor/accept?token=${encodeURIComponent(
    inviteToken
  )}`;

  const subject = `${
    jobSeekerName || "A job seeker"
  } invited you to advise their job search`;
  const greetingName = advisorName || "there";

  const textBody = `
Hi ${greetingName},

${
  jobSeekerName || "A job seeker"
} has invited you to advise them in their job search using the ATS for Candidates platform.

You’ll get access to a privacy-friendly client dashboard where you can see their overall profile and job search summary, based on the permissions they selected.

To accept the invite and view their client dashboard, click this link:
${acceptUrl}

If you weren’t expecting this email, you can ignore it.
`;

  const htmlBody = `
  <p>Hi ${greetingName},</p>
  <p>
    <strong>${jobSeekerName || "A job seeker"}</strong> has invited you to advise them
    in their job search using the ATS for Candidates platform.
  </p>
  <p>
    You’ll get access to a privacy-friendly client dashboard where you can see their overall
    profile and job search summary, based on the permissions they selected.
  </p>
  <p style="margin: 16px 0;">
    <a href="${acceptUrl}"
       style="background-color:#2563eb;color:#ffffff;padding:10px 16px;border-radius:6px;text-decoration:none;">
      Accept invite &amp; view client dashboard
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





export async function sendJobSeekerInviteEmail({
  toEmail,
  orgName,
  inviteLink,
}) {
  if (!inviteLink) {
    console.warn(
      "sendJobSeekerInviteEmail called without inviteLink – email not sent"
    );
    return;
  }

  const safeOrgName = orgName || "a career program";
  const subject = `You’ve been invited to join ${safeOrgName}`;
  const greetingName = toEmail || "there"; // we don’t know their name yet

  const textBody = `
Hi ${greetingName},

You’ve been invited to join ${safeOrgName} on the ATS for Candidates platform.

By accepting this invite, you’ll be onboarded into the organization and can:
- Track your job search in one place
- Share progress with your career services team
- Access tools for resumes, applications, and more

To accept the invite and create your account, click this link:
${inviteLink}

If you weren’t expecting this email, you can ignore it.
`;

  const htmlBody = `
  <p>Hi ${greetingName},</p>
  <p>
    You’ve been invited to join <strong>${safeOrgName}</strong> on the ATS for Candidates platform.
  </p>
  <p>
    By accepting this invite, you’ll be onboarded into the organization and can:
  </p>
  <ul>
    <li>Track your job search in one place</li>
    <li>Share progress with your career services team</li>
    <li>Access tools for resumes, applications, and more</li>
  </ul>
  <p style="margin: 16px 0;">
    <a href="${inviteLink}"
       style="background-color:#2563eb;color:#ffffff;padding:10px 16px;border-radius:6px;text-decoration:none;">
      Accept invite &amp; create your account
    </a>
  </p>
  <p>If the button doesn’t work, copy and paste this link into your browser:</p>
  <p><code style="font-size:12px;">${inviteLink}</code></p>
export async function sendDocumentAccessEmail({
  toEmail,
  sharedurl,
  grantedBy = null,     // optional – name of the person who granted access
  role = null,          // optional – reviewer role label (e.g. "mentor", "recruiter")
  reviewDeadline = null, // optional – ISO string/date for requested review deadline
  documentName = "cover letter", // optional – e.g. "Cover letter for Acme – SWE Intern"
}) {
  if (!FRONTEND_ORIGIN) {
    console.warn("FRONTEND_ORIGIN is not set, cannot build access link");
    return;
  }

  const accessUrl = sharedurl;

  // Build small text fragments
  const byFragment = grantedBy ? ` by ${grantedBy}` : "";
  const roleFragment = role ? ` as a ${role}` : "";

  let deadlineText = "";
  let deadlineHtml = "";
  if (reviewDeadline) {
    const d = new Date(reviewDeadline);

    if (!isNaN(d.getTime())) {
      const formatted = d.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
      deadlineText = `\nWe’d appreciate it if you could share your feedback by ${formatted}.\n`;
      console.log("dafds")
      deadlineHtml = `
        <p>
          We’d appreciate it if you could share your feedback by
          <strong>${formatted}</strong>.
        </p>
      `;
    }
  }

  const subject = `Review request: ${documentName}`;

  const textBody = `
Hi,

You have been granted access${byFragment}${roleFragment} to review a private ${documentName}.

Open it here:
${accessUrl}

${deadlineText || ""}If you weren’t expecting this email, you can ignore it.
`.trim();

  const htmlBody = `
  <p>Hi,</p>
  <p>
    You have been granted access${byFragment ? ` by <strong>${grantedBy}</strong>` : ""}${roleFragment
      ? ` as a <strong>${role}</strong>`
      : ""} to review a private ${documentName}.
  </p>
  ${deadlineHtml}
  <p style="margin: 16px 0;">
    <a href="${accessUrl}"
       style="background-color:#2563eb;color:#ffffff;padding:10px 16px;border-radius:6px;text-decoration:none;">
      Open document
    </a>
  </p>
  <p>If the button doesn’t work, copy and paste this link into your browser:</p>
  <p><code style="font-size:12px;">${accessUrl}</code></p>
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
}
