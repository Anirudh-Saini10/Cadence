const RESEND_API_KEY = import.meta.env.VITE_RESEND_API_KEY as string | undefined;
const FROM = "Cadence <onboarding@resend.dev>";

interface EmailPayload {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail(payload: EmailPayload): Promise<void> {
  if (!RESEND_API_KEY) {
    console.warn("[cadence] VITE_RESEND_API_KEY not set — skipping email");
    return;
  }
  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: FROM, ...payload }),
    });
  } catch (e) {
    console.warn("[cadence] email send failed", e);
  }
}

export function goalSubmittedEmail(opts: {
  managerEmail: string;
  managerName: string;
  employeeName: string;
  cycleName: string;
  goalCount: number;
}): EmailPayload {
  return {
    to: opts.managerEmail,
    subject: `Action Required: ${opts.employeeName} has submitted goals for review`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:auto;padding:24px;color:#1f2937">
        <h2 style="color:#1e40af">Cadence — Goals Submitted for Review</h2>
        <p>Hi ${opts.managerName},</p>
        <p><strong>${opts.employeeName}</strong> has submitted <strong>${opts.goalCount} goal(s)</strong> for the <strong>${opts.cycleName}</strong> cycle and they are awaiting your approval.</p>
        <a href="https://cadence-atomquest.vercel.app/team" style="display:inline-block;margin-top:16px;padding:10px 20px;background:#3b82f6;color:white;border-radius:6px;text-decoration:none;font-weight:600">Review Goals</a>
        <p style="margin-top:24px;color:#6b7280;font-size:0.85rem">Cadence · Goal Setting & Performance Tracking</p>
      </div>`,
  };
}

export function goalApprovedEmail(opts: {
  employeeEmail: string;
  employeeName: string;
  cycleName: string;
}): EmailPayload {
  return {
    to: opts.employeeEmail,
    subject: `Your goals have been approved for ${opts.cycleName}`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:auto;padding:24px;color:#1f2937">
        <h2 style="color:#059669">Cadence — Goals Approved</h2>
        <p>Hi ${opts.employeeName},</p>
        <p>Your goals for the <strong>${opts.cycleName}</strong> cycle have been <strong>approved and locked</strong> by your manager.</p>
        <p>You can now record your quarterly check-ins as the cycle progresses.</p>
        <a href="https://cadence-atomquest.vercel.app/goals" style="display:inline-block;margin-top:16px;padding:10px 20px;background:#059669;color:white;border-radius:6px;text-decoration:none;font-weight:600">View My Goals</a>
        <p style="margin-top:24px;color:#6b7280;font-size:0.85rem">Cadence · Goal Setting & Performance Tracking</p>
      </div>`,
  };
}

export function goalReturnedEmail(opts: {
  employeeEmail: string;
  employeeName: string;
  cycleName: string;
  reason: string;
}): EmailPayload {
  return {
    to: opts.employeeEmail,
    subject: `A goal was returned for rework — ${opts.cycleName}`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:auto;padding:24px;color:#1f2937">
        <h2 style="color:#dc2626">Cadence — Goal Returned for Rework</h2>
        <p>Hi ${opts.employeeName},</p>
        <p>Your manager has returned one of your goals for the <strong>${opts.cycleName}</strong> cycle with the following feedback:</p>
        <blockquote style="border-left:4px solid #dc2626;padding:8px 16px;background:#fef2f2;margin:16px 0;border-radius:4px;color:#991b1b">${opts.reason}</blockquote>
        <p>Please update your goal and resubmit for approval.</p>
        <a href="https://cadence-atomquest.vercel.app/goals" style="display:inline-block;margin-top:16px;padding:10px 20px;background:#dc2626;color:white;border-radius:6px;text-decoration:none;font-weight:600">Update My Goals</a>
        <p style="margin-top:24px;color:#6b7280;font-size:0.85rem">Cadence · Goal Setting & Performance Tracking</p>
      </div>`,
  };
}

export function escalationEmail(opts: {
  targetEmail: string;
  targetName: string;
  ruleType: string;
  cycleName: string;
  thresholdDays: number;
}): EmailPayload {
  const messages: Record<string, string> = {
    goal_not_submitted: `You have not submitted your goals for the <strong>${opts.cycleName}</strong> cycle yet. The deadline was <strong>${opts.thresholdDays} days ago</strong>. Please log in and submit your goals for manager approval as soon as possible.`,
    checkin_overdue: `Your quarterly check-in for the <strong>${opts.cycleName}</strong> cycle is overdue by <strong>${opts.thresholdDays} days</strong>. Please log in and record your progress.`,
    goal_not_approved: `You have team members with goals pending approval for more than <strong>${opts.thresholdDays} days</strong>. Please review and approve their goals.`,
  };
  return {
    to: opts.targetEmail,
    subject: `Action Required: ${opts.ruleType.replace(/_/g, " ")} — ${opts.cycleName}`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:auto;padding:24px;color:#1f2937">
        <h2 style="color:#d97706">Cadence — Action Required</h2>
        <p>Hi ${opts.targetName},</p>
        <p>${messages[opts.ruleType] ?? "Please log in to Cadence to take action."}</p>
        <a href="https://cadence-atomquest.vercel.app" style="display:inline-block;margin-top:16px;padding:10px 20px;background:#d97706;color:white;border-radius:6px;text-decoration:none;font-weight:600">Open Cadence</a>
        <p style="margin-top:24px;color:#6b7280;font-size:0.85rem">Cadence · Goal Setting & Performance Tracking</p>
      </div>`,
  };
}
