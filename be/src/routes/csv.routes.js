import { Router } from "express";
import multer from "multer";
import { ingestCSV } from "../pipeline/ingestCSV.js";

const router = Router();

const upload = multer({
  dest: "uploads/", // temporary storage
  limits: {
    fileSize: 1000 * 1_024 * 1_024, // 100MB max
  },
  fileFilter(req, file, callback) {
    // only accept CSV files
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

    // return 202 immediately, processing is async
    res.status(202).json({
      message: "File received, processing started",
      fileId: req.file.filename,
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

        // TODO: delete temp file after processing
        // fs.unlink(req.file.path)
      })
      .catch((err) => {
        console.error("Ingestion failed:", err);

        // notify clients of failure
        io.emit("ingestion:failed", {
          fileId: req.file.filename,
          error: err.message,
          failedAt: new Date().toISOString(),
        });
      });
  });

  return router;
}
