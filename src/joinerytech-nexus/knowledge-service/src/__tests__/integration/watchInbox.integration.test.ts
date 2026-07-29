/**
 * Integration Test: watchInbox.ts MCP API Fix (MSG-BACKEND-193)
 *
 * Tests that inbox watcher uses MCP API instead of tmux send-keys
 * to prevent "bash: command not found" errors.
 *
 * Test Coverage:
 * 1. nudgeSession() uses /api/session/inject
 * 2. autoStartSession() uses /api/session/start
 * 3. No tmux send-keys in watchInbox flow
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { runWatchInbox } from '../../pipeline/watchInbox';
import * as fs from 'fs/promises';
import * as path from 'path';

// Mock fetch globally
global.fetch = vi.fn();

// Mock common.ts functions
vi.mock('../../pipeline/common', () => ({
  SESSIONS: {
    'spaceos-backend': 'backend',
    'spaceos-frontend': 'frontend',
  },
  hasSession: vi.fn(),
  getState: vi.fn(),
  setState: vi.fn(),
  getInboxModel: vi.fn(),
  getInboxPath: vi.fn(() => '/tmp/test-inbox'),
  log: vi.fn(),
  telegram: vi.fn(),
  isPrioritySession: vi.fn(() => false),
}));

describe('watchInbox MCP API Integration (MSG-BACKEND-193)', () => {
  const mockInboxPath = '/tmp/test-inbox';
  const mockUnreadFile = path.join(mockInboxPath, '2026-07-08_001_test-task.md');
  const previousWatchInboxToken = process.env.MCP_TOKEN_WATCHINBOX;
  const previousMasterToken = process.env.MCP_AUTH_TOKEN;

  beforeEach(async () => {
    vi.clearAllMocks();
    process.env.MCP_TOKEN_WATCHINBOX = 'watch-inbox-test-token';
    delete process.env.MCP_AUTH_TOKEN;
    // Create mock inbox with UNREAD message
    await fs.mkdir(mockInboxPath, { recursive: true });
    await fs.writeFile(
      mockUnreadFile,
      `---
id: MSG-BACKEND-001
from: root
to: backend
type: task
priority: medium
status: UNREAD
created: 2026-07-08
---

# Test Task

Test inbox message.
`,
      'utf-8'
    );
    const oldUnreadAt = new Date(Date.now() - 10 * 60 * 1000);
    await fs.utimes(mockUnreadFile, oldUnreadAt, oldUnreadAt);
  });

  afterEach(async () => {
    // Cleanup
    await fs.rm(mockInboxPath, { recursive: true, force: true });
    if (previousWatchInboxToken === undefined) delete process.env.MCP_TOKEN_WATCHINBOX;
    else process.env.MCP_TOKEN_WATCHINBOX = previousWatchInboxToken;
    if (previousMasterToken === undefined) delete process.env.MCP_AUTH_TOKEN;
    else process.env.MCP_AUTH_TOKEN = previousMasterToken;
  });

  it('nudgeSession uses /api/session/inject (NOT tmux send-keys)', async () => {
    const { hasSession, getState } = await import('../../pipeline/common');

    // Mock session running
    (hasSession as any).mockResolvedValue(true);
    (getState as any).mockResolvedValue('0'); // No previous nudge

    // Mock successful MCP API response
    (global.fetch as any).mockResolvedValue({
      ok: true,
      text: async () => 'success',
    });

    const result = await runWatchInbox();

    // Verify fetch was called with MCP API endpoint
    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:3456/api/session/inject',
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer watch-inbox-test-token',
        },
        body: expect.stringContaining('"terminal"'),
      })
    );

    // Verify body contains expected fields
    const callArgs = (global.fetch as any).mock.calls[0];
    const body = JSON.parse(callArgs[1].body);
    expect(body).toHaveProperty('terminal');
    expect(body).toHaveProperty('prompt');
    expect(body).toHaveProperty('fromTerminal', 'watchInbox');
    expect(body.prompt).toMatch(/\[INBOX\]/);
  });

  it('autoStartSession uses /api/session/start (NOT tmux send-keys)', async () => {
    const { hasSession, getState, getInboxModel } = await import('../../pipeline/common');

    // Mock session NOT running
    (hasSession as any).mockResolvedValue(false);
    (getState as any).mockResolvedValue('0'); // No previous start
    (getInboxModel as any).mockResolvedValue('sonnet');

    // Mock successful MCP API response
    (global.fetch as any).mockResolvedValue({
      ok: true,
      text: async () => 'success',
    });

    const result = await runWatchInbox();

    // Verify fetch was called with MCP API endpoint
    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:3456/api/session/start',
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer watch-inbox-test-token',
        },
        body: expect.stringContaining('"terminal"'),
      })
    );

    // Verify body contains expected fields
    const callArgs = (global.fetch as any).mock.calls[0];
    const body = JSON.parse(callArgs[1].body);
    expect(body).toHaveProperty('terminal');
    expect(body).toHaveProperty('model', 'sonnet');
    expect(body).toHaveProperty('prompt');
    expect(body).toHaveProperty('fromTerminal', 'watchInbox');
  });

  it('handles MCP API error gracefully', async () => {
    const { hasSession, getState } = await import('../../pipeline/common');

    (hasSession as any).mockResolvedValue(true);
    (getState as any).mockResolvedValue('0');

    // Mock MCP API failure
    (global.fetch as any).mockResolvedValue({
      ok: false,
      text: async () => 'Unauthorized',
    });

    const result = await runWatchInbox();

    // Should not throw, should log error
    expect(result).toBeDefined();
  });

  it('REGRESSION TEST: does NOT use tmux send-keys', async () => {
    const { hasSession, getState } = await import('../../pipeline/common');

    (hasSession as any).mockResolvedValue(true);
    (getState as any).mockResolvedValue('0');

    (global.fetch as any).mockResolvedValue({
      ok: true,
      text: async () => 'success',
    });

    await runWatchInbox();

    // Verify fetch call does NOT contain bash commands
    const callArgs = (global.fetch as any).mock.calls[0];
    const body = JSON.parse(callArgs[1].body);

    // These patterns would indicate tmux send-keys usage (SHOULD NOT EXIST)
    expect(body.prompt).not.toMatch(/send-keys/);
    expect(body.prompt).not.toMatch(/tmux/);
    expect(body.prompt).not.toMatch(/claude --model/); // This was sent to bash before
  });
});
