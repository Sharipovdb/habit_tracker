import api from "./client";
import type { User } from "../types";

export async function getProfile(): Promise<User> {
  const { data } = await api.get<User>("/profile");
  return data;
}

export async function updateProfile(body: {
  name?: string;
  age?: number;
  height?: number;
  weight?: number;
}): Promise<User> {
  const { data } = await api.put<User>("/profile", body);
  return data;
}
