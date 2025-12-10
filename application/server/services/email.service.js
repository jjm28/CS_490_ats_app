// server/services/email.service.js

/**
 * Stub email sender for team invitations.
 *
 * Later you can replace the body of this function with a real email provider
 * (Nodemailer, SendGrid, SES, etc.).
 */
export async function sendTeamInviteEmail({
  to,
  teamName,
  invitedRole,
  inviterName,
  inviterEmail,
}) {
  if (!to) return;

  const displayInviter =
    inviterName || inviterEmail || "a coach or team admin";

  console.log(
    `[email] Sending team invite to ${to} ` +
      `for team "${teamName}" as "${invitedRole}" from ${displayInviter}`
  );

  // TODO: integrate real email service here
  // e.g. await mailer.send({ to, subject, text/html ... })
}
