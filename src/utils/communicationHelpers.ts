export function sendEmail(to: string, subject: string, body: string) {
  console.log('Sending email:', { to, subject, body });
}

export function sendTeamsMessage(channelId: string, message: string) {
  console.log('Sending Teams message:', { channelId, message });
}

export function sendSlackMessage(channelId: string, message: string) {
  console.log('Sending Slack message:', { channelId, message });
}

export async function sendAssignmentViaTeams(assignment: {
  title: string;
  description?: string;
  assignedTo: string;
  dueDate?: string;
  priority?: string;
}) {
  const message = `
**New Assignment: ${assignment.title}**

Assigned to: ${assignment.assignedTo}
${assignment.priority ? `Priority: ${assignment.priority}` : ''}
${assignment.dueDate ? `Due: ${assignment.dueDate}` : ''}

${assignment.description || ''}
  `.trim();

  console.log('Sending assignment via Teams:', { assignment, message });
  return { success: false, error: 'Teams send is not connected. Copy the assignment instead.' };
}

export async function sendAssignmentViaEmail(assignment: {
  title: string;
  description?: string;
  assignedTo: string;
  assignedToEmail?: string;
  dueDate?: string;
  priority?: string;
}) {
  const subject = `New Assignment: ${assignment.title}`;
  const body = `
Hello ${assignment.assignedTo},

You have been assigned a new task:

Title: ${assignment.title}
${assignment.priority ? `Priority: ${assignment.priority}` : ''}
${assignment.dueDate ? `Due Date: ${assignment.dueDate}` : ''}

Description:
${assignment.description || 'No description provided'}

Please acknowledge receipt of this assignment.

Best regards,
MPB Health Team
  `.trim();

  const email = assignment.assignedToEmail || 'user@example.com';
  console.log('Sending assignment via email:', { email, subject, body });
  return { success: false, error: 'Assignment email send is not connected. Copy the assignment instead.' };
}

export async function copyAssignmentToClipboard(assignment: {
  title: string;
  description?: string;
  assignedTo: string;
  dueDate?: string;
  priority?: string;
}) {
  const text = `
Assignment: ${assignment.title}
Assigned to: ${assignment.assignedTo}
${assignment.priority ? `Priority: ${assignment.priority}` : ''}
${assignment.dueDate ? `Due: ${assignment.dueDate}` : ''}

${assignment.description || ''}
  `.trim();

  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return { success: true, message: 'Assignment copied to clipboard' };
    } else {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      return { success: true, message: 'Assignment copied to clipboard' };
    }
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    return { success: false, message: 'Failed to copy to clipboard' };
  }
}

export default {
  sendEmail,
  sendTeamsMessage,
  sendSlackMessage,
  sendAssignmentViaTeams,
  sendAssignmentViaEmail,
  copyAssignmentToClipboard,
};
