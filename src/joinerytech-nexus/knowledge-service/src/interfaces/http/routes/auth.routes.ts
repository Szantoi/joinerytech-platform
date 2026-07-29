/**
 * Auth Routes
 * Simple token verification for React Dashboard
 */

import { Router, Request, Response } from 'express';

const router = Router();

// Simple auth token (no database, just static token from env)
const DASHBOARD_TOKEN = process.env.DASHBOARD_AUTH_TOKEN?.trim() || '';

// ─── Verify Auth Token ───────────────────────────────────────────────────────

const verifyAuthToken = (req: Request, res: Response) => {
  if (!DASHBOARD_TOKEN) {
    res.status(503).json({ valid: false, message: 'Dashboard authentication is not configured' });
    return;
  }

  const authHeader = req.headers.authorization;
  const token = authHeader?.replace('Bearer ', '');

  if (token && token === DASHBOARD_TOKEN) {
    res.json({ valid: true, message: 'Token is valid' });
  } else {
    res.status(401).json({ valid: false, message: 'Invalid token' });
  }
};

router.get('/verify', verifyAuthToken);
router.post('/verify', verifyAuthToken);

export default router;
