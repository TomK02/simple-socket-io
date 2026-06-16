// array held in module scope
// GC can never collect it because it's always referenced
const leak = [];

let iteration = 0;

function growHeap() {
  iteration++;

  // allocate 10MB of strings per iteration
  // strings are kept in the leak array so GC can't free them
  const chunk = new Array(1_000_000).fill(
    `leak-iteration-${iteration}-${"x".repeat(100)}`,
  );
  leak.push(chunk);

  const used = process.memoryUsage();
  const heapUsedMB = (used.heapUsed / 1024 / 1024).toFixed(1);
  const heapTotalMB = (used.heapTotal / 1024 / 1024).toFixed(1);
  const rssMB = (used.rss / 1024 / 1024).toFixed(1);
  const percent = ((used.heapUsed / used.heapTotal) * 100).toFixed(1);

  process.stdout.write(
    `\r   Iteration: ${String(iteration).padEnd(4)} | Heap: ${heapUsedMB}MB / ${heapTotalMB}MB (${percent}%) | RSS: ${rssMB}MB | Chunks: ${leak.length}`,
  );
}

console.log(`
╔══════════════════════════════════════════════════════╗
║               MEMORY LEAK SIMULATOR                  ║
╠══════════════════════════════════════════════════════╣
║  Allocating ~10MB per iteration                      ║
║  References held → GC cannot collect                 ║
║  Watch heap grow on your FE dashboard                ║
║  Press Ctrl+C to stop                                ║
╚══════════════════════════════════════════════════════╝
`);

// grow heap every 500ms
const timer = setInterval(growHeap, 500);

// handle Ctrl+C gracefully
process.on("SIGINT", () => {
  clearInterval(timer);
  process.stdout.write("\n\n");

  const used = process.memoryUsage();
  console.log(`
╔══════════════════════════════════════════════════════╗
║                  FINAL MEMORY STATS                  ║
╠══════════════════════════════════════════════════════╣
║  Iterations:  ${String(iteration).padEnd(37)}║
║  Heap Used:   ${String((used.heapUsed / 1024 / 1024).toFixed(1) + "MB").padEnd(37)}║
║  Heap Total:  ${String((used.heapTotal / 1024 / 1024).toFixed(1) + "MB").padEnd(37)}║
║  RSS:         ${String((used.rss / 1024 / 1024).toFixed(1) + "MB").padEnd(37)}║
║  Total leak:  ${String((leak.length * 10).toFixed(0) + "MB approx").padEnd(37)}║
╚══════════════════════════════════════════════════════╝
  `);

  process.exit(0);
});
