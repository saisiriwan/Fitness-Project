import { useState, useEffect, useRef, useCallback } from "react";

const WS_URL = "ws://localhost:8080/ws"; // Adjust if needed via env

export const useWebSocket = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<any>(null);
  const ws = useRef<WebSocket | null>(null);
  const reconnectTimeout = useRef<number | null>(null);

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
      // Auto reconnect
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
    connect();
    return () => {
      ws.current?.close();
      if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current);
    };
  }, [connect]);

  // const sendMessage = (msg: any) => {
  //   if (ws.current?.readyState === WebSocket.OPEN) {
  //     ws.current.send(JSON.stringify(msg));
  //   }
  // };

  return { isConnected, lastMessage };
};
