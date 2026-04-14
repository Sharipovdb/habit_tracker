import api from "./client";
import type { AuthCredentials, AuthResponse } from "../types";

export async function registerUser(email: string, password: string): Promise<AuthResponse> {
  const credentials: AuthCredentials = { email, password };
  const { data } = await api.post<AuthResponse>("/auth/register", credentials);
  return data;
}

export async function loginUser(email: string, password: string): Promise<AuthResponse> {
  const credentials: AuthCredentials = { email, password };
  const { data } = await api.post<AuthResponse>("/auth/login", credentials);
  return data;
}
