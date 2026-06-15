import { useState, useEffect, useRef } from "react";
import { io } from "socket.io-client";

const SOCKET_URL = "http://localhost:4000";
const MAX_EVENTS = 50;

export function useIngestion() {
  const socketRef = useRef(null);
  const abortRef = useRef(null);

  // idle | uploading | processing | complete | failed
  const [status, setStatus] = useState("idle");
  const [progress, setProgress] = useState({
    processed: 0,
    valid: 0,
    failed: 0,
  });

  const [stats, setStats] = useState(null);
  const [events, setEvents] = useState([]);
  const [error, setError] = useState(null);

  function addEvent(type, data) {
    setEvents((prev) =>
      [
        { id: Date.now(), type, data, timestamp: new Date().toISOString() },
        ...prev,
      ].slice(0, MAX_EVENTS),
    );
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

    // create new controller for this upload
    const controller = new AbortController();
    abortRef.current = controller;

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
        signal: controller.signal, // attach signal to fetch
      });

      if (!res.ok) {
        const { error } = await res.json();
        throw new Error(error ?? "Upload failed");
      }

      const data = await res.json();
      addEvent("uploaded", { fileId: data.fileId });
      setStatus("processing");
    } catch (err) {
      // AbortError means user cancelled, not a real error
      if (err.name === "AbortError") {
        setStatus("idle");
        addEvent("cancelled", {});
        return;
      }

      setStatus("failed");
      setError(err.message);
      addEvent("failed", { error: err.message });
    } finally {
      abortRef.current = null; // clean up ref
    }
  }

  function cancel() {
    if (abortRef.current) {
      abortRef.current.abort();
    }
  }

  return {
    status,
    progress,
    stats,
    events,
    error,
    uploadFile,
    cancel,
  };
}
