#!/usr/bin/env node
/**
 * MCP Stdio-HTTP Bridge
 *
 * Bridges a stdio MCP client to the Knowledge Service HTTP transport. The
 * credential must be supplied by the process environment or service manager.
 */

const readline = require('readline');
const http = require('http');

const MCP_HOST = process.env.MCP_HOST || 'localhost';
const MCP_PORT = parseInt(process.env.MCP_PORT || '3456', 10);
const AUTH_TOKEN = process.env.MCP_AUTH_TOKEN?.trim();

if (!AUTH_TOKEN) {
  process.stderr.write('[MCP bridge] MCP_AUTH_TOKEN is required.\n');
  process.exit(78);
}

const rl = readline.createInterface({
  input: process.stdin,
  terminal: false,
});

rl.on('line', (line) => {
  if (!line.trim()) return;

  let jsonrpcMessage;
  try {
    jsonrpcMessage = JSON.parse(line);
  } catch {
    console.log(JSON.stringify({
      jsonrpc: '2.0',
      error: {
        code: -32700,
        message: 'Parse error: Invalid JSON',
      },
      id: null,
    }));
    return;
  }

  const postData = JSON.stringify(jsonrpcMessage);
  const options = {
    hostname: MCP_HOST,
    port: MCP_PORT,
    path: '/mcp',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData),
      Authorization: `Bearer ${AUTH_TOKEN}`,
    },
  };

  const req = http.request(options, (res) => {
    let responseData = '';

    res.on('data', (chunk) => {
      responseData += chunk;
    });

    res.on('end', () => {
      console.log(responseData.trim());
    });
  });

  req.on('error', (error) => {
    console.log(JSON.stringify({
      jsonrpc: '2.0',
      error: {
        code: -32603,
        message: `Internal error: ${error.message}`,
      },
      id: jsonrpcMessage.id || null,
    }));
  });

  req.write(postData);
  req.end();
});

rl.on('close', () => {
  process.exit(0);
});

process.on('SIGTERM', () => {
  rl.close();
});

process.on('SIGINT', () => {
  rl.close();
});
