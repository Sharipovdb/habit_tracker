const DEFAULT_CLIENT_ORIGINS = ["http://localhost:3000", "http://localhost:5173"];

function escapeRegex(value: string) {
  return value.replace(/[|\\{}()[\]^$+?.]/g, "\\$&");
}

function wildcardToRegex(pattern: string) {
  const regexSource = pattern
    .split("*")
    .map((segment) => escapeRegex(segment).replace(/\\\?/g, "."))
    .join(".*");

  return new RegExp(`^${regexSource}$`);
}

export function getConfiguredClientOrigins() {
  const configuredOrigins = (process.env.CLIENT_ORIGIN ?? DEFAULT_CLIENT_ORIGINS.join(","))
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  return Array.from(new Set([...DEFAULT_CLIENT_ORIGINS, ...configuredOrigins]));
}

export function isAllowedOrigin(origin: string) {
  return getConfiguredClientOrigins().some((allowedOrigin) => {
    if (allowedOrigin.includes("*") || allowedOrigin.includes("?")) {
      return wildcardToRegex(allowedOrigin).test(origin);
    }

    return allowedOrigin === origin;
  });
}