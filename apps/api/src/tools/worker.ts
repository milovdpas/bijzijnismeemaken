import { API_ENDPOINTS } from '@bzim/types';
import type { WorkerJobResponse } from '@bzim/types';

import { env } from '../config/app';

/**
 * Runs one cron job against the API running in this same container.
 *
 * The scheduler runs this on a schedule (`docker-compose.prod.yml` declares each
 * job as an Ofelia label, so the schedule deploys with the code). It exists as a
 * tiny client rather than as the job itself for one reason: the job needs the
 * database pool the running process already holds. A fresh process each night
 * would reconnect to an external MySQL across the internet first.
 *
 * It is also the local way to force a job: `npm run worker -w @bzim/api -- cleanup`.
 *
 * The token comes from the environment, never from the command line. An
 * argument would put the secret in the compose labels and in `docker inspect`;
 * the container already has it, so there is no reason to pass it around.
 */
const JOBS: Record<string, string> = {
    'calendar-sync': API_ENDPOINTS.WORKER.CALENDAR_SYNC,
    cleanup: API_ENDPOINTS.WORKER.CLEANUP,
    'occurrence-reminders': API_ENDPOINTS.WORKER.OCCURRENCE_REMINDERS,
};

async function main(): Promise<void> {
    const job = process.argv[2] ?? '';
    const path = JOBS[job];
    if (path === undefined) {
        console.error(`Unknown job "${job}". Use one of: ${Object.keys(JOBS).join(', ')}.`);
        process.exitCode = 1;
        return;
    }

    if (env.workerToken === '') {
        console.error('WORKER_TOKEN is not set, so the job cannot authenticate.');
        process.exitCode = 1;
        return;
    }

    // 127.0.0.1 rather than localhost: Node binds IPv4 only, and a resolver that
    // tries ::1 first gets a refused connection from a perfectly healthy server.
    const url = `http://127.0.0.1:${String(env.port)}${path}`;

    const response = await fetch(url, {
        method: 'POST',
        headers: { 'X-Worker-Token': env.workerToken },
    });

    if (!response.ok) {
        // Non-zero, so the scheduler's log shows a failed job rather than a
        // successful one that happened to print an error.
        console.error(`${job} failed: ${String(response.status)} ${await response.text()}`);
        process.exitCode = 1;
        return;
    }

    const result = (await response.json()) as WorkerJobResponse;
    const stats = Object.entries(result.stats)
        .map(([key, value]) => `${key}=${String(value)}`)
        .join(' ');
    // One line, because a month of these is read as a column.
    console.log(
        `${result.job}: done in ${String(result.durationMs)}ms${stats ? ` (${stats})` : ''}.`,
    );
}

main().catch((error: unknown) => {
    /**
     * "fetch failed" on its own sends whoever reads it looking at the network.
     *
     * The overwhelmingly common cause is that nothing is listening: the API is
     * not running, or `tsx watch` is a second into restarting after a file
     * changed. Naming the address it tried turns a mystery into a glance at the
     * other terminal.
     */
    const refused =
        error instanceof Error &&
        (error.cause as NodeJS.ErrnoException | undefined)?.code === 'ECONNREFUSED';

    if (refused) {
        console.error(
            `Nothing is listening on 127.0.0.1:${String(env.port)}. Start the API with ` +
                '`npm run dev -w @bzim/api`, and note that it closes the port for a ' +
                'moment whenever tsx restarts it after a file change.',
        );
    } else {
        console.error(
            'Job could not reach the API:',
            error instanceof Error ? error.message : error,
        );
    }
    process.exit(1);
});
