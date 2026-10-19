import { Router, type Request, type Response, type NextFunction } from 'express';
import eventsRouter from './events.routes.js';
import authRouter from './auth.routes.js';

const router = Router();

// Authentication (challenge/verify)
router.use('/auth', authRouter);

// SSE event stream
router.use('/events', eventsRouter);

// Catch-all for unmatched v1 routes
router.use((_req: Request, res: Response, _next: NextFunction) => {
  res.status(404).json({ error: 'Not Found', message: 'No route matched' });
});

export default router;
