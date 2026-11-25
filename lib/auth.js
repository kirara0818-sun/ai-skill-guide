import { createNeonAuth } from "@neon/auth/next/server";

let instance;
export function auth() {
  instance ??= createNeonAuth({
    baseUrl: process.env.NEON_AUTH_BASE_URL,
    cookies: { secret: process.env.NEON_AUTH_COOKIE_SECRET },
  });
  return instance;
}
