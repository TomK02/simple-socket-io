import { Router } from "express";
import multer from "multer";
import { unlink } from "node:fs/promises";
import { ingestCSV } from "../pipeline/ingestCSV.js";

const router = Router();

const upload = multer({
  dest: "uploads/",
  limits: {
    fileSize: 1000 * 1_024 * 1_024, // 100MB max
  },
  fileFilter(req, file, callback) {
    if (!file.originalname.endsWith(".csv")) {
      return callback(new Error("Only CSV files are allowed"));
    }
    callback(null, true);
  },
});

export function csvRoutes(io) {
  router.post("/parse-csv", upload.single("file"), async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const fileId = req.file.filename;
    const filePath = req.file.path;

    req.on("close", async () => {
      if (!res.writableEnded) {
        console.log(`Upload aborted by client, cleaning up: ${filePath}`);
        try {
          await unlink(filePath);
        } catch (err) {
          console.error(`Cleanup failed after abort: ${filePath}`, err);
        }
      }
    });

    // return 202 immediately, processing is async
    res.status(202).json({
      message: "File received, processing started",
      fileId,
    });

    // process in background, don't await in request handler
    ingestCSV(req.file.path, io)
      .then((stats) => {
        // notify all clients when done
        io.emit("ingestion:complete", {
          fileId,
          stats,
          completedAt: new Date().toISOString(),
        });
      })
      .catch((err) => {
        console.error("Ingestion failed:", err);

        // notify clients of failure
        io.emit("ingestion:failed", {
          fileId,
          error: err.message,
          failedAt: new Date().toISOString(),
        });
      })
      .finally(async () => {
        // always clean up temp file regardless of success or failure
        try {
          await unlink(filePath);
          console.log(`Cleaned up temp file: ${filePath}`);
        } catch (err) {
          // log but don't throw, cleanup failure shouldn't affect the response
          console.error(`Failed to clean up temp file: ${filePath}`, err);
        }
      });
  });

  return router;
}
