const { execSync, spawn } = require("child_process");
const path = require("path");

const projectRoot = process.cwd();
const port = 3000;
const cleanMode = process.argv.includes("--clean");

function findListeningPids(targetPort) {
  try {
    if (process.platform === "win32") {
      const output = execSync("netstat -ano -p tcp", {
        cwd: projectRoot,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      });

      return [
        ...new Set(
          output
            .split(/\r?\n/)
            .map((line) => line.trim())
            .filter(Boolean)
            .filter((line) => line.includes(`:${targetPort}`) && /LISTENING/i.test(line))
            .map((line) => Number(line.split(/\s+/).pop()))
            .filter((pid) => Number.isInteger(pid) && pid > 0)
        ),
      ];
    }

    const output = execSync(`lsof -ti tcp:${targetPort}`, {
      cwd: projectRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });

    return [
      ...new Set(
        output
          .split(/\r?\n/)
          .map((line) => Number(line.trim()))
          .filter((pid) => Number.isInteger(pid) && pid > 0)
      ),
    ];
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
    // Ignore if the process is already gone.
  }
}

function cleanupNextDirectory() {
  try {
    execSync(process.platform === "win32" ? 'rmdir /S /Q ".next"' : 'rm -rf ".next"', {
      cwd: projectRoot,
      stdio: ["ignore", "ignore", "ignore"],
      shell: true,
    });
  } catch (_) {
    // Let Next surface any actionable filesystem issues.
  }
}

const stalePids = findListeningPids(port).filter((pid) => pid !== process.pid);
if (stalePids.length > 0) {
  console.log(`Freeing port ${port} by stopping PID(s): ${stalePids.join(", ")}`);
  stalePids.forEach(killPid);
}

if (cleanMode) {
  console.log("Clearing .next cache because --clean was requested.");
  cleanupNextDirectory();
}

const nextCli = path.join(projectRoot, "node_modules", "next", "dist", "bin", "next");
const nextArgs = ["dev", "--webpack", "-p", String(port)];

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
