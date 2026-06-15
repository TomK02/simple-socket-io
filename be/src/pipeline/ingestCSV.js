import { createReadStream } from "node:fs";
import { Transform } from "node:stream";
import { pipeline } from "node:stream/promises";

const BATCH_SIZE = 500;

function normalizeRow(row) {
  return {
    id: row.id?.trim() ?? null,
    name: row.name?.trim().toLowerCase() ?? null,
    email: row.email?.trim().toLowerCase() ?? null,
  };
}

function validateRow(row) {
  const errors = [];
  if (!row.id) errors.push("missing id");
  if (!row.name) errors.push("missing name");
  if (!row.email) errors.push("missing email");
  return errors;
}

export async function ingestCSV(filePath, io) {
  let headers = [];
  let isFirstLine = true;
  let lineBuffer = "";
  let validBatch = [];
  let failedBatch = [];
  const stats = { total: 0, valid: 0, failed: 0 };

  // Stage 1: parse chunks into row objects
  const parser = new Transform({
    objectMode: true,
    transform(chunk, encoding, callback) {
      lineBuffer += chunk.toString();
      const lines = lineBuffer.split("\n");
      lineBuffer = lines.pop(); // keep incomplete line

      for (const line of lines) {
        if (!line.trim()) continue;

        if (isFirstLine) {
          headers = line.split(",").map((h) => h.trim());
          isFirstLine = false;
          continue;
        }

        const values = line.split(",");
        const row = headers.reduce((obj, header, index) => {
          obj[header] = values[index]?.trim() ?? null;
          return obj;
        }, {});

        this.push(row);
      }

      callback();
    },
    flush(callback) {
      if (lineBuffer.trim()) {
        const values = lineBuffer.split(",");
        const row = headers.reduce((obj, header, index) => {
          obj[header] = values[index]?.trim() ?? null;
          return obj;
        }, {});
        this.push(row);
      }
      callback();
    },
  });

  // Stage 2: normalize, validate, batch insert
  const inserter = new Transform({
    objectMode: true,
    async transform(row, encoding, callback) {
      stats.total++;

      const normalized = normalizeRow(row);
      const errors = validateRow(normalized);

      if (errors.length > 0) {
        failedBatch.push({
          raw: row,
          errors,
          failedAt: new Date().toISOString(),
        });
        stats.failed++;
      } else {
        validBatch.push(normalized);
        stats.valid++;
      }

      try {
        if (validBatch.length >= BATCH_SIZE) {
          // replace with real db insert
          console.log(`Inserting ${validBatch.length} valid rows`);
          validBatch = [];

          // emit progress to all connected clients
          io.emit("ingestion:progress", {
            processed: stats.total,
            valid: stats.valid,
            failed: stats.failed,
          });
        }

        if (failedBatch.length >= BATCH_SIZE) {
          // replace with real db insert
          console.log(`Inserting ${failedBatch.length} failed rows`);
          failedBatch = [];
        }

        callback();
      } catch (err) {
        callback(err);
      }
    },
    async flush(callback) {
      try {
        if (validBatch.length > 0) {
          console.log(`Flushing ${validBatch.length} remaining valid rows`);
          validBatch = [];
        }

        if (failedBatch.length > 0) {
          console.log(`Flushing ${failedBatch.length} remaining failed rows`);
          failedBatch = [];
        }

        callback();
      } catch (err) {
        callback(err);
      }
    },
  });

  // run pipeline
  await pipeline(
    createReadStream(filePath, { highWaterMark: 64 * 1024 }),
    parser,
    inserter,
  );

  return stats;
}
