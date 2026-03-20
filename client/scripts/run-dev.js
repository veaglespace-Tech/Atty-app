const fs = require("fs");
const path = require("path");
const { execSync, spawn } = require("child_process");

const projectRoot = process.cwd();
const port = 3000;
const turboMode = process.argv.includes("--turbo");

function findListeningPids(targetPort) {
  try {
    if (process.platform === "win32") {
      const output = execSync("netstat -ano -p tcp", {
        cwd: projectRoot,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      });

      return [...new Set(
        output
          .split(/\r?\n/)
          .map((line) => line.trim())
          .filter(Boolean)
          .filter((line) => line.includes(`:${targetPort}`) && /LISTENING/i.test(line))
          .map((line) => line.split(/\s+/).pop())
          .map((pid) => Number(pid))
          .filter((pid) => Number.isInteger(pid) && pid > 0)
      )];
    }

    const output = execSync(`lsof -ti tcp:${targetPort}`, {
      cwd: projectRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });

    return [...new Set(
      output
        .split(/\r?\n/)
        .map((value) => Number(value.trim()))
        .filter((pid) => Number.isInteger(pid) && pid > 0)
    )];
  } catch (_) {
    return [];
  }
}

function killPid(pid) {
  try {
    if (process.platform === "win32") {
      execSync(`taskkill /PID ${pid} /F /T`, {
        cwd: projectRoot,
        stdio: ["ignore", "ignore", "ignore"],
      });
      return;
    }

    process.kill(pid, "SIGKILL");
  } catch (_) {
    // If the process exited between detection and kill, we can safely ignore it.
  }
}

function cleanupNextDirectory() {
  try {
    fs.rmSync(path.join(projectRoot, ".next"), { recursive: true, force: true });
  } catch (_) {
    // Ignore cleanup failures and let Next report anything actionable.
  }
}

const stalePids = findListeningPids(port).filter((pid) => pid !== process.pid);

if (stalePids.length > 0) {
  console.log(`Freeing port ${port} by stopping PID(s): ${stalePids.join(", ")}`);
  stalePids.forEach(killPid);
}

cleanupNextDirectory();

const nextCli = path.join(projectRoot, "node_modules", "next", "dist", "bin", "next");

const nextArgs = ["dev", "-p", String(port)];
if (turboMode) {
  nextArgs.splice(1, 0, "--turbo");
} else {
  nextArgs.splice(1, 0, "--webpack");
}

const child = spawn(process.execPath, [nextCli, ...nextArgs], {
  cwd: projectRoot,
  stdio: "inherit",
});

const forwardSignal = (signal) => {
  if (!child.killed) {
    child.kill(signal);
  }
};

process.on("SIGINT", () => forwardSignal("SIGINT"));
process.on("SIGTERM", () => forwardSignal("SIGTERM"));

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});
