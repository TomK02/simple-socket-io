import os from "node:os";

// track cpu baseline for delta calculation
let lastCpuUsage = process.cpuUsage();
let lastCpuTime = Date.now();

export function getServerMetrics() {
  const mem = process.memoryUsage();
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;
  const cpus = os.cpus();

  // cpu delta since last call
  const now = Date.now();
  const cpuDelta = process.cpuUsage(lastCpuUsage);
  const elapsed = now - lastCpuTime;

  // update baseline for next call
  lastCpuUsage = process.cpuUsage();
  lastCpuTime = now;

  // cpu utilization percentage
  const userPercent = ((cpuDelta.user / 1000 / elapsed) * 100).toFixed(1);
  const systemPercent = ((cpuDelta.system / 1000 / elapsed) * 100).toFixed(1);
  const totalPercent = (
    ((cpuDelta.user + cpuDelta.system) / 1000 / elapsed) *
    100
  ).toFixed(1);

  return {
    memory: {
      heapUsed: formatBytes(mem.heapUsed),
      heapTotal: formatBytes(mem.heapTotal),
      heapUsedPercent: ((mem.heapUsed / mem.heapTotal) * 100).toFixed(1),
      rss: formatBytes(mem.rss),
      external: formatBytes(mem.external),
      systemTotal: formatBytes(totalMem),
      systemFree: formatBytes(freeMem),
      systemUsed: formatBytes(usedMem),
      systemUsedPercent: ((usedMem / totalMem) * 100).toFixed(1),
    },
    cpu: {
      userPercent: `${userPercent}%`,
      systemPercent: `${systemPercent}%`,
      totalPercent: `${totalPercent}%`,
      cores: cpus.length,
      model: cpus[0].model,
      loadAvg: os.loadavg().map((l) => l.toFixed(2)),
    },
    process: {
      uptime: formatUptime(process.uptime()),
      pid: process.pid,
      nodeVersion: process.version,
      platform: process.platform,
    },
  };
}

export function startRequestMetrics() {
  const cpuBefore = process.cpuUsage();
  const memBefore = process.memoryUsage();
  const timeBefore = performance.now();

  return function endRequestMetrics() {
    const cpuDelta = process.cpuUsage(cpuBefore);
    const memAfter = process.memoryUsage();
    const duration = performance.now() - timeBefore;

    return {
      duration: `${duration.toFixed(2)}ms`,
      cpu: {
        user: `${(cpuDelta.user / 1000).toFixed(2)}ms`,
        system: `${(cpuDelta.system / 1000).toFixed(2)}ms`,
        total: `${((cpuDelta.user + cpuDelta.system) / 1000).toFixed(2)}ms`,
      },
      memory: {
        heapUsedDelta: formatBytes(
          memAfter.heapUsed - memBefore.heapUsed,
          true,
        ),
        heapUsedBefore: formatBytes(memBefore.heapUsed),
        heapUsedAfter: formatBytes(memAfter.heapUsed),
        rssDelta: formatBytes(memAfter.rss - memBefore.rss, true),
      },
    };
  };
}

function formatBytes(bytes, isDelta = false) {
  const abs = Math.abs(bytes);
  const sign = isDelta ? (bytes < 0 ? "-" : "+") : "";

  if (abs < 1024) return `${sign}${abs}B`;
  if (abs < 1024 ** 2) return `${sign}${(abs / 1024).toFixed(1)}KB`;
  if (abs < 1024 ** 3) return `${sign}${(abs / 1024 ** 2).toFixed(1)}MB`;
  return `${sign}${(abs / 1024 ** 3).toFixed(1)}GB`;
}

function formatUptime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${h}h ${m}m ${s}s`;
}
