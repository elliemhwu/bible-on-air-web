import axios from "axios";

// On the server, axios needs an absolute URL. On the browser, the rewrite
// proxy handles routing so a relative path is enough (and avoids CORS).
const BASE =
  typeof window === "undefined"
    ? (process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001")
    : "";

export const apiClient = axios.create({
  baseURL: `${BASE}/api/v1`,
  headers: {
    "Content-Type": "application/json",
    ...(process.env.NODE_ENV === "development" && {
      "Cache-Control": "no-store",
    }),
  },
});
