import { describe, expect, it, vi } from "vitest";
import {
  isReminderDueForUser,
  sendDueDailyStatsReminders,
  type ReminderClaim,
  type ReminderRepository,
  type ReminderUser,
} from "../src/services/reminder.service.ts";
import type { ReminderMailer } from "../src/services/reminder-mailer.ts";

function createRepository(overrides: Partial<ReminderRepository> = {}, users: ReminderUser[] = []): ReminderRepository {
  return {
    listEnabledUsers: vi.fn(async () => users),
    hasAnyLogForDate: vi.fn(async () => false),
    claimDailyReminder: vi.fn(async () => ({ id: "claim-1" } satisfies ReminderClaim)),
    markReminderSent: vi.fn(async () => undefined),
    releaseReminderClaim: vi.fn(async () => undefined),
    ...overrides,
  };
}

function createMailer(): ReminderMailer {
  return {
    sendDailyStatsReminder: vi.fn(async () => undefined),
  };
}

describe("isReminderDueForUser", () => {
  it("calculates local date and due status from the user timezone", () => {
    const result = isReminderDueForUser(new Date("2026-05-01T02:30:00.000Z"), "America/New_York", 22);

    expect(result.isDue).toBe(true);
    expect(result.localDate).toBe("2026-04-30");
    expect(result.localHour).toBe(22);
  });
});

describe("sendDueDailyStatsReminders", () => {
  it("sends a reminder when the user has no logs for the local date after 22:00", async () => {
    const users: ReminderUser[] = [
      {
        id: "user-1",
        name: "Sharipov",
        notificationEmail: "notify@example.com",
        reminderEnabled: true,
        timezone: "Europe/Moscow",
      },
    ];
    const repository = createRepository({}, users);
    const mailer = createMailer();

    const summary = await sendDueDailyStatsReminders({
      repository,
      mailer,
      now: new Date("2026-05-01T19:30:00.000Z"),
      reminderHour: 22,
      defaultTimeZone: "UTC",
    });

    expect(summary.sent).toBe(1);
    expect(summary.skippedAlreadyLoggedToday).toBe(0);
    expect(repository.hasAnyLogForDate).toHaveBeenCalledWith("user-1", "2026-05-01");
    expect(repository.markReminderSent).toHaveBeenCalledWith("claim-1", new Date("2026-05-01T19:30:00.000Z"));
    expect(mailer.sendDailyStatsReminder).toHaveBeenCalledWith({
      to: "notify@example.com",
      recipientName: "Sharipov",
      localDate: "2026-05-01",
    });
  });

  it("does not send anything when there is already at least one log for today", async () => {
    const users: ReminderUser[] = [
      {
        id: "user-2",
        name: "Sharipov",
        notificationEmail: "notify@example.com",
        reminderEnabled: true,
        timezone: "Europe/Moscow",
      },
    ];
    const repository = createRepository(
      {
        hasAnyLogForDate: vi.fn(async () => true),
      },
      users
    );
    const mailer = createMailer();

    const summary = await sendDueDailyStatsReminders({
      repository,
      mailer,
      now: new Date("2026-05-01T19:30:00.000Z"),
      reminderHour: 22,
      defaultTimeZone: "UTC",
    });

    expect(summary.sent).toBe(0);
    expect(summary.skippedAlreadyLoggedToday).toBe(1);
    expect(repository.claimDailyReminder).not.toHaveBeenCalled();
    expect(mailer.sendDailyStatsReminder).not.toHaveBeenCalled();
  });

  it("releases the claim when sending fails so the next run can retry", async () => {
    const users: ReminderUser[] = [
      {
        id: "user-3",
        name: "Sharipov",
        notificationEmail: "notify@example.com",
        reminderEnabled: true,
        timezone: "Europe/Moscow",
      },
    ];
    const repository = createRepository({}, users);
    const mailer: ReminderMailer = {
      sendDailyStatsReminder: vi.fn(async () => {
        throw new Error("smtp failed");
      }),
    };

    const summary = await sendDueDailyStatsReminders({
      repository,
      mailer,
      now: new Date("2026-05-01T19:30:00.000Z"),
      reminderHour: 22,
      defaultTimeZone: "UTC",
    });

    expect(summary.sent).toBe(0);
    expect(summary.failed).toBe(1);
    expect(repository.releaseReminderClaim).toHaveBeenCalledWith("claim-1");
    expect(repository.markReminderSent).not.toHaveBeenCalled();
  });
});