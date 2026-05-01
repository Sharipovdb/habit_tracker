import { db } from "../db/index.js";
import { users } from "../db/schema.js";
import { eq } from "drizzle-orm";
import type { UpdateProfileInput } from "@shared";

const profileFields = {
  id: users.id,
  email: users.email,
  notificationEmail: users.notificationEmail,
  reminderEnabled: users.reminderEnabled,
  timezone: users.timezone,
  name: users.name,
  image: users.image,
  age: users.age,
  height: users.height,
  weight: users.weight,
  createdAt: users.createdAt,
};

export async function getProfile(userId: string) {
  const [user] = await db
    .select(profileFields)
    .from(users)
    .where(eq(users.id, userId));
  return user || null;
}

export async function updateProfile(
  userId: string,
  data: UpdateProfileInput
) {
  // Filter out undefined/null values to avoid empty SET clause
  const cleanData: Record<string, string | number | boolean | null> = {};
  if (data.name !== undefined && data.name !== null) cleanData.name = data.name;
  if (data.age !== undefined && data.age !== null) cleanData.age = data.age;
  if (data.height !== undefined && data.height !== null) cleanData.height = data.height;
  if (data.weight !== undefined && data.weight !== null) cleanData.weight = data.weight;
  if (data.notificationEmail !== undefined) {
    const normalizedEmail = typeof data.notificationEmail === "string"
      ? data.notificationEmail.trim().toLowerCase()
      : null;
    cleanData.notificationEmail = normalizedEmail || null;
  }
  if (data.reminderEnabled !== undefined) cleanData.reminderEnabled = data.reminderEnabled;
  if (data.timezone !== undefined && data.timezone !== null) {
    const normalizedTimeZone = data.timezone.trim();
    if (normalizedTimeZone) {
      cleanData.timezone = normalizedTimeZone;
    }
  }

  if (Object.keys(cleanData).length === 0) {
    return getProfile(userId);
  }

  const [updated] = await db
    .update(users)
    .set(cleanData)
    .where(eq(users.id, userId))
    .returning(profileFields);

  return updated || null;
}

export async function setProfileImage(userId: string, image: string | null) {
  const [updated] = await db
    .update(users)
    .set({ image })
    .where(eq(users.id, userId))
    .returning(profileFields);
  return updated || null;
}
