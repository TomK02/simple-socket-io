import { useState, useEffect, useRef } from "react";
import { io } from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:4000";
const MAX_REQUESTS = import.meta.env.VITE_MAX_REQUESTS || 20; // keep last 20 requests in log

export function useMetrics() {
  const socketRef = useRef(null);
  const [metrics, setMetrics] = useState(null);
  const [requestLog, setRequestLog] = useState([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const socket = io(SOCKET_URL);
    socketRef.current = socket;

    function addRequestLog(entry) {
      setRequestLog((prev) =>
        [{ id: Date.now(), ...entry }, ...prev].slice(0, MAX_REQUESTS),
      );
    }

    // listen for real time metrics updates
    socket.on("metrics:update", (data) => {
      setMetrics(data);
    });

    // listen for per request metrics
    socket.on("metrics:request", (data) => {
      addRequestLog(data);
    });

    socket.on("metrics:stopped", () => {
      setIsStreaming(false);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  // fetch one time snapshot
  async function fetchMetrics() {
    try {
      const res = await fetch(`${SOCKET_URL}/api/metrics`);
      const data = await res.json();
      setMetrics(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    }
  }

  // start real time streaming
  async function startStreaming(interval = 5000) {
    try {
      await fetch(
        `${SOCKET_URL}/api/metrics/stream/start?interval=${interval}`,
      );
      setIsStreaming(true);
      setError(null);
    } catch (err) {
      setError(err.message);
    }
  }

  // stop real time streaming
  async function stopStreaming() {
    try {
      await fetch(`${SOCKET_URL}/api/metrics/stream/stop`);
      setIsStreaming(false);
      setError(null);
    } catch (err) {
      setError(err.message);
    }
  }

  return {
    metrics,
    requestLog,
    isStreaming,
    error,
    fetchMetrics,
    startStreaming,
    stopStreaming,
  };
}
