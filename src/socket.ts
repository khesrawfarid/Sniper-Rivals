import { io } from "socket.io-client";

// Get appropriate backend URL depending on environment
const getBackendUrl = () => {
  if ((import.meta as any).env?.VITE_APP_URL) {
    return (import.meta as any).env.VITE_APP_URL;
  }
  return window.location.origin;
};

export const socket = io(getBackendUrl(), {
  autoConnect: false, // We'll connect manually
});
