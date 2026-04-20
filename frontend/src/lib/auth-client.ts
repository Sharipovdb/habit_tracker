import { createAuthClient } from "better-auth/react";

const apiBaseUrl = import.meta.env.VITE_API_URL ?? "http://localhost:3000/api";
const authBaseUrl = apiBaseUrl.replace(/\/api\/?$/, "");

export const authClient = createAuthClient({
  baseURL: authBaseUrl,
  basePath: "/api/auth",
  disableDefaultFetchPlugins: true,
  fetchOptions: {
    credentials: "include",
  },
});