import api from "./client";
import type { UpdateProfileInput, User } from "../types";

export async function getProfile(): Promise<User> {
  const { data } = await api.get<User>("/profile");
  return data;
}

export async function updateProfile(body: UpdateProfileInput): Promise<User> {
  const { data } = await api.put<User>("/profile", body);
  return data;
}
