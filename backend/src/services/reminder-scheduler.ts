import type { FastifyInstance } from "fastify";
import { createReminderMailer } from "./reminder-mailer.js";
import { createDbReminderRepository, sendDueDailyStatsReminders } from "./reminder.service.js";

function isSchedulerEnabled() {
  return process.env.REMINDER_SCHEDULER_ENABLED !== "false";
}

function getSchedulerIntervalMs() {
  const parsed = Number(process.env.REMINDER_CHECK_INTERVAL_MS ?? 60_000);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 60_000;
}

function getReminderHour() {
  const parsed = Number(process.env.REMINDER_TARGET_HOUR ?? 22);
  return Number.isInteger(parsed) && parsed >= 0 && parsed <= 23 ? parsed : 22;
}

function getClaimTimeoutMs() {
  const parsed = Number(process.env.REMINDER_CLAIM_TIMEOUT_MS ?? 30 * 60 * 1000);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 30 * 60 * 1000;
}

export function registerReminderScheduler(fastify: FastifyInstance) {
  const logger = fastify.log.child({ scheduler: "daily-stats-reminders" });
  let timer: NodeJS.Timeout | null = null;
  let running = false;

  const runReminders = async () => {
    if (running) {
      return;
    }

    const mailer = createReminderMailer({ logger });
    if (!mailer) {
      return;
    }

    running = true;

    try {
      await sendDueDailyStatsReminders({
        repository: createDbReminderRepository(),
        mailer,
        reminderHour: getReminderHour(),
        defaultTimeZone: process.env.REMINDER_DEFAULT_TIMEZONE ?? "UTC",
        claimTimeoutMs: getClaimTimeoutMs(),
        logger,
      });
    } finally {
      running = false;
    }
  };

  fastify.addHook("onReady", async () => {
    if (!isSchedulerEnabled()) {
      logger.info({}, "Daily stats reminder scheduler is disabled by configuration");
      return;
    }

    await runReminders();

    timer = setInterval(() => {
      void runReminders();
    }, getSchedulerIntervalMs());

    timer.unref?.();
    logger.info({ intervalMs: getSchedulerIntervalMs(), reminderHour: getReminderHour() }, "Daily stats reminder scheduler started");
  });

  fastify.addHook("onClose", async () => {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  });
}