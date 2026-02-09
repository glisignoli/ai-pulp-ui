// @vitest-environment node

import { describe, expect, it } from 'vitest';
import { spawn } from 'node:child_process';
import path from 'node:path';

const run = (command: string, args: string[], cwd: string) =>
  new Promise<{ code: number; stdout: string; stderr: string }>((resolve) => {
    const child = spawn(command, args, {
      cwd,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: process.env,
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (d) => {
      stdout += String(d);
    });

    child.stderr.on('data', (d) => {
      stderr += String(d);
    });

    child.on('close', (code) => {
      resolve({ code: code ?? 0, stdout, stderr });
    });
  });

describe('TypeScript typecheck', () => {
  it(
    'tsc --noEmit succeeds (regression for build-breaking TS errors)',
    async () => {
      const repoRoot = process.cwd();

      const tscJs = path.join(repoRoot, 'node_modules', 'typescript', 'bin', 'tsc');
      const tsconfig = path.join(repoRoot, 'tsconfig.json');

      const result = await run(process.execPath, [tscJs, '--noEmit', '-p', tsconfig], repoRoot);

      if (result.code !== 0) {
        console.error(result.stdout);
        console.error(result.stderr);
      }

      expect(result.code).toBe(0);
    },
    { timeout: 60_000 }
  );
});
