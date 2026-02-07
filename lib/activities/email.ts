/**
 * Email Activities for Temporal Workflows
 *
 * These activities handle email sending.
 * For MVP, this is stubbed. In production, integrate with SendGrid/Resend/etc.
 */

/**
 * Sends an email
 *
 * @param to - Recipient email address
 * @param subject - Email subject
 * @param body - Email body (plain text or HTML)
 * @param from - Sender email (optional, defaults to system email)
 */
export async function sendEmail(
  to: string,
  subject: string,
  body: string,
  from?: string
): Promise<void> {
  console.log(`Activity: Sending email to ${to}`);
  console.log(`  Subject: ${subject}`);
  console.log(`  From: ${from || "noreply@bytedashboard.com"}`);
  console.log(`  Body preview: ${body.substring(0, 100)}...`);

  // TODO: Integrate with email service (SendGrid, Resend, etc.)
  // Example with Resend:
  // import { Resend } from 'resend';
  // const resend = new Resend(process.env.RESEND_API_KEY);
  // await resend.emails.send({
  //   from: from || 'noreply@bytedashboard.com',
  //   to,
  //   subject,
  //   html: body,
  // });

  // For now, just simulate delay
  await new Promise((resolve) => setTimeout(resolve, 100));

  console.log(`Activity: Email sent (stubbed for MVP)`);
}

/**
 * Sends a welcome email to an approved applicant
 *
 * @param to - Recipient email
 * @param firstName - Recipient first name
 */
export async function sendWelcomeEmail(
  to: string,
  firstName: string
): Promise<void> {
  const subject = "Welcome to the Team!";
  const body = `
    <h1>Congratulations, ${firstName}!</h1>
    <p>We're excited to welcome you to our team. Your submission has been approved.</p>
    <p>Next steps will be communicated to you shortly.</p>
    <br>
    <p>Best regards,<br>The Team</p>
  `;

  await sendEmail(to, subject, body);
}

/**
 * Sends a rejection email to an applicant
 *
 * @param to - Recipient email
 * @param firstName - Recipient first name
 * @param reason - Optional rejection reason
 */
export async function sendRejectionEmail(
  to: string,
  firstName: string,
  reason?: string
): Promise<void> {
  const subject = "Workflow Submission Status Update";
  const body = `
    <h1>Thank you for your submission, ${firstName}</h1>
    <p>We appreciate your interest in joining our team. After careful review, we've decided not to move forward with this submission at this time.</p>
    ${reason ? `<p>Feedback: ${reason}</p>` : ""}
    <p>We encourage you to submit again for future opportunities that match your qualifications.</p>
    <br>
    <p>Best regards,<br>The Team</p>
  `;

  await sendEmail(to, subject, body);
}
