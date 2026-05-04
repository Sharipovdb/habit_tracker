import nodemailer from "nodemailer";

export interface DailyStatsReminderMessage {
  to: string;
  recipientName: string | null;
  localDate: string;
}

export interface ProfileUpdatedNotificationMessage {
  to: string;
  recipientName: string | null;
}

export interface ReminderMailer {
  sendDailyStatsReminder(message: DailyStatsReminderMessage): Promise<void>;
  sendProfileUpdatedNotification(message: ProfileUpdatedNotificationMessage): Promise<void>;
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

type ReminderMailProvider = "smtp" | "gmail";

function getMailProvider(): ReminderMailProvider | null {
  const rawProvider = process.env.REMINDER_MAIL_PROVIDER?.trim().toLowerCase();

  if (!rawProvider) {
    return "smtp";
  }

  if (rawProvider === "smtp" || rawProvider === "gmail") {
    return rawProvider;
  }

  return null;
}

function buildReminderMarkup(recipientName: string | null) {
  const greeting = recipientName?.trim() ? `Hi ${recipientName.trim()},` : "Hi,";

  return {
    subject: "Reminder: fill in today's habit stats",
    text: `${greeting}\n\nYou have not filled in today's habit stats yet. Open HabitTracker and add at least one log for today.\n`,
    html: `<p>${greeting}</p><p>You have not filled in today's habit stats yet.</p><p>Open HabitTracker and add at least one log for today.</p>`,
  };
}

function buildProfileUpdatedMarkup(recipientName: string | null) {
  const greeting = recipientName?.trim() ? `Hi ${recipientName.trim()},` : "Hi,";

  return {
    subject: "HabitTracker profile updated",
    text: `${greeting}\n\nYour HabitTracker profile was just updated successfully.\n`,
    html: `<p>${greeting}</p><p>Your HabitTracker profile was just updated successfully.</p>`,
  };
}

export function createReminderMailer(options: ReminderMailerOptions = {}): ReminderMailer | null {
  const provider = getMailProvider();
  const host = process.env.REMINDER_SMTP_HOST?.trim();
  const port = Number(process.env.REMINDER_SMTP_PORT ?? 587);
  const secure = process.env.REMINDER_SMTP_SECURE === "true";
  const user = process.env.REMINDER_SMTP_USER?.trim();
  const pass = process.env.REMINDER_SMTP_PASS?.trim();
  const gmailUser = process.env.REMINDER_GMAIL_USER?.trim();
  const gmailAppPassword = process.env.REMINDER_GMAIL_APP_PASSWORD?.trim();
  const configuredFromEmail = process.env.REMINDER_FROM_EMAIL?.trim();

  if (!provider) {
    options.logger?.warn({ provider: process.env.REMINDER_MAIL_PROVIDER }, "Daily reminder mailer provider is invalid");
    return null;
  }

  if (provider === "gmail") {
    const fromEmail = options.fromEmail ?? configuredFromEmail ?? gmailUser;

    if (!gmailUser || !gmailAppPassword || !fromEmail) {
      options.logger?.info(
        {
          provider,
          gmailUserConfigured: Boolean(gmailUser),
          gmailAppPasswordConfigured: Boolean(gmailAppPassword),
          fromConfigured: Boolean(fromEmail),
        },
        "Daily reminder mailer is not configured"
      );
      return null;
    }

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: gmailUser,
        pass: gmailAppPassword,
      },
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
      async sendProfileUpdatedNotification(message) {
        const markup = buildProfileUpdatedMarkup(message.recipientName);

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

  const fromEmail = options.fromEmail ?? configuredFromEmail;

  if (!host || !fromEmail || !Number.isFinite(port)) {
    options.logger?.info(
      { provider, hostConfigured: Boolean(host), fromConfigured: Boolean(fromEmail) },
      "Daily reminder mailer is not configured"
    );
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
    async sendProfileUpdatedNotification(message) {
      const markup = buildProfileUpdatedMarkup(message.recipientName);

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