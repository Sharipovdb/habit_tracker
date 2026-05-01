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

export async function uploadProfileAvatar(file: File): Promise<User> {
  const body = new FormData();
  body.append("avatar", file);

  const { data } = await api.post<User>("/profile/avatar", body);
  return data;
}

export async function deleteProfileAvatar(): Promise<User> {
  const { data } = await api.delete<User>("/profile/avatar");
  return data;
}
