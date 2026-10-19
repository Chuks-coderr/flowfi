import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { createSseTicket, subscribe } from '../../controllers/sse.controller.js';

const router = Router();

/**
 * @openapi
 * /v1/events/subscribe-ticket:
 *   post:
 *     tags: [Events]
 *     summary: Issue a short-lived SSE subscription ticket
 *     description: >-
 *       Authenticates the caller via Bearer JWT, verifies stream/user ownership,
 *       and returns a signed ticket valid for 60 seconds. Pass the ticket as the
 *       `?ticket=` query parameter when opening the SSE stream.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               streams:
 *                 type: array
 *                 items:
 *                   type: string
 *                   pattern: '^\d+$'
 *                 maxItems: 500
 *                 description: >-
 *                   Numeric on-chain stream IDs to subscribe to.
 *                   Omit or pass an empty array to subscribe to all streams
 *                   owned by the authenticated wallet.
 *               users:
 *                 type: array
 *                 items:
 *                   type: string
 *                 maxItems: 500
 *                 description: >-
 *                   Stellar public keys whose user-scoped channel to subscribe
 *                   to.  Only keys that are a sender or recipient of a stream
 *                   owned by the caller are accepted.
 *               all:
 *                 type: boolean
 *                 default: false
 *                 description: When true, subscribe to all owned streams.
 *     responses:
 *       200:
 *         description: Short-lived SSE subscription ticket
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required: [ticket]
 *               properties:
 *                 ticket:
 *                   type: string
 *                   description: Signed JWT ticket (valid 60 s). Pass as ?ticket= on the SSE endpoint.
 *       400:
 *         description: Invalid subscription parameters
 *       401:
 *         description: Missing or invalid Bearer token
 */
router.post('/subscribe-ticket', requireAuth, createSseTicket);

/**
 * @openapi
 * /v1/events/subscribe:
 *   get:
 *     tags: [Events]
 *     summary: Open an SSE event stream
 *     description: >-
 *       Opens a persistent Server-Sent Events connection. The caller must supply
 *       a valid short-lived ticket obtained from `POST /v1/events/subscribe-ticket`.
 *
 *       **Reconnection and replay**: the browser automatically sends a
 *       `Last-Event-ID` header on reconnect. The server replays any events from
 *       its in-process ring buffer (up to `SSE_REPLAY_WINDOW_SIZE`, default 200,
 *       within the last `SSE_REPLAY_MAX_AGE_MS`, default 60 s) that the client
 *       missed. Events emitted while the client was disconnected for longer than
 *       the replay window must be fetched from `GET /v1/events` instead.
 *
 *       **Authorization revalidation**: the server periodically checks that the
 *       connection's credentials are still valid.  Connections older than the
 *       JWT max-age (1 hour by default) receive an `event: reconnect` message
 *       and are closed so the client re-authenticates.
 *     parameters:
 *       - in: query
 *         name: ticket
 *         required: true
 *         schema:
 *           type: string
 *         description: Signed ticket from POST /v1/events/subscribe-ticket.
 *     responses:
 *       200:
 *         description: >-
 *           SSE stream (Content-Type: text/event-stream). The first event is
 *           always `data: {"type":"connected","clientId":"..."}`. Subsequent
 *           events carry `id:`, `event:`, and `data:` fields.
 *         content:
 *           text/event-stream:
 *             schema:
 *               type: string
 *       401:
 *         description: Missing, invalid, or expired SSE ticket
 *       429:
 *         description: Too many SSE connections from this IP or user
 *       503:
 *         description: Server is shutting down or SSE capacity reached
 */
router.get('/subscribe', subscribe);

export default router;
