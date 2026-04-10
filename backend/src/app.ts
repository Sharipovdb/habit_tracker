import Fastify from "fastify";
import corsPlugin from "./plugins/cors";
import jwtPlugin from "./plugins/jwt";
import authRoutes from "./routes/auth.routes";
import habitRoutes from "./routes/habit.routes";
import logRoutes from "./routes/log.routes";
import profileRoutes from "./routes/profile.routes";
import dashboardRoutes from "./routes/dashboard.routes";

export function buildApp() {
  const fastify = Fastify({
    logger: true,
  });

  // Plugins
  fastify.register(corsPlugin);
  fastify.register(jwtPlugin);

  // Routes
  fastify.get("/", async () => ({
    status: "ok",
    message: "HabitTracker API is running",
    endpoints: ["/test", "/api/auth", "/api/profile", "/api/dashboard", "/api/habits"],
  }));
  fastify.get("/test", async () => ({ status: "ok", timestamp: new Date().toISOString() }));
  fastify.register(authRoutes, { prefix: "/api/auth" });
  fastify.register(profileRoutes, { prefix: "/api/profile" });
  fastify.register(dashboardRoutes, { prefix: "/api/dashboard" });
  fastify.register(habitRoutes, { prefix: "/api/habits" });
  fastify.register(logRoutes, { prefix: "/api/habits" });

  return fastify;
}
