import { Elysia } from "elysia";
import { WEBROOT } from "../helpers/env";

export const theme = new Elysia().post("/set-theme", ({ cookie, body, set }) => {
  const theme = (body as { theme?: string })?.theme;
  if (theme === "dark" || theme === "light") {
    cookie.theme = {
      value: theme,
      path: WEBROOT || "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
    };
    set.status = 200;
    return { ok: true };
  }
  set.status = 400;
  return { ok: false, error: "Invalid theme" };
});
