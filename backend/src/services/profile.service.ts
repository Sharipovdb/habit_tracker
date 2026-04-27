import { db } from "../db/index.js";
import { users } from "../db/schema.js";
import { eq } from "drizzle-orm";
import type { UpdateProfileInput } from "@shared";

export async function getProfile(userId: string) {
  const [user] = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      age: users.age,
      height: users.height,
      weight: users.weight,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.id, userId));
  return user || null;
}

export async function updateProfile(
  userId: string,
  data: UpdateProfileInput
) {
  // Filter out undefined/null values to avoid empty SET clause
  const cleanData: Record<string, string | number> = {};
  if (data.name !== undefined && data.name !== null) cleanData.name = data.name;
  if (data.age !== undefined && data.age !== null) cleanData.age = data.age;
  if (data.height !== undefined && data.height !== null) cleanData.height = data.height;
  if (data.weight !== undefined && data.weight !== null) cleanData.weight = data.weight;

  if (Object.keys(cleanData).length === 0) {
    return getProfile(userId);
  }

  const [updated] = await db
    .update(users)
    .set(cleanData)
    .where(eq(users.id, userId))
    .returning({
      id: users.id,
      email: users.email,
      name: users.name,
      age: users.age,
      height: users.height,
      weight: users.weight,
      createdAt: users.createdAt,
    });
  return updated || null;
}
