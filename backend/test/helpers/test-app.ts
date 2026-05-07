/**
 * Minimal Fastify application used for integration tests.
 *
 * It registers all API routes with a mock `authenticate` hook so that
 * no real database connection or better-auth instance is required.
 * Individual test files mock the service layer via `vi.mock(...)` so only
 * the HTTP/controller layer is exercised.
 */
import Fastify, { type FastifyInstance, type FastifyReply, type FastifyRequest } from "fastify";
import fp from "fastify-plugin";
import habitRoutes from "../../src/routes/habit.routes.js";
import logRoutes from "../../src/routes/log.routes.js";
import profileRoutes from "../../src/routes/profile.routes.js";
import dashboardRoutes from "../../src/routes/dashboard.routes.js";

export const TEST_USER_ID = "00000000-0000-0000-0000-000000000001";

// A minimal fake session that satisfies `request.authSession.user.id` access
// in every controller without referencing the real `better-auth` types.
export const FAKE_SESSION = {
  user: {
    id: TEST_USER_ID,
    email: "test@example.com",
    name: "Test User",
    emailVerified: false,
    createdAt: new Date("2024-01-01T00:00:00.000Z"),
    updatedAt: new Date("2024-01-01T00:00:00.000Z"),
    image: null as string | null,
  },
  session: {
    id: "test-session-id",
    userId: TEST_USER_ID,
    token: "test-token",
    expiresAt: new Date("2099-01-01T00:00:00.000Z"),
    createdAt: new Date("2024-01-01T00:00:00.000Z"),
    updatedAt: new Date("2024-01-01T00:00:00.000Z"),
    ipAddress: null as string | null,
    userAgent: null as string | null,
  },
};

/** Fastify plugin that decorates the instance with a mock `authenticate` hook. */
const mockAuthPlugin = fp(async (fastify: FastifyInstance) => {
  fastify.decorate(
    "authenticate",
    async (request: FastifyRequest, _reply: FastifyReply) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (request as any).authSession = FAKE_SESSION;
    },
  );
});

/** Fastify plugin that replaces `authenticate` with a hook that always returns 401. */
const unauthenticatedPlugin = fp(async (fastify: FastifyInstance) => {
  fastify.decorate(
    "authenticate",
    async (_request: FastifyRequest, reply: FastifyReply) => {
      return reply.status(401).send({ error: "Unauthorized" });
    },
  );
});

export interface BuildTestAppOptions {
  /** When false, the authenticate hook will always return 401. Default: true */
  authenticated?: boolean;
}

export async function buildTestApp(
  options: BuildTestAppOptions = {},
): Promise<FastifyInstance> {
  const { authenticated = true } = options;

  const fastify = Fastify({ logger: false });

  fastify.register(authenticated ? mockAuthPlugin : unauthenticatedPlugin);

  fastify.register(habitRoutes, { prefix: "/api/habits" });
  fastify.register(logRoutes, { prefix: "/api/habits" });
  fastify.register(profileRoutes, { prefix: "/api/profile" });
  fastify.register(dashboardRoutes, { prefix: "/api/dashboard" });

  await fastify.ready();
  return fastify;
}
