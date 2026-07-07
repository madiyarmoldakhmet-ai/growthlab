// Canonical funnel/message statuses — mirror the backend, do NOT invent new ones on the UI.
// Keys map to backend enums; labels are the Russian UI text the team agreed on.
export type StatusKey =
  | "queued" // MessageStatus.queued
  | "sending" // MessageStatus.sending
  | "sent" // MessageStatus.sent
  | "failed" // MessageStatus.failed / bounced
  | "replied" // EventType.replied / LeadStatus.replied
  | "interested" // EventType.positive
  | "qualified"; // qualified lead

export const STATUS_LABEL: Record<StatusKey, string> = {
  queued: "ожидает",
  sending: "отправляется",
  sent: "отправлено",
  failed: "ошибка",
  replied: "ответил",
  interested: "заинтересован",
  qualified: "качественный лид",
};

export const STATUS_COLOR: Record<StatusKey, { bg: string; fg: string }> = {
  queued: { bg: "#eef1f6", fg: "#5b6677" },
  sending: { bg: "#e6efff", fg: "#2d6cdf" },
  sent: { bg: "#e2f5ef", fg: "#0d8a5f" },
  failed: { bg: "#fdecec", fg: "#c4302b" },
  replied: { bg: "#efe9fb", fg: "#6b3fc0" },
  interested: { bg: "#e2f5ef", fg: "#0d8a5f" },
  qualified: { bg: "#fff4d6", fg: "#9a6a00" },
};

export const ALL_STATUSES: StatusKey[] = [
  "queued",
  "sending",
  "sent",
  "failed",
  "replied",
  "interested",
  "qualified",
];
