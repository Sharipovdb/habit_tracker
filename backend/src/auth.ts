import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import bcrypt from "bcryptjs";
import { betterAuth } from "better-auth";
import { toNodeHandler } from "better-auth/node";
import { and, eq, isNotNull, isNull } from "drizzle-orm";
import { db } from "./db/index.js";
import { accounts, users, sessions, verifications } from "./db/schema.js";
import {
  hashPassword as scryptHash,
  verifyPassword as scryptVerify,
} from "@better-auth/utils/password";

function getTrustedOrigins() {
  const configuredOrigins = (process.env.CLIENT_ORIGIN ?? "http://localhost:5173")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  return Array.from(new Set(["http://localhost:3000", ...configuredOrigins]));
}

function isBcryptHash(hash: string) {
  return /^\$2[aby]?\$/.test(hash);
}

async function verifyPasswordWithLegacyFallback({
  hash,
  password,
}: {
  hash: string;
  password: string;
}): Promise<boolean> {
  if (isBcryptHash(hash)) {
    const valid = await bcrypt.compare(password, hash);
    if (valid) {
      // Re-hash with scrypt so future logins use the native format
      const newHash = await scryptHash(password);
      await db
        .update(accounts)
        .set({ password: newHash })
        .where(eq(accounts.password, hash));
    }
    return valid;
  }
  return scryptVerify(hash, password);
}

export const auth = betterAuth({
  appName: "HabitTracker",
  baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
  trustedOrigins: getTrustedOrigins(),
  database: drizzleAdapter(db, {
    provider: "pg",
    usePlural: false,
    schema: {
      users,
      sessions,
      accounts,
      verifications,
      user: users,
      session: sessions,
      account: accounts,
      verification: verifications,
    },
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 6,
    password: {
      verify: verifyPasswordWithLegacyFallback,
    },
  },
  user: {
    modelName: "users",
  },
  session: {
    modelName: "sessions",
  },
  account: {
    modelName: "accounts",
  },
  verification: {
    modelName: "verifications",
  },
  advanced: {
    database: {
      generateId: "uuid",
    },
  },
  telemetry: {
    enabled: false,
  },
});

export const authNodeHandler = toNodeHandler(auth);

export type AuthSession = NonNullable<Awaited<ReturnType<typeof auth.api.getSession>>>;

export async function syncLegacyCredentialAccounts() {
  const legacyUsers = await db
    .select({
      userId: users.id,
      passwordHash: users.legacyPassword,
    })
    .from(users)
    .leftJoin(
      accounts,
      and(eq(accounts.userId, users.id), eq(accounts.providerId, "credential"))
    )
    .where(and(isNotNull(users.legacyPassword), isNull(accounts.id)));

  if (legacyUsers.length === 0) {
    return;
  }

  await db.insert(accounts).values(
    legacyUsers.map((user) => ({
      id: crypto.randomUUID(),
      accountId: user.userId,
      providerId: "credential",
      userId: user.userId,
      password: user.passwordHash,
      createdAt: new Date(),
      updatedAt: new Date(),
    }))
  );
}