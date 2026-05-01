import { and, eq, isNotNull, isNull, lt } from "drizzle-orm";
import { db } from "../db/index.js";
import { habits, habitLogs, reminderEvents, users } from "../db/schema.js";
import { getLocalDateString, getZonedDateTimeParts, normalizeTimeZone } from "../utils/date-time.js";
import type { DailyStatsReminderMessage, ReminderMailer } from "./reminder-mailer.js";

export const DAILY_STATS_REMINDER_TYPE = "daily-stats";

export interface ReminderUser {
  id: string;
  name: string | null;
  notificationEmail: string | null;
  reminderEnabled: boolean;
  timezone: string;
}

export interface ReminderClaim {
  id: string;
}

export interface ReminderRepository {
  listEnabledUsers(): Promise<ReminderUser[]>;
  hasAnyLogForDate(userId: string, localDate: string): Promise<boolean>;
  claimDailyReminder(input: { userId: string; localDate: string; sentTo: string; now: Date; claimTimeoutMs: number }): Promise<ReminderClaim | null>;
  markReminderSent(claimId: string, sentAt: Date): Promise<void>;
  releaseReminderClaim(claimId: string): Promise<void>;
}

export interface ReminderLogger {
  info: (details: unknown, message?: string) => void;
  warn: (details: unknown, message?: string) => void;
  error: (details: unknown, message?: string) => void;
}

export interface DailyReminderRunSummary {
  processedUsers: number;
  sent: number;
  skippedNoEmail: number;
  skippedNotDueYet: number;
  skippedAlreadyLoggedToday: number;
  skippedAlreadyClaimed: number;
  failed: number;
}

type SendDueDailyReminderOptions = {
  repository: ReminderRepository;
  mailer: ReminderMailer;
  now?: Date;
  reminderHour?: number;
  defaultTimeZone?: string;
  claimTimeoutMs?: number;
  logger?: ReminderLogger;
};

export function isReminderDueForUser(now: Date, timeZone: string, reminderHour: number) {
  const parts = getZonedDateTimeParts(now, timeZone);

  return {
    isDue: parts.hour >= reminderHour,
    localDate: `${parts.year}-${parts.month}-${parts.day}`,
    localHour: parts.hour,
    timeZone: parts.timeZone,
  };
}

export function createDbReminderRepository(): ReminderRepository {
  return {
    async listEnabledUsers() {
      return db
        .select({
          id: users.id,
          name: users.name,
          notificationEmail: users.notificationEmail,
          reminderEnabled: users.reminderEnabled,
          timezone: users.timezone,
        })
        .from(users)
        .where(and(eq(users.reminderEnabled, true), isNotNull(users.notificationEmail)));
    },

    async hasAnyLogForDate(userId, localDate) {
      const matchingLogs = await db
        .select({ id: habitLogs.id })
        .from(habitLogs)
        .innerJoin(habits, eq(habitLogs.habitId, habits.id))
        .where(and(eq(habits.userId, userId), eq(habitLogs.date, localDate)))
        .limit(1);

      return matchingLogs.length > 0;
    },

    async claimDailyReminder({ userId, localDate, sentTo, now, claimTimeoutMs }) {
      const staleBefore = new Date(now.getTime() - claimTimeoutMs);

      await db
        .delete(reminderEvents)
        .where(
          and(
            eq(reminderEvents.userId, userId),
            eq(reminderEvents.localDate, localDate),
            eq(reminderEvents.type, DAILY_STATS_REMINDER_TYPE),
            isNull(reminderEvents.sentAt),
            lt(reminderEvents.createdAt, staleBefore)
          )
        );

      const [claim] = await db
        .insert(reminderEvents)
        .values({
          userId,
          localDate,
          type: DAILY_STATS_REMINDER_TYPE,
          sentTo,
          createdAt: now,
        })
        .onConflictDoNothing({
          target: [reminderEvents.userId, reminderEvents.localDate, reminderEvents.type],
        })
        .returning({ id: reminderEvents.id });

      return claim ?? null;
    },

    async markReminderSent(claimId, sentAt) {
      await db
        .update(reminderEvents)
        .set({ sentAt })
        .where(eq(reminderEvents.id, claimId));
    },

    async releaseReminderClaim(claimId) {
      await db
        .delete(reminderEvents)
        .where(eq(reminderEvents.id, claimId));
    },
  };
}

function emptySummary(): DailyReminderRunSummary {
  return {
    processedUsers: 0,
    sent: 0,
    skippedNoEmail: 0,
    skippedNotDueYet: 0,
    skippedAlreadyLoggedToday: 0,
    skippedAlreadyClaimed: 0,
    failed: 0,
  };
}

export async function sendDueDailyStatsReminders(options: SendDueDailyReminderOptions): Promise<DailyReminderRunSummary> {
  const now = options.now ?? new Date();
  const reminderHour = options.reminderHour ?? 22;
  const defaultTimeZone = options.defaultTimeZone ?? "UTC";
  const claimTimeoutMs = options.claimTimeoutMs ?? 30 * 60 * 1000;
  const logger = options.logger;
  const summary = emptySummary();
  const usersToProcess = await options.repository.listEnabledUsers();

  for (const user of usersToProcess) {
    summary.processedUsers += 1;

    if (!user.notificationEmail) {
      summary.skippedNoEmail += 1;
      continue;
    }

    const timeZone = normalizeTimeZone(user.timezone, defaultTimeZone);
    const reminderState = isReminderDueForUser(now, timeZone, reminderHour);
    if (!reminderState.isDue) {
      summary.skippedNotDueYet += 1;
      continue;
    }

    const hasAnyLogToday = await options.repository.hasAnyLogForDate(user.id, reminderState.localDate);
    if (hasAnyLogToday) {
      summary.skippedAlreadyLoggedToday += 1;
      continue;
    }

    const claim = await options.repository.claimDailyReminder({
      userId: user.id,
      localDate: reminderState.localDate,
      sentTo: user.notificationEmail,
      now,
      claimTimeoutMs,
    });

    if (!claim) {
      summary.skippedAlreadyClaimed += 1;
      continue;
    }

    try {
      const message: DailyStatsReminderMessage = {
        to: user.notificationEmail,
        recipientName: user.name,
        localDate: reminderState.localDate,
      };

      await options.mailer.sendDailyStatsReminder(message);
      await options.repository.markReminderSent(claim.id, now);
      summary.sent += 1;
    } catch (error) {
      summary.failed += 1;
      await options.repository.releaseReminderClaim(claim.id);
      logger?.error({ error, userId: user.id }, "Failed to send daily stats reminder");
    }
  }

  logger?.info(summary, "Daily stats reminder run finished");
  return summary;
}

export function getDefaultLocalDate(date: Date, timeZone: string) {
  return getLocalDateString(date, timeZone);
}