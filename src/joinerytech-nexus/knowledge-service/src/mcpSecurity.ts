import * as fs from 'fs';
import * as yaml from 'js-yaml';
import { createHash, timingSafeEqual } from 'crypto';

export type ToolPermission = 'all' | 'none' | string[];

export interface AuthSnapshot {
  masterToken: string;
  agentTokens: Record<string, string>;
  allowInsecureDevelopmentRoot: boolean;
}

export interface ToolPermissionsSnapshot {
  defaultPermission: 'none';
  permissions: Record<string, ToolPermission>;
}

export interface ToolPermissionCoverage {
  declaredCount: number;
  explicitRuleCount: number;
  missingRules: string[];
  staleRules: string[];
  duplicateDeclarations: string[];
  complete: boolean;
}

export interface FailedPermissionLoadState {
  snapshot: ToolPermissionsSnapshot;
  hasLoadedValidSnapshot: boolean;
}

export type AuthenticationDecision =
  | { authenticated: true; terminal: string; insecureDevelopmentFallback: boolean }
  | { authenticated: false; status: 401 | 403; message: string };

export interface MailboxAuthorizationInput {
  identity: string;
  method: string;
  routePath: string;
  targetTerminal?: string;
  canCreateTask: boolean;
}

export type MailboxAuthorizationDecision =
  | { allowed: true }
  | {
      allowed: false;
      reason: 'unknown_route' | 'broadcast' | 'target_required' | 'monitor_read_only' | 'other_mailbox';
    };

const GLOBAL_MAILBOX_READ_ROUTES = new Set([
  'GET /counter',
  'GET /outbox/unread',
  'GET /tasks/status',
  'GET /api/tasks/status',
]);

const TERMINAL_MAILBOX_READ_ROUTES = new Set([
  'GET /:terminal/inbox',
  'GET /:terminal/outbox',
  'GET /:terminal/subscribe',
]);

const TERMINAL_MAILBOX_WRITE_ROUTES = new Set([
  'POST /:terminal/inbox',
  'POST /:terminal/outbox',
  'POST /:terminal/:box/:messageId/read',
]);

/**
 * True only for the explicitly requested local development escape hatch.
 * Any other environment remains authenticated and fail-closed.
 */
export function allowsInsecureDevelopmentRoot(
  env: NodeJS.ProcessEnv,
): boolean {
  return env.NODE_ENV === 'development'
    && env.MCP_ALLOW_INSECURE_DEV_AUTH === 'true';
}

/**
 * Build the credential snapshot exclusively from environment/secret-provider
 * values. Token-bearing YAML is deliberately not part of the runtime contract.
 */
export function buildAuthSnapshot(env: NodeJS.ProcessEnv): AuthSnapshot {
  const masterToken = env.MCP_AUTH_TOKEN?.trim() || '';
  const agentTokens = Object.create(null) as Record<string, string>;

  for (const key of Object.keys(env).sort()) {
    if (!key.startsWith('MCP_TOKEN_')) continue;

    const agentName = key.slice('MCP_TOKEN_'.length).toLowerCase();
    const token = env[key]?.trim() || '';
    if (!agentName || !token) continue;

    const previousAgent = agentTokens[token];
    if (previousAgent && previousAgent !== agentName) {
      throw new Error('MCP credential configuration contains a duplicate token');
    }

    if (token === masterToken) {
      throw new Error('MCP master and agent credentials must be distinct');
    }

    agentTokens[token] = agentName;
  }

  const snapshot: AuthSnapshot = {
    masterToken,
    agentTokens,
    allowInsecureDevelopmentRoot: allowsInsecureDevelopmentRoot(env),
  };

  if (
    env.NODE_ENV === 'production'
    && !snapshot.masterToken
    && Object.keys(snapshot.agentTokens).length === 0
  ) {
    throw new Error('MCP authentication credentials are required in production');
  }

  return snapshot;
}

export function getAgentFromToken(
  snapshot: AuthSnapshot,
  token: string,
): string | null {
  let matchedAgent: string | null = null;
  if (snapshot.masterToken && constantTimeTokenEquals(token, snapshot.masterToken)) {
    matchedAgent = 'root';
  }

  for (const [configuredToken, agentName] of Object.entries(snapshot.agentTokens)) {
    if (constantTimeTokenEquals(token, configuredToken) && matchedAgent === null) {
      matchedAgent = agentName;
    }
  }

  return matchedAgent;
}

/** Compare arbitrary-length credentials through fixed-size SHA-256 digests. */
export function constantTimeTokenEquals(candidate: string, configured: string): boolean {
  const candidateDigest = createHash('sha256').update(candidate, 'utf8').digest();
  const configuredDigest = createHash('sha256').update(configured, 'utf8').digest();
  return timingSafeEqual(candidateDigest, configuredDigest);
}

/** Shared Bearer decision for MCP and REST middleware. */
export function authenticateBearer(
  snapshot: AuthSnapshot,
  authorizationHeader: string | undefined,
): AuthenticationDecision {
  if (snapshot.allowInsecureDevelopmentRoot) {
    return {
      authenticated: true,
      terminal: 'root',
      insecureDevelopmentFallback: true,
    };
  }

  if (!authorizationHeader || !authorizationHeader.startsWith('Bearer ')) {
    return {
      authenticated: false,
      status: 401,
      message: 'Unauthorized: Bearer token required',
    };
  }

  const agent = getAgentFromToken(snapshot, authorizationHeader.slice(7));
  if (!agent) {
    return {
      authenticated: false,
      status: 403,
      message: 'Forbidden: Invalid token',
    };
  }

  return {
    authenticated: true,
    terminal: agent,
    insecureDevelopmentFallback: false,
  };
}

function isToolPermission(value: unknown): value is ToolPermission {
  if (value === 'all' || value === 'none') return true;
  return Array.isArray(value)
    && value.every((terminal) => typeof terminal === 'string' && terminal.length > 0);
}

/** Parse and validate a permission config. The only accepted default is deny. */
export function parseToolPermissions(content: string): ToolPermissionsSnapshot {
  const raw = yaml.load(content);
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error('MCP tool permission config must be a YAML object');
  }

  const config = raw as Record<string, unknown>;
  if (config.default !== 'none') {
    throw new Error('MCP tool permission default must be "none"');
  }

  if (!config.permissions || typeof config.permissions !== 'object' || Array.isArray(config.permissions)) {
    throw new Error('MCP tool permission config must contain a permissions map');
  }

  const permissions = Object.create(null) as Record<string, ToolPermission>;
  for (const [toolName, permission] of Object.entries(config.permissions)) {
    if (!toolName || !isToolPermission(permission)) {
      throw new Error(`Invalid MCP permission rule for tool: ${toolName || '<empty>'}`);
    }
    permissions[toolName] = Array.isArray(permission) ? [...permission] : permission;
  }

  return { defaultPermission: 'none', permissions };
}

export function loadToolPermissionsFile(filePath: string): ToolPermissionsSnapshot {
  return parseToolPermissions(fs.readFileSync(filePath, 'utf-8'));
}

/**
 * Production cannot start without a first valid permission snapshot. A later
 * reload failure is fail-closed by retaining the last validated snapshot.
 */
export function resolveFailedPermissionLoad(
  state: FailedPermissionLoadState,
  production: boolean,
  error: unknown,
): ToolPermissionsSnapshot {
  if (production && !state.hasLoadedValidSnapshot) throw error;
  return state.snapshot;
}

/** Unknown tools and explicit deny rules apply to root as well. */
export function canUseToolWithPolicy(
  snapshot: ToolPermissionsSnapshot,
  terminal: string,
  toolName: string,
): boolean {
  if (!Object.prototype.hasOwnProperty.call(snapshot.permissions, toolName)) return false;
  const permission = snapshot.permissions[toolName];
  if (permission === 'none') return false;
  if (terminal === 'root' || permission === 'all') return true;
  return permission.includes(terminal);
}

/** Stable, sorted comparison used by startup checks and CI tests. */
export function getToolPermissionCoverage(
  declaredToolNames: readonly string[],
  permissions: Readonly<Record<string, ToolPermission>>,
): ToolPermissionCoverage {
  const declarationCounts = new Map<string, number>();
  for (const name of declaredToolNames) {
    declarationCounts.set(name, (declarationCounts.get(name) || 0) + 1);
  }

  const declared = new Set(declarationCounts.keys());
  const explicit = new Set(Object.keys(permissions));
  const missingRules = [...declared].filter((name) => !explicit.has(name)).sort();
  const staleRules = [...explicit].filter((name) => !declared.has(name)).sort();
  const duplicateDeclarations = [...declarationCounts.entries()]
    .filter(([, count]) => count > 1)
    .map(([name]) => name)
    .sort();

  return {
    declaredCount: declared.size,
    explicitRuleCount: explicit.size,
    missingRules,
    staleRules,
    duplicateDeclarations,
    complete: missingRules.length === 0
      && staleRules.length === 0
      && duplicateDeclarations.length === 0,
  };
}

/** Missing request identity must never be promoted to root. */
export function resolveAuthenticatedIdentity(identity: string | undefined): string | null {
  if (!identity || !identity.trim()) return null;
  return identity;
}

/** Authorize only an already matched, validated mailbox route template. */
export function authorizeMailboxRoute(
  input: MailboxAuthorizationInput,
): MailboxAuthorizationDecision {
  const routeKey = `${input.method} ${input.routePath}`;
  const knownRoute = GLOBAL_MAILBOX_READ_ROUTES.has(routeKey)
    || TERMINAL_MAILBOX_READ_ROUTES.has(routeKey)
    || TERMINAL_MAILBOX_WRITE_ROUTES.has(routeKey)
    || routeKey === 'POST /broadcast';

  if (!knownRoute) return { allowed: false, reason: 'unknown_route' };
  if (input.identity === 'root' || input.identity === 'conductor') return { allowed: true };
  if (GLOBAL_MAILBOX_READ_ROUTES.has(routeKey)) return { allowed: true };
  if (routeKey === 'POST /broadcast') return { allowed: false, reason: 'broadcast' };
  if (!input.targetTerminal) return { allowed: false, reason: 'target_required' };

  if (input.identity === 'monitor') {
    return TERMINAL_MAILBOX_READ_ROUTES.has(routeKey)
      ? { allowed: true }
      : { allowed: false, reason: 'monitor_read_only' };
  }

  if (input.targetTerminal === input.identity) return { allowed: true };
  if (routeKey === 'POST /:terminal/inbox' && input.canCreateTask) return { allowed: true };
  return { allowed: false, reason: 'other_mailbox' };
}
