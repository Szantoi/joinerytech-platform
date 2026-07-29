import type { Express } from 'express';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

describe.sequential('MCP mailbox HTTP authorization', () => {
  let app: Express;
  const previousEnvironment = {
    NODE_ENV: process.env.NODE_ENV,
    MCP_AUTH_TOKEN: process.env.MCP_AUTH_TOKEN,
    MCP_TOKEN_BACKEND: process.env.MCP_TOKEN_BACKEND,
    MCP_TOKEN_CONDUCTOR: process.env.MCP_TOKEN_CONDUCTOR,
    TELEGRAM_DB_PATH: process.env.TELEGRAM_DB_PATH,
  };

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    delete process.env.MCP_AUTH_TOKEN;
    process.env.MCP_TOKEN_BACKEND = 'backend-http-test-value';
    process.env.MCP_TOKEN_CONDUCTOR = 'conductor-http-test-value';
    process.env.TELEGRAM_DB_PATH = ':memory:';
    vi.resetModules();

    const { createApp } = await import('../../bootstrap/app');
    app = createApp({ enableStaticFiles: false });
  }, 30_000);

  afterAll(() => {
    restoreEnvironment('NODE_ENV', previousEnvironment.NODE_ENV);
    restoreEnvironment('MCP_AUTH_TOKEN', previousEnvironment.MCP_AUTH_TOKEN);
    restoreEnvironment('MCP_TOKEN_BACKEND', previousEnvironment.MCP_TOKEN_BACKEND);
    restoreEnvironment('MCP_TOKEN_CONDUCTOR', previousEnvironment.MCP_TOKEN_CONDUCTOR);
    restoreEnvironment('TELEGRAM_DB_PATH', previousEnvironment.TELEGRAM_DB_PATH);
  });

  it('denies a terminal reading another mailbox', async () => {
    const response = await request(app)
      .get('/api/mailbox/frontend/inbox')
      .set('Authorization', 'Bearer backend-http-test-value');

    expect(response.status).toBe(403);
    expect(response.body.error).toContain('own mailbox');
  });

  it('allows own-mailbox and conductor read golden paths', async () => {
    const own = await request(app)
      .get('/api/mailbox/backend/inbox')
      .set('Authorization', 'Bearer backend-http-test-value');
    const authorized = await request(app)
      .get('/api/mailbox/frontend/inbox')
      .set('Authorization', 'Bearer conductor-http-test-value');

    expect(own.status).toBe(200);
    expect(authorized.status).toBe(200);
  });

  it('requires authentication for the read-only tasks status compatibility route', async () => {
    const anonymous = await request(app).get('/api/tasks/status');
    const authenticated = await request(app)
      .get('/api/tasks/status')
      .set('Authorization', 'Bearer backend-http-test-value');

    expect(anonymous.status).toBe(401);
    expect(authenticated.status).toBe(200);
  });
});

function restoreEnvironment(name: string, value: string | undefined): void {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}
