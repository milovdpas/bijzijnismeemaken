/**
 * Liveness probe for the container healthcheck and the nginx upstream.
 *
 * Deliberately trivial: it answers "this Node process is serving requests",
 * nothing more. The API has its own health check that asks the database; the
 * web container has no state of its own worth probing.
 */
export const dynamic = 'force-dynamic';

export function GET() {
    return new Response('ok', {
        status: 200,
        headers: { 'Content-Type': 'text/plain', 'Cache-Control': 'no-store' },
    });
}
