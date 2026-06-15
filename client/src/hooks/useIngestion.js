import { useState, useEffect, useRef } from "react";
import { io } from "socket.io-client";

const SOCKET_URL = "http://localhost:3000";

export function useIngestion() {
  const socketRef = useRef(null);

  const [status, setStatus] = useState("idle");
  // idle | uploading | processing | complete | failed

  const [progress, setProgress] = useState({
    processed: 0,
    valid: 0,
    failed: 0,
  });

  const [stats, setStats] = useState(null);
  const [events, setEvents] = useState([]);
  const [error, setError] = useState(null);

  // helper to add to event log
  function addEvent(type, data) {
    setEvents((prev) => [
      { id: Date.now(), type, data, timestamp: new Date().toISOString() },
      ...prev, // newest first
    ]);
  }

  useEffect(() => {
    const socket = io(SOCKET_URL);
    socketRef.current = socket;

    socket.on("connect", () => {
      addEvent("connected", { socketId: socket.id });
    });

    socket.on("ingestion:progress", (data) => {
      setStatus("processing");
      setProgress(data);
      addEvent("progress", data);
    });

    socket.on("ingestion:complete", (data) => {
      setStatus("complete");
      setStats(data.stats);
      addEvent("complete", data.stats);
    });

    socket.on("ingestion:failed", (data) => {
      setStatus("failed");
      setError(data.error);
      addEvent("failed", data);
    });

    socket.on("disconnect", () => {
      addEvent("disconnected", {});
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  async function uploadFile(file) {
    if (!file) return;

    // reset state
    setStatus("uploading");
    setProgress({ processed: 0, valid: 0, failed: 0 });
    setStats(null);
    setError(null);
    setEvents([]);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch(`${SOCKET_URL}/api/parse-csv`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const { error } = await res.json();
        throw new Error(error ?? "Upload failed");
      }

      const data = await res.json();
      addEvent("uploaded", { fileId: data.fileId });
      setStatus("processing"); // waiting for socket events
    } catch (err) {
      setStatus("failed");
      setError(err.message);
      addEvent("failed", { error: err.message });
    }
  }

  return {
    status,
    progress,
    stats,
    events,
    error,
    uploadFile,
  };
}
