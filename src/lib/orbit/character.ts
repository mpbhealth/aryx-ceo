export const ORBIT_CHARACTER = {
  name: 'Orbit',
  title: 'Navigator',
  species: 'orbital sentinel',
  tagline: "I read the desk. I don't guess.",
  idle: 'Collected, billing risk, support, this page, or the whole desk — I read warehouse facts and explain them. I don’t guess.',
  scanning: 'Reading the desk…',
} as const;

export const ORBIT_NEEDS_KEY =
  'I can already answer collected, billing risk, tickets, and this page from the desk. For open-ended chat, an operator adds OPENAI_API_KEY to the agent-chat edge secrets.';

export const ORBIT_PRESETS = [
  "What's MTD collected and NOI?",
  'Who has billing risk?',
  "What's open in support?",
  'What can I do on this page?',
  'Explain the desk.',
] as const;

export const ORBIT_REFUSE_WRITE =
  "I don't write tickets, mail, warehouse facts, or source apps. I can refresh connectors or save a forecast after an operator confirms.";

export const ORBIT_OPERATOR_ONLY =
  'Operators only. I do not write the desk without an owner, admin, or COS role.';
