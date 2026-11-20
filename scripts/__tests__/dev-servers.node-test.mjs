import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { chmodSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import net from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = fileURLToPath(new URL("../../", import.meta.url));
const baseEnv = { ...process.env, BITSOCIAL_PINNED_NODE_REEXEC: "1", BROWSER: "none" };
for (const name of ["PORTLESS", "PORTLESS_URL", "PORT", "HOST"]) {
  delete baseEnv[name];
}

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitUntil(predicate, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await predicate()) return true;
    await delay(50);
  }
  return false;
}

function isListening(port) {
  return new Promise((resolve) => {
    const socket = net.connect({ host: "127.0.0.1", port });
    socket.once("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.once("error", () => resolve(false));
  });
}

// Each script runs in its own process group so a test can signal exactly one PID, and cleanup
// still reaches every descendant it left behind.
function launch(t, script, env = {}, root = repoRoot) {
  const child = spawn(process.execPath, [path.join(root, "scripts", script)], {
    cwd: root,
    env: { ...baseEnv, ...env },
    stdio: ["ignore", "pipe", "pipe"],
    detached: true,
  });
  let output = "";
  child.stdout.on("data", (chunk) => (output += chunk));
  child.stderr.on("data", (chunk) => (output += chunk));
  const exited = new Promise((resolve) =>
    child.once("exit", (code, signal) => resolve({ code, signal })),
  );
  t.after(() => {
    try {
      process.kill(-child.pid, "SIGKILL");
    } catch {
      /* Already gone. */
    }
  });
  return {
    pid: child.pid,
    output: () => output,
    async waitForOutput(text, timeoutMs = 30_000) {
      const seen = await waitUntil(() => output.includes(text), timeoutMs);
      assert.ok(seen, `${script} never printed "${text}":\n${output}`);
    },
    async waitForExit(timeoutMs) {
      let timer;
      const timeout = new Promise((resolve) => {
        timer = setTimeout(() => resolve(null), timeoutMs);
      });
      try {
        return await Promise.race([exited, timeout]);
      } finally {
        clearTimeout(timer);
      }
    },
  };
}

function fakeBin(t, name, script) {
  const dir = mkdtempSync(path.join(tmpdir(), "dev-servers-test-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const file = path.join(dir, name);
  writeFileSync(file, script);
  chmodSync(file, 0o755);
  return { dir, log: path.join(dir, `${name}.log`) };
}

test("start-stats stops the containers when interrupted while the dashboard warms up", async (t) => {
  if (await isListening(3302)) {
    t.skip("a stats dashboard is already listening on 127.0.0.1:3302");
    return;
  }
  const envFile = path.join(repoRoot, ".env");
  if (!existsSync(envFile)) t.after(() => rmSync(envFile, { force: true }));
  const docker = fakeBin(t, "docker", `#!/bin/sh\necho "$*" >> "$FAKE_LOG"\n`);
  const run = launch(t, "start-stats.mjs", {
    PATH: `${docker.dir}${path.delimiter}${process.env.PATH}`,
    FAKE_LOG: docker.log,
  });
  await run.waitForOutput("Waiting for the stats dashboard");

  process.kill(run.pid, "SIGINT");

  assert.ok(await run.waitForExit(10_000), `start-stats did not exit:\n${run.output()}`);
  assert.match(readFileSync(docker.log, "utf8"), /^compose -f \S+ stop$/m);
});
