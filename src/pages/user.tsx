import { randomUUID } from "node:crypto";
import { jwt } from "@elysiajs/jwt";
import { Elysia, t } from "elysia";
import { BaseHtml } from "../components/base";
import { Header } from "../components/header";
import db from "../db/db";
import { User } from "../db/types";
import {
  ACCOUNT_REGISTRATION,
  ALLOW_UNAUTHENTICATED,
  HIDE_HISTORY,
  HTTP_ALLOWED,
  WEBROOT,
} from "../helpers/env";

export let FIRST_RUN = db.query("SELECT * FROM users").get() === null || false;

export const userService = new Elysia({ name: "user/service" })
  .use(
    jwt({
      name: "jwt",
      schema: t.Object({
        id: t.String(),
      }),
      secret: process.env.JWT_SECRET ?? randomUUID(),
      exp: "7d",
    }),
  )
  .model({
    signIn: t.Object({
      email: t.String(),
      password: t.String(),
    }),
    session: t.Cookie({
      auth: t.String(),
      jobId: t.Optional(t.String()),
    }),
    optionalSession: t.Cookie({
      auth: t.Optional(t.String()),
      jobId: t.Optional(t.String()),
    }),
  })
  .macro("auth", {
    cookie: "session",
    async resolve({ status, jwt, cookie: { auth } }) {
      if (!auth?.value) {
        return status(401, {
          success: false,
          message: "Unauthorized",
        });
      }
      const user = await jwt.verify(auth.value as string);
      if (!user) {
        return status(401, {
          success: false,
          message: "Unauthorized",
        });
      }
      return {
        success: true,
        user,
      };
    },
  });

export const user = new Elysia()
  .use(userService)
  .get("/setup", ({ redirect }) => {
    if (!FIRST_RUN) {
      return redirect(`${WEBROOT}/login`, 302);
    }

    return (
      <BaseHtml title="Convertor King | Setup" webroot={WEBROOT}>
        <main class="flex w-full flex-1 items-center justify-center px-4 py-8">
          <div class="w-full max-w-md">
            <div class="mb-6 text-center">
              <h1 class="mb-2 text-3xl font-bold text-neutral-100">Welcome to Convertor King!</h1>
              <p class="text-neutral-400">Create your admin account to get started</p>
            </div>
            <div class="card">
              <form method="post" action={`${WEBROOT}/register`} class="flex flex-col gap-4">
                <label class="flex flex-col gap-1.5">
                  <span class="text-sm font-medium text-neutral-300">Email</span>
                  <input
                    type="email"
                    name="email"
                    class="input"
                    placeholder="you@example.com"
                    autocomplete="email"
                    required
                  />
                </label>
                <label class="flex flex-col gap-1.5">
                  <span class="text-sm font-medium text-neutral-300">Password</span>
                  <input
                    type="password"
                    name="password"
                    class="input"
                    placeholder="••••••••"
                    autocomplete="current-password"
                    required
                  />
                </label>
                <input type="submit" value="Create account" class="mt-2 btn-primary" />
              </form>
              <div
                class="
                  mt-4 border-t border-(--border-subtle) pt-4 text-center text-sm text-neutral-500
                "
              >
                Report issues on{" "}
                <a
                  class="
                    text-accent-500 transition-colors
                    hover:text-accent-400
                  "
                  href="https://github.com/C4illin/ConvertX"
                >
                  GitHub
                </a>
              </div>
            </div>
          </div>
        </main>
      </BaseHtml>
    );
  })
  .get("/register", ({ redirect }) => {
    if (!ACCOUNT_REGISTRATION) {
      return redirect(`${WEBROOT}/login`, 302);
    }

    return (
      <BaseHtml webroot={WEBROOT} title="Convertor King | Register">
        <>
          <Header
            webroot={WEBROOT}
            accountRegistration={ACCOUNT_REGISTRATION}
            allowUnauthenticated={ALLOW_UNAUTHENTICATED}
            hideHistory={HIDE_HISTORY}
          />
          <main class="flex w-full flex-1 items-center justify-center px-4 py-8">
            <div class="w-full max-w-md">
              <div class="card">
                <h2 class="mb-4 text-xl font-bold text-neutral-100">Create an account</h2>
                <form method="post" class="flex flex-col gap-4">
                  <label class="flex flex-col gap-1.5">
                    <span class="text-sm font-medium text-neutral-300">Email</span>
                    <input
                      type="email"
                      name="email"
                      class="input"
                      placeholder="you@example.com"
                      autocomplete="email"
                      required
                    />
                  </label>
                  <label class="flex flex-col gap-1.5">
                    <span class="text-sm font-medium text-neutral-300">Password</span>
                    <input
                      type="password"
                      name="password"
                      class="input"
                      placeholder="••••••••"
                      autocomplete="current-password"
                      required
                    />
                  </label>
                  <input type="submit" value="Register" class="mt-2 w-full btn-primary" />
                </form>
              </div>
            </div>
          </main>
        </>
      </BaseHtml>
    );
  })
  .post(
    "/register",
    async ({ body: { email, password }, set, redirect, jwt, cookie: { auth } }) => {
      if (!ACCOUNT_REGISTRATION && !FIRST_RUN) {
        return redirect(`${WEBROOT}/login`, 302);
      }

      if (FIRST_RUN) {
        FIRST_RUN = false;
      }

      const existingUser = await db.query("SELECT * FROM users WHERE email = ?").get(email);
      if (existingUser) {
        set.status = 400;
        return {
          message: "Email already in use.",
        };
      }
      const savedPassword = await Bun.password.hash(password);

      db.query("INSERT INTO users (email, password) VALUES (?, ?)").run(email, savedPassword);

      const user = db.query("SELECT * FROM users WHERE email = ?").as(User).get(email);

      if (!user) {
        set.status = 500;
        return {
          message: "Failed to create user.",
        };
      }

      const accessToken = await jwt.sign({
        id: String(user.id),
      });

      if (!auth) {
        set.status = 500;
        return {
          message: "No auth cookie, perhaps your browser is blocking cookies.",
        };
      }

      // set cookie
      auth.set({
        value: accessToken,
        httpOnly: true,
        secure: !HTTP_ALLOWED,
        maxAge: 60 * 60 * 24 * 7,
        sameSite: "strict",
      });

      return redirect(`${WEBROOT}/`, 302);
    },
    { body: "signIn" },
  )
  .get(
    "/login",
    async ({ jwt, redirect, cookie: { auth } }) => {
      if (FIRST_RUN) {
        return redirect(`${WEBROOT}/setup`, 302);
      }

      // if already logged in, redirect to home
      if (auth?.value) {
        const user = await jwt.verify(auth.value);

        if (user) {
          return redirect(`${WEBROOT}/`, 302);
        }

        auth.remove();
      }

      return (
        <BaseHtml webroot={WEBROOT} title="Convertor King | Login">
          <>
            <Header
              webroot={WEBROOT}
              accountRegistration={ACCOUNT_REGISTRATION}
              allowUnauthenticated={ALLOW_UNAUTHENTICATED}
              hideHistory={HIDE_HISTORY}
            />
            <main class="flex w-full flex-1 items-center justify-center px-4 py-8">
              <div class="w-full max-w-md">
                <div class="card">
                  <h2 class="mb-4 text-xl font-bold text-neutral-100">Welcome back</h2>
                  <form method="post" class="flex flex-col gap-4">
                    <label class="flex flex-col gap-1.5">
                      <span class="text-sm font-medium text-neutral-300">Email</span>
                      <input
                        type="email"
                        name="email"
                        class="input"
                        placeholder="you@example.com"
                        autocomplete="email"
                        required
                      />
                    </label>
                    <label class="flex flex-col gap-1.5">
                      <span class="text-sm font-medium text-neutral-300">Password</span>
                      <input
                        type="password"
                        name="password"
                        class="input"
                        placeholder="••••••••"
                        autocomplete="current-password"
                        required
                      />
                    </label>
                    <div class="flex flex-row gap-3">
                      {ACCOUNT_REGISTRATION ? (
                        <a
                          href={`${WEBROOT}/register`}
                          role="button"
                          class="btn-secondary text-center"
                        >
                          Register
                        </a>
                      ) : null}
                      <input type="submit" value="Login" class="flex-1 btn-primary" />
                    </div>
                  </form>
                </div>
              </div>
            </main>
          </>
        </BaseHtml>
      );
    },
    { body: "signIn", cookie: "optionalSession" },
  )
  .post(
    "/login",
    async function handler({ body, set, redirect, jwt, cookie: { auth } }) {
      const existingUser = db.query("SELECT * FROM users WHERE email = ?").as(User).get(body.email);

      if (!existingUser) {
        set.status = 403;
        return {
          message: "Invalid credentials.",
        };
      }

      const validPassword = await Bun.password.verify(body.password, existingUser.password);

      if (!validPassword) {
        set.status = 403;
        return {
          message: "Invalid credentials.",
        };
      }

      const accessToken = await jwt.sign({
        id: String(existingUser.id),
      });

      if (!auth) {
        set.status = 500;
        return {
          message: "No auth cookie, perhaps your browser is blocking cookies.",
        };
      }

      // set cookie
      auth.set({
        value: accessToken,
        httpOnly: true,
        secure: !HTTP_ALLOWED,
        maxAge: 60 * 60 * 24 * 7,
        sameSite: "strict",
      });

      return redirect(`${WEBROOT}/`, 302);
    },
    { body: "signIn" },
  )
  .get("/logoff", ({ redirect, cookie: { auth } }) => {
    if (auth?.value) {
      auth.remove();
    }

    return redirect(`${WEBROOT}/login`, 302);
  })
  .post("/logoff", ({ redirect, cookie: { auth } }) => {
    if (auth?.value) {
      auth.remove();
    }

    return redirect(`${WEBROOT}/login`, 302);
  })
  .get(
    "/account",
    async ({ user, redirect }) => {
      if (!user) {
        return redirect(`${WEBROOT}/`, 302);
      }

      const userData = db.query("SELECT * FROM users WHERE id = ?").as(User).get(user.id);

      if (!userData) {
        return redirect(`${WEBROOT}/`, 302);
      }

      return (
        <BaseHtml webroot={WEBROOT} title="Convertor King | Account">
          <>
            <Header
              webroot={WEBROOT}
              accountRegistration={ACCOUNT_REGISTRATION}
              allowUnauthenticated={ALLOW_UNAUTHENTICATED}
              hideHistory={HIDE_HISTORY}
              loggedIn
            />
            <main class="flex w-full flex-1 items-center justify-center px-4 py-8">
              <div class="w-full max-w-md">
                <div class="card">
                  <h2 class="mb-4 text-xl font-bold text-neutral-100">Account Settings</h2>
                  <form method="post" class="flex flex-col gap-4">
                    <label class="flex flex-col gap-1.5">
                      <span class="text-sm font-medium text-neutral-300">Email</span>
                      <input
                        type="email"
                        name="email"
                        class="input"
                        placeholder="you@example.com"
                        autocomplete="email"
                        value={userData.email}
                        required
                      />
                    </label>
                    <label class="flex flex-col gap-1.5">
                      <span class="text-sm font-medium text-neutral-300">
                        New Password (leave blank for unchanged)
                      </span>
                      <input
                        type="password"
                        name="newPassword"
                        class="input"
                        placeholder="••••••••"
                        autocomplete="new-password"
                      />
                    </label>
                    <label class="flex flex-col gap-1.5">
                      <span class="text-sm font-medium text-neutral-300">Current Password</span>
                      <input
                        type="password"
                        name="password"
                        class="input"
                        placeholder="••••••••"
                        autocomplete="current-password"
                        required
                      />
                    </label>
                    <div role="group">
                      <input type="submit" value="Update" class="w-full btn-primary" />
                    </div>
                  </form>
                </div>
              </div>
            </main>
          </>
        </BaseHtml>
      );
    },
    {
      auth: true,
    },
  )
  .post(
    "/account",
    async function handler({ body, set, redirect, jwt, cookie: { auth } }) {
      if (!auth?.value) {
        return redirect(`${WEBROOT}/login`, 302);
      }

      const user = await jwt.verify(auth.value);
      if (!user) {
        return redirect(`${WEBROOT}/login`, 302);
      }
      const existingUser = db.query("SELECT * FROM users WHERE id = ?").as(User).get(user.id);

      if (!existingUser) {
        if (auth?.value) {
          auth.remove();
        }
        return redirect(`${WEBROOT}/login`, 302);
      }

      const validPassword = await Bun.password.verify(body.password, existingUser.password);

      if (!validPassword) {
        set.status = 403;
        return {
          message: "Invalid credentials.",
        };
      }

      const fields = [];
      const values = [];

      if (body.email) {
        const existingUser = await db
          .query("SELECT id FROM users WHERE email = ?")
          .as(User)
          .get(body.email);
        if (existingUser && existingUser.id.toString() !== user.id) {
          set.status = 409;
          return { message: "Email already in use." };
        }
        fields.push("email");
        values.push(body.email);
      }
      if (body.newPassword) {
        fields.push("password");
        values.push(await Bun.password.hash(body.newPassword));
      }

      if (fields.length > 0) {
        db.query(
          `UPDATE users SET ${fields.map((field) => `${field}=?`).join(", ")} WHERE id=?`,
        ).run(...values, user.id);
      }

      return redirect(`${WEBROOT}/`, 302);
    },
    {
      body: t.Object({
        email: t.MaybeEmpty(t.String()),
        newPassword: t.MaybeEmpty(t.String()),
        password: t.String(),
      }),
      cookie: "session",
    },
  );
