import { randomInt } from "node:crypto";
import { JWTPayloadSpec } from "@elysiajs/jwt";
import { Elysia, t } from "elysia";
import { BaseHtml } from "../components/base";
import { Header } from "../components/header";
import { getAllTargets } from "../converters/main";
import db from "../db/db";
import { User } from "../db/types";
import {
  ACCOUNT_REGISTRATION,
  ALLOW_UNAUTHENTICATED,
  HIDE_HISTORY,
  HTTP_ALLOWED,
  UNAUTHENTICATED_USER_SHARING,
  WEBROOT,
} from "../helpers/env";
import { FIRST_RUN, userService } from "./user";

export const root = new Elysia().use(userService).get(
  "/",
  async ({ jwt, redirect, cookie: { auth, jobId } }) => {
    if (!ALLOW_UNAUTHENTICATED) {
      if (FIRST_RUN) {
        return redirect(`${WEBROOT}/setup`, 302);
      }

      if (!auth?.value) {
        return redirect(`${WEBROOT}/login`, 302);
      }
    }

    // validate jwt
    let user: ({ id: string } & JWTPayloadSpec) | false = false;
    if (ALLOW_UNAUTHENTICATED) {
      const newUserId = String(
        UNAUTHENTICATED_USER_SHARING
          ? 0
          : randomInt(2 ** 24, Math.min(2 ** 48 + 2 ** 24 - 1, Number.MAX_SAFE_INTEGER)),
      );
      const accessToken = await jwt.sign({
        id: newUserId,
      });

      user = { id: newUserId };
      if (!auth) {
        return {
          message: "No auth cookie, perhaps your browser is blocking cookies.",
        };
      }

      // set cookie
      auth.set({
        value: accessToken,
        httpOnly: true,
        secure: !HTTP_ALLOWED,
        maxAge: 24 * 60 * 60,
        sameSite: "strict",
      });
    } else if (auth?.value) {
      user = await jwt.verify(auth.value);

      if (
        user !== false &&
        user.id &&
        (Number.parseInt(user.id) < 2 ** 24 || !ALLOW_UNAUTHENTICATED)
      ) {
        // Make sure user exists in db
        const existingUser = db.query("SELECT * FROM users WHERE id = ?").as(User).get(user.id);

        if (!existingUser) {
          if (auth?.value) {
            auth.remove();
          }
          return redirect(`${WEBROOT}/login`, 302);
        }
      }
    }

    if (!user) {
      return redirect(`${WEBROOT}/login`, 302);
    }

    // create a new job
    db.query("INSERT INTO jobs (user_id, date_created) VALUES (?, ?)").run(
      user.id,
      new Date().toISOString(),
    );

    const { id } = db
      .query("SELECT id FROM jobs WHERE user_id = ? ORDER BY id DESC")
      .get(user.id) as { id: number };

    if (!jobId) {
      return { message: "Cookies should be enabled to use this app." };
    }

    jobId.set({
      value: id,
      httpOnly: true,
      secure: !HTTP_ALLOWED,
      maxAge: 24 * 60 * 60,
      sameSite: "strict",
    });

    console.log("jobId set to:", id);

    return (
      <BaseHtml webroot={WEBROOT}>
        <>
          <Header
            webroot={WEBROOT}
            accountRegistration={ACCOUNT_REGISTRATION}
            allowUnauthenticated={ALLOW_UNAUTHENTICATED}
            hideHistory={HIDE_HISTORY}
            loggedIn
          />
          <main class="w-full flex-1 px-4 py-8">
            <div class="mx-auto max-w-4xl">
              <div class="mb-8 text-center">
                <h1 class="mb-2 text-3xl font-bold text-neutral-100">Convert Files</h1>
                <p class="text-neutral-400">Upload your files and convert them to any format</p>
              </div>

              <div class="mb-6 card">
                <div
                  id="dropzone"
                  class={`
                    relative flex h-48 w-full items-center justify-center rounded-lg border-2
                    border-dashed border-(--border-strong) transition-all
                    hover:border-accent-500
                    [&.dragover]:border-4 [&.dragover]:border-accent-500
                  `}
                >
                  <div class="text-center">
                    <div class="mb-2 text-4xl">📁</div>
                    <p class="text-neutral-300">
                      <b class="text-accent-500">Choose a file</b> or drag it here
                    </p>
                  </div>
                  <input
                    type="file"
                    name="file"
                    multiple
                    class="absolute inset-0 size-full cursor-pointer opacity-0"
                  />
                </div>
              </div>

              <div class="mb-6 scrollbar-thin max-h-[40vh] overflow-y-auto card">
                <table
                  id="file-list"
                  class={`
                    w-full table-auto
                    [&_td]:p-3
                    [&_td]:first:max-w-[30vw] [&_td]:first:truncate
                    [&_tr]:border-b [&_tr]:border-(--border-subtle)
                  `}
                />
              </div>

              <form method="post" action={`${WEBROOT}/convert`} class="relative mb-20">
                <input type="hidden" name="file_names" id="file_names" />
                <div class="mb-4 card">
                  <input
                    type="search"
                    name="convert_to_search"
                    placeholder="Search for conversions..."
                    autocomplete="off"
                    class="mb-3 input"
                  />
                  <div class="select_container relative">
                    <article
                      class={`
                        convert_to_popup absolute z-20 m-0 hidden h-[30vh] max-h-[50vh] w-full
                        flex-col overflow-x-hidden overflow-y-auto rounded-lg border
                        border-(--border-default) bg-(--surface-raised)
                        sm:h-[30vh]
                      `}
                    >
                      {Object.entries(getAllTargets()).map(([converter, targets]) => (
                        <article
                          class={`
                            convert_to_group flex w-full flex-col border-b border-(--border-subtle)
                            p-4
                          `}
                          data-converter={converter}
                        >
                          <header
                            class="
                              mb-2 w-full text-sm font-bold tracking-wide text-accent-500 uppercase
                            "
                            safe
                          >
                            {converter}
                          </header>
                          <ul class={`convert_to_target flex flex-row flex-wrap gap-1`}>
                            {targets.map((target) => (
                              <button
                                tabindex={0}
                                class={`
                                  target rounded-md bg-(--surface-overlay) px-3 py-1.5 text-sm
                                  transition-all
                                  hover:bg-accent-500 hover:text-contrast
                                `}
                                data-value={`${target},${converter}`}
                                data-target={target}
                                data-converter={converter}
                                type="button"
                                safe
                              >
                                {target}
                              </button>
                            ))}
                          </ul>
                        </article>
                      ))}
                    </article>

                    <select name="convert_to" aria-label="Convert to" required hidden>
                      <option selected disabled value="">
                        Convert to
                      </option>
                      {Object.entries(getAllTargets()).map(([converter, targets]) => (
                        <optgroup label={converter}>
                          {targets.map((target) => (
                            <option value={`${target},${converter}`} safe>
                              {target}
                            </option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                  </div>
                </div>
                <input
                  class={`
                    w-full btn-primary text-lg
                    disabled:cursor-not-allowed disabled:opacity-40
                  `}
                  type="submit"
                  value="Convert"
                  disabled
                />
              </form>
            </div>
          </main>
          <script src="script.js" defer />
        </>
      </BaseHtml>
    );
  },
  {
    cookie: t.Cookie({
      auth: t.Optional(t.String()),
      jobId: t.Optional(t.String()),
    }),
  },
);
