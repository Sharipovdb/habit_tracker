import nodemailer from "nodemailer";

export interface DailyStatsReminderMessage {
  to: string;
  recipientName: string | null;
  localDate: string;
}

export interface ReminderMailer {
  sendDailyStatsReminder(message: DailyStatsReminderMessage): Promise<void>;
}

type LoggerLike = {
  info: (details: unknown, message?: string) => void;
  warn: (details: unknown, message?: string) => void;
  error: (details: unknown, message?: string) => void;
};

type ReminderMailerOptions = {
  logger?: LoggerLike;
  fromEmail?: string;
};

function buildReminderMarkup(recipientName: string | null) {
  const greeting = recipientName?.trim() ? `Hi ${recipientName.trim()},` : "Hi,";

  return {
    subject: "Reminder: fill in today's habit stats",
    text: `${greeting}\n\nYou have not filled in today's habit stats yet. Open HabitTracker and add at least one log for today.\n`,
    html: `<p>${greeting}</p><p>You have not filled in today's habit stats yet.</p><p>Open HabitTracker and add at least one log for today.</p>`,
  };
}

export function createReminderMailer(options: ReminderMailerOptions = {}): ReminderMailer | null {
  const host = process.env.REMINDER_SMTP_HOST?.trim();
  const port = Number(process.env.REMINDER_SMTP_PORT ?? 587);
  const secure = process.env.REMINDER_SMTP_SECURE === "true";
  const user = process.env.REMINDER_SMTP_USER?.trim();
  const pass = process.env.REMINDER_SMTP_PASS?.trim();
  const fromEmail = options.fromEmail ?? process.env.REMINDER_FROM_EMAIL?.trim();

  if (!host || !fromEmail || !Number.isFinite(port)) {
    options.logger?.info({ hostConfigured: Boolean(host), fromConfigured: Boolean(fromEmail) }, "Daily reminder mailer is not configured");
    return null;
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    ...(user && pass ? { auth: { user, pass } } : {}),
  });

  return {
    async sendDailyStatsReminder(message) {
      const markup = buildReminderMarkup(message.recipientName);

      await transporter.sendMail({
        from: fromEmail,
        to: message.to,
        subject: markup.subject,
        text: markup.text,
        html: markup.html,
      });
    },
  };
}