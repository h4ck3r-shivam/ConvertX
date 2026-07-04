import { randomUUID } from "node:crypto";
import { mkdir } from "node:fs/promises";
import { Elysia, t } from "elysia";
import sanitize from "sanitize-filename";
import db from "../db/db";
import { Filename, Jobs, User } from "../db/types";
import { getAllInputs, getAllTargets, getPossibleTargets, handleConvert } from "../converters/main";
import { normalizeFiletype } from "../helpers/normalizeFiletype";
import {
  ACCOUNT_REGISTRATION,
  ALLOW_UNAUTHENTICATED,
  HIDE_HISTORY,
  HTTP_ALLOWED,
} from "../helpers/env";
import { uploadsDir, outputDir } from "../index";
import { userService, FIRST_RUN } from "../pages/user";

// ===== API Token Auth Macro =====
// Mobile apps use Authorization: Bearer <token>
// Web app continues to use cookies
// This macro supports both transparently.

export const api = new Elysia({ prefix: "/api/v1" })
  .use(userService)
  .model({
    signIn: t.Object({
      email: t.String(),
      password: t.String(),
    }),
    accountUpdate: t.Object({
      email: t.MaybeEmpty(t.String()),
      newPassword: t.MaybeEmpty(t.String()),
      password: t.String(),
    }),
    convertRequest: t.Object({
      convert_to: t.String(),
      file_names: t.String(),
    }),
    conversionsRequest: t.Object({
      fileType: t.String(),
    }),
    deleteJobs: t.Object({
      jobIds: t.Array(t.String(), { maxItems: 100 }),
    }),
  })
  .macro("apiAuth", {
    cookie: "optionalSession",
    async resolve({ status, jwt, cookie: { auth }, headers }) {
      // Try cookie first (web), then Authorization header (mobile)
      let token: string | undefined = auth?.value as string | undefined;

      if (!token) {
        const authHeader = headers["authorization"];
        if (authHeader && authHeader.startsWith("Bearer ")) {
          token = authHeader.slice(7);
        }
      }

      if (!token) {
        return status(401, {
          success: false,
          error: "UNAUTHORIZED",
          message: "Authentication required.",
        });
      }

      const user = await jwt.verify(token as string);
      if (!user) {
        return status(401, {
          success: false,
          error: "INVALID_TOKEN",
          message: "Invalid or expired token.",
        });
      }

      return { success: true, user };
    },
  })

  // ============================================================
  // AUTH
  // ============================================================
  .post(
    "/auth/login",
    async ({ body, set, jwt }) => {
      const existingUser = db.query("SELECT * FROM users WHERE email = ?").as(User).get(body.email);

      if (!existingUser) {
        set.status = 403;
        return { success: false, error: "INVALID_CREDENTIALS", message: "Invalid credentials." };
      }

      const validPassword = await Bun.password.verify(body.password, existingUser.password);
      if (!validPassword) {
        set.status = 403;
        return { success: false, error: "INVALID_CREDENTIALS", message: "Invalid credentials." };
      }

      const token = await jwt.sign({ id: String(existingUser.id) });

      return {
        success: true,
        token,
        user: { id: existingUser.id, email: existingUser.email },
      };
    },
    { body: "signIn" },
  )
  .post(
    "/auth/register",
    async ({ body, set, jwt }) => {
      if (!ACCOUNT_REGISTRATION && !FIRST_RUN) {
        set.status = 403;
        return {
          success: false,
          error: "REGISTRATION_DISABLED",
          message: "Registration is disabled.",
        };
      }

      const existingUser = db.query("SELECT * FROM users WHERE email = ?").get(body.email);
      if (existingUser) {
        set.status = 409;
        return { success: false, error: "EMAIL_EXISTS", message: "Email already in use." };
      }

      const savedPassword = await Bun.password.hash(body.password);
      db.query("INSERT INTO users (email, password) VALUES (?, ?)").run(body.email, savedPassword);

      const user = db.query("SELECT * FROM users WHERE email = ?").as(User).get(body.email);
      if (!user) {
        set.status = 500;
        return { success: false, error: "INTERNAL_ERROR", message: "Failed to create user." };
      }

      const token = await jwt.sign({ id: String(user.id) });

      return {
        success: true,
        token,
        user: { id: user.id, email: user.email },
      };
    },
    { body: "signIn" },
  )
  .get(
    "/auth/me",
    async ({ user, set }) => {
      if (!user) {
        set.status = 401;
        return { success: false, error: "UNAUTHORIZED", message: "Authentication required." };
      }

      const userData = db.query("SELECT * FROM users WHERE id = ?").as(User).get(user.id);
      if (!userData) {
        set.status = 404;
        return { success: false, error: "USER_NOT_FOUND", message: "User not found." };
      }

      return {
        success: true,
        user: { id: userData.id, email: userData.email },
      };
    },
    { apiAuth: true },
  )
  .post(
    "/auth/account",
    async ({ user, body, set }) => {
      if (!user) {
        set.status = 401;
        return { success: false, error: "UNAUTHORIZED", message: "Authentication required." };
      }

      const existingUser = db.query("SELECT * FROM users WHERE id = ?").as(User).get(user.id);
      if (!existingUser) {
        set.status = 404;
        return { success: false, error: "USER_NOT_FOUND", message: "User not found." };
      }

      const validPassword = await Bun.password.verify(body.password, existingUser.password);
      if (!validPassword) {
        set.status = 403;
        return { success: false, error: "INVALID_CREDENTIALS", message: "Invalid credentials." };
      }

      const fields: string[] = [];
      const values: (string | number)[] = [];

      if (body.email) {
        const emailTaken = db
          .query("SELECT id FROM users WHERE email = ?")
          .as(User)
          .get(body.email);
        if (emailTaken && emailTaken.id.toString() !== user.id) {
          set.status = 409;
          return { success: false, error: "EMAIL_EXISTS", message: "Email already in use." };
        }
        fields.push("email");
        values.push(body.email);
      }

      if (body.newPassword) {
        fields.push("password");
        values.push(await Bun.password.hash(body.newPassword));
      }

      if (fields.length > 0) {
        db.query(`UPDATE users SET ${fields.map((f) => `${f}=?`).join(", ")} WHERE id=?`).run(
          ...values,
          user.id,
        );
      }

      return { success: true, message: "Account updated." };
    },
    { body: "accountUpdate", apiAuth: true },
  )

  // ============================================================
  // JOBS
  // ============================================================
  .post(
    "/jobs",
    async ({ user, set, cookie: { jobId } }) => {
      if (!user) {
        set.status = 401;
        return { success: false, error: "UNAUTHORIZED", message: "Authentication required." };
      }

      const newJobId = randomUUID();
      db.query(
        "INSERT INTO jobs (id, user_id, date_created, status, num_files) VALUES (?, ?, ?, ?, ?)",
      ).run(newJobId, user.id, new Date().toISOString(), "uploading", 0);

      // Set jobId cookie for web compatibility
      if (jobId) {
        jobId.set({
          value: newJobId,
          httpOnly: true,
          secure: !HTTP_ALLOWED,
          maxAge: 60 * 60,
          sameSite: "strict",
        });
      }

      return { success: true, jobId: newJobId };
    },
    { apiAuth: true },
  )
  .get(
    "/jobs",
    async ({ user, set }) => {
      if (!user) {
        set.status = 401;
        return { success: false, error: "UNAUTHORIZED", message: "Authentication required." };
      }

      let userJobs = db
        .query("SELECT * FROM jobs WHERE user_id = ?")
        .as(Jobs)
        .all(user.id)
        .reverse();

      for (const job of userJobs) {
        const files = db
          .query("SELECT * FROM file_names WHERE job_id = ?")
          .as(Filename)
          .all(job.id);
        job.finished_files = files.length;
        job.files_detailed = files;
      }

      userJobs = userJobs.filter((job) => job.num_files > 0);

      return { success: true, jobs: userJobs };
    },
    { apiAuth: true },
  )
  .get(
    "/jobs/:jobId",
    async ({ params, user, set }) => {
      if (!user) {
        set.status = 401;
        return { success: false, error: "UNAUTHORIZED", message: "Authentication required." };
      }

      const job = db
        .query("SELECT * FROM jobs WHERE user_id = ? AND id = ?")
        .as(Jobs)
        .get(user.id, params.jobId);

      if (!job) {
        set.status = 404;
        return { success: false, error: "JOB_NOT_FOUND", message: "Job not found." };
      }

      const files = db
        .query("SELECT * FROM file_names WHERE job_id = ?")
        .as(Filename)
        .all(params.jobId);
      job.finished_files = files.length;
      job.files_detailed = files;

      return { success: true, job, files };
    },
    { apiAuth: true },
  )
  .post(
    "/jobs/:jobId/upload",
    async ({ params, body, user, set }) => {
      if (!user) {
        set.status = 401;
        return { success: false, error: "UNAUTHORIZED", message: "Authentication required." };
      }

      const existingJob = db
        .query("SELECT * FROM jobs WHERE id = ? AND user_id = ?")
        .as(Jobs)
        .get(params.jobId, user.id);

      if (!existingJob) {
        set.status = 404;
        return { success: false, error: "JOB_NOT_FOUND", message: "Job not found." };
      }

      const userUploadsDir = `${uploadsDir}${user.id}/${params.jobId}/`;

      if (body?.file) {
        if (Array.isArray(body.file)) {
          for (const file of body.file) {
            const sanitized = sanitize(file.name);
            await Bun.write(`${userUploadsDir}${sanitized}`, file);
          }
        } else {
          const sanitized = sanitize(body.file["name"]);
          await Bun.write(`${userUploadsDir}${sanitized}`, body.file);
        }
      }

      return { success: true, message: "Files uploaded successfully." };
    },
    { body: t.Object({ file: t.Files() }), apiAuth: true },
  )
  .post(
    "/jobs/:jobId/convert",
    async ({ params, body, user, set }) => {
      if (!user) {
        set.status = 401;
        return { success: false, error: "UNAUTHORIZED", message: "Authentication required." };
      }

      const existingJob = db
        .query("SELECT * FROM jobs WHERE id = ? AND user_id = ?")
        .as(Jobs)
        .get(params.jobId, user.id);

      if (!existingJob) {
        set.status = 404;
        return { success: false, error: "JOB_NOT_FOUND", message: "Job not found." };
      }

      const userUploadsDir = `${uploadsDir}${user.id}/${params.jobId}/`;
      const userOutputDir = `${outputDir}${user.id}/${params.jobId}/`;

      try {
        await mkdir(userOutputDir, { recursive: true });
      } catch (error) {
        console.error(`Failed to create output directory: ${userOutputDir}.`, error);
      }

      const convertTo = normalizeFiletype(body.convert_to.split(",")[0] ?? "");
      const converterName = body.convert_to.split(",")[1];

      if (
        !converterName ||
        convertTo.includes("/") ||
        convertTo.includes("\\") ||
        convertTo.includes("..")
      ) {
        set.status = 400;
        return { success: false, error: "INVALID_TARGET", message: "Invalid conversion target." };
      }

      const fileNames = JSON.parse(body.file_names) as string[];
      for (let i = 0; i < fileNames.length; i++) {
        fileNames[i] = sanitize(fileNames[i] ?? "");
      }

      if (!Array.isArray(fileNames) || fileNames.length === 0) {
        set.status = 400;
        return { success: false, error: "NO_FILES", message: "No files specified." };
      }

      db.query("UPDATE jobs SET num_files = ?1, status = 'pending' WHERE id = ?2").run(
        fileNames.length,
        params.jobId,
      );

      // Start conversion in background
      handleConvert(fileNames, userUploadsDir, userOutputDir, convertTo, converterName, {
        value: params.jobId,
      } as unknown as Parameters<typeof handleConvert>[5])
        .then(() => {
          db.query("UPDATE jobs SET status = 'completed' WHERE id = ?1").run(params.jobId);
        })
        .catch((error) => {
          console.error("Error in conversion process:", error);
        });

      return { success: true, jobId: params.jobId, message: "Conversion started." };
    },
    { body: "convertRequest", apiAuth: true },
  )
  .get(
    "/jobs/:jobId/progress",
    async ({ params, user, set }) => {
      if (!user) {
        set.status = 401;
        return { success: false, error: "UNAUTHORIZED", message: "Authentication required." };
      }

      const job = db
        .query("SELECT * FROM jobs WHERE user_id = ? AND id = ?")
        .as(Jobs)
        .get(user.id, params.jobId);

      if (!job) {
        set.status = 404;
        return { success: false, error: "JOB_NOT_FOUND", message: "Job not found." };
      }

      const files = db
        .query("SELECT * FROM file_names WHERE job_id = ?")
        .as(Filename)
        .all(params.jobId);

      return {
        success: true,
        jobId: params.jobId,
        status: job.status,
        numFiles: job.num_files,
        finishedFiles: files.length,
        files: files.map((f) => ({
          id: f.id,
          fileName: f.file_name,
          outputFileName: f.output_file_name,
          status: f.status,
        })),
      };
    },
    { apiAuth: true },
  )
  .post(
    "/jobs/delete",
    async ({ body, user, set }) => {
      if (!user) {
        set.status = 401;
        return { success: false, error: "UNAUTHORIZED", message: "Authentication required." };
      }

      const { jobIds } = body;
      const deleted: string[] = [];
      const failed: { jobId: string; error: string }[] = [];

      for (const jobId of jobIds) {
        try {
          const job = db
            .query("SELECT * FROM jobs WHERE user_id = ? AND id = ?")
            .as(Jobs)
            .get(user.id, jobId);

          if (!job) {
            failed.push({ jobId, error: "Job not found or unauthorized" });
            continue;
          }

          const { rmSync } = await import("node:fs");
          try {
            rmSync(`${outputDir}${job.user_id}/${job.id}`, { recursive: true, force: true });
          } catch (e) {
            console.error(`Failed to delete output dir for job ${jobId}:`, e);
          }
          try {
            rmSync(`${uploadsDir}${job.user_id}/${job.id}`, { recursive: true, force: true });
          } catch (e) {
            console.error(`Failed to delete uploads dir for job ${jobId}:`, e);
          }

          db.query("DELETE FROM jobs WHERE id = ?").run(job.id);
          deleted.push(jobId);
        } catch (error) {
          failed.push({ jobId, error: error instanceof Error ? error.message : "Unknown error" });
        }
      }

      return {
        success: failed.length === 0,
        deleted: deleted.length,
        failed: failed.length,
        details: { success: deleted, failed },
      };
    },
    { body: "deleteJobs", apiAuth: true },
  )

  // ============================================================
  // DOWNLOAD
  // ============================================================
  .get(
    "/jobs/:jobId/download/:fileName",
    async ({ params, user, set }) => {
      if (!user) {
        set.status = 401;
        return { success: false, error: "UNAUTHORIZED", message: "Authentication required." };
      }

      const job = db
        .query("SELECT * FROM jobs WHERE user_id = ? AND id = ?")
        .as(Jobs)
        .get(user.id, params.jobId);

      if (!job) {
        set.status = 404;
        return { success: false, error: "JOB_NOT_FOUND", message: "Job not found." };
      }

      const fileName = sanitize(decodeURIComponent(params.fileName));
      const filePath = `${outputDir}${user.id}/${params.jobId}/${fileName}`;

      const file = Bun.file(filePath);
      if (!(await file.exists())) {
        set.status = 404;
        return { success: false, error: "FILE_NOT_FOUND", message: "File not found." };
      }

      return file;
    },
    { apiAuth: true },
  )

  // ============================================================
  // CONVERTERS
  // ============================================================
  .get("/converters", async () => {
    const targets = getAllTargets();
    const converters = Object.entries(targets).map(([name, targetList]) => ({
      name,
      inputs: getAllInputs(name),
      targets: targetList,
    }));

    return { success: true, converters };
  })
  .post(
    "/conversions",
    async ({ body }) => {
      const possible = getPossibleTargets(body.fileType);
      return { success: true, fileType: body.fileType, targets: possible };
    },
    { body: "conversionsRequest" },
  )

  // ============================================================
  // CONFIG
  // ============================================================
  .get("/config", async () => {
    return {
      success: true,
      config: {
        allowUnauthenticated: ALLOW_UNAUTHENTICATED,
        accountRegistration: ACCOUNT_REGISTRATION,
        hideHistory: HIDE_HISTORY,
        firstRun: FIRST_RUN,
      },
    };
  });
