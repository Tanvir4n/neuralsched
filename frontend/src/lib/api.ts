import axios from "axios";

// Vite proxy maps /api -> backend (see vite.config.ts). In production the
// VITE_API_BASE env points at the deployed backend.
const BASE = import.meta.env.VITE_API_BASE ?? "/api";

export const api = axios.create({ baseURL: BASE });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("ns_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// WebSocket URL for telemetry stream.
export function telemetryWsUrl(): string {
  const explicit = import.meta.env.VITE_WS_BASE;
  if (explicit) return `${explicit}/stream/telemetry`;
  const loc = window.location;
  const proto = loc.protocol === "https:" ? "wss" : "ws";
  // Dev: vite proxies /api (with ws) to backend.
  return `${proto}://${loc.host}/api/stream/telemetry`;
}

// ---- typed helpers ----
export interface NodeSnap {
  node_id: string;
  gpu_util: number;
  active_jobs: number;
  nvlink_peers: string[];
  faulting: boolean;
  latest: Record<string, number>;
}

export interface ClusterSnapshot {
  nodes: NodeSnap[];
  ts: number;
  simulated: boolean;
}

export async function login(email: string, password: string) {
  const form = new URLSearchParams();
  form.set("username", email);
  form.set("password", password);
  const { data } = await api.post("/auth/login", form, {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });
  return data as { access_token: string; role: string };
}

export async function signup(email: string, password: string, role: string) {
  const { data } = await api.post("/auth/signup", { email, password, role });
  return data;
}
