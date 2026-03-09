import { useState, useEffect, useRef, useCallback } from "react";
import { getWsUrl } from "@/lib/api";

const WS_URL = getWsUrl();

export const useWebSocket = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<any>(null);
  const ws = useRef<WebSocket | null>(null);
  const reconnectTimeout = useRef<number | null>(null);
  const isMounted = useRef(true); // Bug 1 fix: track mount state to prevent reconnect after unmount

  const connect = useCallback(() => {
    if (ws.current?.readyState === WebSocket.OPEN) return;

    const socket = new WebSocket(WS_URL);
    ws.current = socket;

    socket.onopen = () => {
      console.log("WebSocket Connected");
      setIsConnected(true);
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
        reconnectTimeout.current = null;
      }
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log("WS Message:", data);
        setLastMessage(data);
      } catch (e) {
        console.error("Failed to parse WS message", e);
      }
    };

    socket.onclose = () => {
      console.log("WebSocket Disconnected");
      setIsConnected(false);
      ws.current = null;
      // Bug 1 fix: only reconnect if component is still mounted
      if (!isMounted.current) return;
      reconnectTimeout.current = window.setTimeout(() => {
        console.log("Attempting Reconnect...");
        connect();
      }, 5000);
    };

    socket.onerror = (error) => {
      console.error("WebSocket Error:", error);
      socket.close();
    };
  }, []);

  useEffect(() => {
    isMounted.current = true;
    connect();
    return () => {
      isMounted.current = false; // Bug 1 fix: flag unmount BEFORE closing socket
      if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current);
      ws.current?.close();
    };
  }, [connect]);

  return { isConnected, lastMessage };
};
