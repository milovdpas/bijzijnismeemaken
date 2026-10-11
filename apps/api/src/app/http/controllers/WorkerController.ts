import { ERROR_CODES } from '@bzim/types';
import type { WorkerJobResponse } from '@bzim/types';

import type { Handler } from '../interfaces/IHttp';
import { CalendarSyncService } from '../../domain/services/CalendarSyncService';
import { CleanupService } from '../../domain/services/CleanupService';
import { ReminderService } from '../../domain/services/ReminderService';
import { sendError, sendSuccess } from '../utils/ApiResponses';

/**
 * Cron jobs, driven from outside the process.
 *
 * The scheduler calls one of these endpoints and nothing else does. The
 * controller only orchestrates: it refuses overlap, times the run, and hands the
 * work to the service that owns it. The logic itself lives in those services so
 * that a job and the feature it belongs to are tested together.
 */
export default class WorkerController {
    /**
     * Static, so it is one flag per process rather than one per controller
     * instance. Routes construct their controller once today, but that is a
     * detail of the wiring and not something this should depend on.
     */
    private static cleanupRunning = false;
    private static calendarSyncRunning = false;
    private static remindersRunning = false;

    /**
     * Nightly cleanup.
     *
     * Overlap is refused rather than queued: a nightly job that outlasts its
     * day is a problem to see in the scheduler's log, not one to hide by running
     * twice. Answering 409 keeps that visible.
     *
     * The sweep itself is `CleanupService.run()`; synced calendar events join
     * it in M2.
     */
    cleanup: Handler = async (_req, res) => {
        if (WorkerController.cleanupRunning) {
            sendError(res, ERROR_CODES.WORKER_BUSY, 'cleanup is still running.', 409);
            return;
        }

        // hrtime is the monotonic clock: a wall-clock difference can go
        // negative when NTP adjusts the time mid-run.
        const startedAt = process.hrtime.bigint();
        WorkerController.cleanupRunning = true;
        try {
            const stats = await CleanupService.run();
            sendSuccess<WorkerJobResponse>(res, {
                job: 'cleanup',
                durationMs: Number((process.hrtime.bigint() - startedAt) / 1_000_000n),
                stats,
            });
        } finally {
            // In a `finally` because a throw here would leave the flag set
            // forever, and the symptom is a job that silently stops after one
            // bad night rather than one bad run.
            WorkerController.cleanupRunning = false;
        }
    };

    /** The evening reminder for tomorrow's planned moments (task 41). Same overlap rule. */
    occurrenceReminders: Handler = async (_req, res) => {
        if (WorkerController.remindersRunning) {
            sendError(res, ERROR_CODES.WORKER_BUSY, 'occurrence-reminders is still running.', 409);
            return;
        }
        const startedAt = process.hrtime.bigint();
        WorkerController.remindersRunning = true;
        try {
            const stats = await ReminderService.run();
            sendSuccess<WorkerJobResponse>(res, {
                job: 'occurrence-reminders',
                durationMs: Number((process.hrtime.bigint() - startedAt) / 1_000_000n),
                stats,
            });
        } finally {
            WorkerController.remindersRunning = false;
        }
    };

    /** Nightly calendar sync (docs/02 §2.7): every connection, every enabled calendar. Same overlap rule as cleanup. */
    calendarSync: Handler = async (_req, res) => {
        if (WorkerController.calendarSyncRunning) {
            sendError(res, ERROR_CODES.WORKER_BUSY, 'calendar-sync is still running.', 409);
            return;
        }
        const startedAt = process.hrtime.bigint();
        WorkerController.calendarSyncRunning = true;
        try {
            const stats = await CalendarSyncService.syncAll();
            sendSuccess<WorkerJobResponse>(res, {
                job: 'calendar-sync',
                durationMs: Number((process.hrtime.bigint() - startedAt) / 1_000_000n),
                stats,
            });
        } finally {
            WorkerController.calendarSyncRunning = false;
        }
    };
}
