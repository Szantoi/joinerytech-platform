import { readFileSync } from 'fs';
import * as path from 'path';
import { spawnSync } from 'child_process';
import { describe, expect, it } from 'vitest';

const serviceRoot = path.resolve(__dirname, '../../..');
const bridgePath = path.join(serviceRoot, 'bin', 'stdio-bridge.js');

describe('MCP stdio bridge credential boundary', () => {
  it('fails closed when MCP_AUTH_TOKEN is absent', () => {
    const env = { ...process.env };
    delete env.MCP_AUTH_TOKEN;

    const result = spawnSync(process.execPath, [bridgePath], {
      env,
      input: '',
      encoding: 'utf-8',
      timeout: 5_000,
    });

    expect(result.status).toBe(78);
    expect(result.stdout).toBe('');
    expect(result.stderr).toContain('MCP_AUTH_TOKEN is required');
  });

  it('starts without embedding a fallback credential when the environment is configured', () => {
    const result = spawnSync(process.execPath, [bridgePath], {
      env: { ...process.env, MCP_AUTH_TOKEN: 'bridge-test-value' },
      input: '',
      encoding: 'utf-8',
      timeout: 5_000,
    });
    const source = readFileSync(bridgePath, 'utf-8');

    expect(result.status).toBe(0);
    expect(result.stderr).toBe('');
    expect(source).not.toMatch(/MCP_AUTH_TOKEN\s*\|\|/);
  });
});
