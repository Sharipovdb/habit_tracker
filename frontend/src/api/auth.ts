import { authClient } from "../lib/auth-client";

function unwrapAuthResult<T>(result: { data: T | null; error: { message?: string } | null }, fallback: string) {
  if (result.error || !result.data) {
    throw new Error(result.error?.message || fallback);
  }

  return result.data;
}

export async function registerUser(name: string, email: string, password: string) {
  const result = await authClient.signUp.email({
    name,
    email,
    password,
  });

  return unwrapAuthResult(result, "Registration failed");
}

export async function loginUser(email: string, password: string) {
  const result = await authClient.signIn.email({
    email,
    password,
  });

  return unwrapAuthResult(result, "Login failed");
}

export async function logoutUser() {
  const result = await authClient.signOut();

  if (result.error) {
    throw new Error(result.error.message || "Logout failed");
  }
}
