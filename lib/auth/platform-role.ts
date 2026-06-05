export type PlatformRole = "user" | "admin";

export function getPlatformRole(user: { role?: string | null }): PlatformRole {
  return user.role === "admin" ? "admin" : "user";
}
