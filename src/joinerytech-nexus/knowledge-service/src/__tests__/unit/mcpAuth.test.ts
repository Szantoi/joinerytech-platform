import { readFileSync } from 'fs';
import * as path from 'path';
import { describe, expect, it } from 'vitest';
import {
  allowsInsecureDevelopmentRoot,
  authenticateBearer,
  authorizeMailboxRoute,
  buildAuthSnapshot,
  canUseToolWithPolicy,
  constantTimeTokenEquals,
  getToolPermissionCoverage,
  loadToolPermissionsFile,
  parseToolPermissions,
  resolveAuthenticatedIdentity,
  resolveFailedPermissionLoad,
  type ToolPermissionsSnapshot,
} from '../../mcpSecurity';

const DENY_BY_DEFAULT: ToolPermissionsSnapshot = {
  defaultPermission: 'none',
  permissions: {
    search_knowledge: 'all',
    create_task: ['root', 'conductor'],
    retired_tool: 'none',
  },
};

describe('MCP credential loading', () => {
  it('fails startup when production has no credential source', () => {
    expect(() => buildAuthSnapshot({ NODE_ENV: 'production' })).toThrow(
      'MCP authentication credentials are required in production',
    );
  });

  it('does not enable the insecure root fallback without both explicit flags', () => {
    expect(allowsInsecureDevelopmentRoot({})).toBe(false);
    expect(allowsInsecureDevelopmentRoot({ NODE_ENV: 'development' })).toBe(false);
    expect(allowsInsecureDevelopmentRoot({ MCP_ALLOW_INSECURE_DEV_AUTH: 'true' })).toBe(false);
    expect(allowsInsecureDevelopmentRoot({
      NODE_ENV: 'production',
      MCP_ALLOW_INSECURE_DEV_AUTH: 'true',
    })).toBe(false);
    expect(allowsInsecureDevelopmentRoot({
      NODE_ENV: 'development',
      MCP_ALLOW_INSECURE_DEV_AUTH: 'true',
    })).toBe(true);
  });

  it('authenticates environment-backed master and agent credentials', () => {
    const snapshot = buildAuthSnapshot({
      NODE_ENV: 'production',
      MCP_AUTH_TOKEN: 'master-test-value',
      MCP_TOKEN_BACKEND: 'backend-test-value',
    });

    expect(authenticateBearer(snapshot, 'Bearer master-test-value')).toMatchObject({
      authenticated: true,
      terminal: 'root',
    });
    expect(authenticateBearer(snapshot, 'Bearer backend-test-value')).toMatchObject({
      authenticated: true,
      terminal: 'backend',
    });
  });

  it('returns credential-free 401/403 failures', () => {
    const snapshot = buildAuthSnapshot({ MCP_TOKEN_BACKEND: 'backend-test-value' });

    expect(authenticateBearer(snapshot, undefined)).toEqual({
      authenticated: false,
      status: 401,
      message: 'Unauthorized: Bearer token required',
    });
    const invalid = authenticateBearer(snapshot, 'Bearer must-not-be-reflected');
    expect(invalid).toEqual({
      authenticated: false,
      status: 403,
      message: 'Forbidden: Invalid token',
    });
    expect(JSON.stringify(invalid)).not.toContain('must-not-be-reflected');
  });

  it('does not treat Object prototype property names as configured tokens', () => {
    const emptySnapshot = buildAuthSnapshot({});

    for (const token of ['toString', 'constructor', '__proto__']) {
      expect(authenticateBearer(emptySnapshot, `Bearer ${token}`)).toMatchObject({
        authenticated: false,
        status: 403,
      });
    }
  });

  it('can safely map prototype-shaped values when explicitly configured', () => {
    for (const token of ['toString', 'constructor', '__proto__']) {
      const snapshot = buildAuthSnapshot({ MCP_TOKEN_BACKEND: token });
      expect(authenticateBearer(snapshot, `Bearer ${token}`)).toMatchObject({
        authenticated: true,
        terminal: 'backend',
      });
    }
  });

  it('uses insecure root only for the explicit local development escape hatch', () => {
    const snapshot = buildAuthSnapshot({
      NODE_ENV: 'development',
      MCP_ALLOW_INSECURE_DEV_AUTH: 'true',
    });

    expect(authenticateBearer(snapshot, undefined)).toEqual({
      authenticated: true,
      terminal: 'root',
      insecureDevelopmentFallback: true,
    });
  });

  it('rejects duplicate and master-reused token values without exposing them', () => {
    const duplicateAgent = () => buildAuthSnapshot({
      MCP_TOKEN_BACKEND: 'shared-secret-test-value',
      MCP_TOKEN_FRONTEND: 'shared-secret-test-value',
    });
    const reusedMaster = () => buildAuthSnapshot({
      MCP_AUTH_TOKEN: 'shared-secret-test-value',
      MCP_TOKEN_BACKEND: 'shared-secret-test-value',
    });

    expect(duplicateAgent).toThrow('duplicate token');
    expect(reusedMaster).toThrow('must be distinct');
    for (const operation of [duplicateAgent, reusedMaster]) {
      try {
        operation();
      } catch (error) {
        expect(String(error)).not.toContain('shared-secret-test-value');
      }
    }
  });

  it('compares equal and different-length credentials without throwing', () => {
    expect(constantTimeTokenEquals('same-test-value', 'same-test-value')).toBe(true);
    expect(constantTimeTokenEquals('short', 'a-much-longer-test-value')).toBe(false);
    expect(constantTimeTokenEquals('', 'non-empty')).toBe(false);
    expect(constantTimeTokenEquals('árvíztűrő', 'arvizturo')).toBe(false);
  });

  it('never promotes a missing request identity to root', () => {
    expect(resolveAuthenticatedIdentity(undefined)).toBeNull();
    expect(resolveAuthenticatedIdentity('')).toBeNull();
    expect(resolveAuthenticatedIdentity('   ')).toBeNull();
    expect(resolveAuthenticatedIdentity('backend')).toBe('backend');
  });
});

describe('MCP permission policy', () => {
  it('accepts only a deny-by-default permission document', () => {
    const snapshot = parseToolPermissions(`
default: none
permissions:
  search_knowledge: all
  create_task: [root, conductor]
`);

    expect(snapshot).toEqual({
      defaultPermission: 'none',
      permissions: {
        search_knowledge: 'all',
        create_task: ['root', 'conductor'],
      },
    });
    expect(() => parseToolPermissions('default: all\npermissions: {}')).toThrow(
      'default must be "none"',
    );
    expect(() => parseToolPermissions('default: none\npermissions: []')).toThrow(
      'permissions map',
    );
  });

  it('denies unlisted and explicit-none tools, including for root', () => {
    expect(canUseToolWithPolicy(DENY_BY_DEFAULT, 'backend', 'unknown_tool')).toBe(false);
    expect(canUseToolWithPolicy(DENY_BY_DEFAULT, 'root', 'unknown_tool')).toBe(false);
    expect(canUseToolWithPolicy(DENY_BY_DEFAULT, 'backend', 'retired_tool')).toBe(false);
    expect(canUseToolWithPolicy(DENY_BY_DEFAULT, 'root', 'retired_tool')).toBe(false);
    for (const toolName of ['toString', 'constructor', '__proto__']) {
      expect(() => canUseToolWithPolicy(DENY_BY_DEFAULT, 'root', toolName)).not.toThrow();
      expect(canUseToolWithPolicy(DENY_BY_DEFAULT, 'root', toolName)).toBe(false);
    }
  });

  it('honours explicit public and allow-list rules', () => {
    expect(canUseToolWithPolicy(DENY_BY_DEFAULT, 'backend', 'search_knowledge')).toBe(true);
    expect(canUseToolWithPolicy(DENY_BY_DEFAULT, 'conductor', 'create_task')).toBe(true);
    expect(canUseToolWithPolicy(DENY_BY_DEFAULT, 'backend', 'create_task')).toBe(false);
    expect(canUseToolWithPolicy(DENY_BY_DEFAULT, 'root', 'create_task')).toBe(true);
  });

  it('reports missing, stale, and duplicate declarations deterministically', () => {
    const coverage = getToolPermissionCoverage(
      ['z_tool', 'a_tool', 'a_tool', 'listed_tool'],
      { listed_tool: 'all', stale_tool: 'none' },
    );

    expect(coverage).toEqual({
      declaredCount: 3,
      explicitRuleCount: 2,
      missingRules: ['a_tool', 'z_tool'],
      staleRules: ['stale_tool'],
      duplicateDeclarations: ['a_tool'],
      complete: false,
    });
  });

  it('loads the tracked policy as default-none and exposes unresolved coverage', () => {
    const serviceRoot = path.resolve(__dirname, '../../..');
    const snapshot = loadToolPermissionsFile(
      path.join(serviceRoot, 'config', 'tool-permissions.yaml'),
    );
    const declared = [
      ...extractToolNames(path.join(serviceRoot, 'src', 'mcp.ts'), 'const TOOLS = [', 'async function handleToolCall'),
      ...extractToolNames(path.join(serviceRoot, 'src', 'task-message-box', 'mcp-tools.ts')),
      ...extractToolNames(path.join(serviceRoot, 'src', 'pipeline', 'subscriptionTools.ts')),
    ];
    const coverage = getToolPermissionCoverage(declared, snapshot.permissions);

    expect(snapshot.defaultPermission).toBe('none');
    expect(coverage.declaredCount).toBe(112);
    expect(coverage.explicitRuleCount).toBe(54);
    expect(coverage.missingRules).toHaveLength(58);
    expect(coverage.complete).toBe(false);
    expect([...coverage.missingRules]).toEqual([...coverage.missingRules].sort());
  });

  it('fails the first production permission load but retains a valid reload snapshot', () => {
    const startupError = new Error('test permission load failure');
    const emptySnapshot: ToolPermissionsSnapshot = {
      defaultPermission: 'none',
      permissions: {},
    };

    expect(() => resolveFailedPermissionLoad({
      snapshot: emptySnapshot,
      hasLoadedValidSnapshot: false,
    }, true, startupError)).toThrow(startupError);

    const retained = resolveFailedPermissionLoad({
      snapshot: DENY_BY_DEFAULT,
      hasLoadedValidSnapshot: true,
    }, true, new Error('test reload failure'));
    expect(retained).toBe(DENY_BY_DEFAULT);

    const developmentFallback = resolveFailedPermissionLoad({
      snapshot: emptySnapshot,
      hasLoadedValidSnapshot: false,
    }, false, startupError);
    expect(developmentFallback).toBe(emptySnapshot);
  });

  it('authorizes only classified mailbox routes and never gives root an unknown-route bypass', () => {
    expect(authorizeMailboxRoute({
      identity: 'root',
      method: 'GET',
      routePath: '/future-route',
      canCreateTask: true,
    })).toEqual({ allowed: false, reason: 'unknown_route' });

    expect(authorizeMailboxRoute({
      identity: 'backend',
      method: 'GET',
      routePath: '/:terminal/inbox',
      targetTerminal: 'backend',
      canCreateTask: false,
    })).toEqual({ allowed: true });

    expect(authorizeMailboxRoute({
      identity: 'backend',
      method: 'GET',
      routePath: '/:terminal/inbox',
      targetTerminal: 'frontend',
      canCreateTask: false,
    })).toEqual({ allowed: false, reason: 'other_mailbox' });
  });
});

function extractToolNames(
  filePath: string,
  startMarker?: string,
  endMarker?: string,
): string[] {
  let source = readFileSync(filePath, 'utf-8');
  if (startMarker) source = source.slice(source.indexOf(startMarker));
  if (endMarker) source = source.slice(0, source.indexOf(endMarker));
  return [...source.matchAll(/^\s+name:\s*'([^']+)'/gm)].map((match) => match[1]);
}
