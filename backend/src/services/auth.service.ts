import { db } from "../db";
import { users } from "../db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";

const SALT_ROUNDS = 10;

export async function createUser(email: string, password: string) {
  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
  const [user] = await db
    .insert(users)
    .values({ email, password: hashedPassword })
    .returning({ id: users.id, email: users.email, createdAt: users.createdAt });
  return user;
}

export async function findUserByEmail(email: string) {
  const [user] = await db.select().from(users).where(eq(users.email, email));
  return user || null;
}

export async function verifyPassword(plain: string, hashed: string) {
  return bcrypt.compare(plain, hashed);
}
