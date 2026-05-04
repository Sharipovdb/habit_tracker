import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { createTransport, sendMail } = vi.hoisted(() => ({
  createTransport: vi.fn(),
  sendMail: vi.fn(),
}));

vi.mock("nodemailer", () => ({
  default: {
    createTransport,
  },
}));

import { createReminderMailer } from "../src/services/reminder-mailer.ts";

const ORIGINAL_ENV = { ...process.env };

describe("createReminderMailer", () => {
  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
    createTransport.mockReset();
    sendMail.mockReset();
    sendMail.mockResolvedValue(undefined);
    createTransport.mockReturnValue({ sendMail });
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    vi.clearAllMocks();
  });

  it("creates a Gmail transporter when Gmail provider is configured", async () => {
    process.env.REMINDER_MAIL_PROVIDER = "gmail";
    process.env.REMINDER_GMAIL_USER = "habittracker.demo@gmail.com";
    process.env.REMINDER_GMAIL_APP_PASSWORD = "app-password";

    const mailer = createReminderMailer();

    expect(mailer).not.toBeNull();
    expect(createTransport).toHaveBeenCalledWith({
      service: "gmail",
      auth: {
        user: "habittracker.demo@gmail.com",
        pass: "app-password",
      },
    });

    await mailer?.sendDailyStatsReminder({
      to: "notify@example.com",
      recipientName: "Sharipov",
      localDate: "2026-05-04",
    });

    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        from: "habittracker.demo@gmail.com",
        to: "notify@example.com",
        subject: "Reminder: fill in today's habit stats",
      })
    );

    await mailer?.sendProfileUpdatedNotification({
      to: "notify@example.com",
      recipientName: "Sharipov",
    });

    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        from: "habittracker.demo@gmail.com",
        to: "notify@example.com",
        subject: "HabitTracker profile updated",
      })
    );
  });

  it("uses SMTP settings by default when no provider is specified", async () => {
    process.env.REMINDER_SMTP_HOST = "smtp.example.com";
    process.env.REMINDER_SMTP_PORT = "2525";
    process.env.REMINDER_SMTP_SECURE = "true";
    process.env.REMINDER_SMTP_USER = "smtp-user";
    process.env.REMINDER_SMTP_PASS = "smtp-pass";
    process.env.REMINDER_FROM_EMAIL = "reminders@example.com";

    const mailer = createReminderMailer();

    expect(mailer).not.toBeNull();
    expect(createTransport).toHaveBeenCalledWith({
      host: "smtp.example.com",
      port: 2525,
      secure: true,
      auth: {
        user: "smtp-user",
        pass: "smtp-pass",
      },
    });

    await mailer?.sendDailyStatsReminder({
      to: "notify@example.com",
      recipientName: null,
      localDate: "2026-05-04",
    });

    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        from: "reminders@example.com",
        to: "notify@example.com",
      })
    );
  });
});