import { Elysia } from "elysia";
import { BaseHtml } from "../components/base";
import { Header } from "../components/header";
import { Loader } from "../components/loader";
import db from "../db/db";
import { Filename, Jobs } from "../db/types";
import { ALLOW_UNAUTHENTICATED, WEBROOT } from "../helpers/env";
import { DownloadIcon } from "../icons/download";
import { DeleteIcon } from "../icons/delete";
import { EyeIcon } from "../icons/eye";
import { userService } from "./user";

function ResultsArticle({
  job,
  files,
  outputPath,
}: {
  job: Jobs;
  files: Filename[];
  outputPath: string;
}) {
  return (
    <article class="article">
      <div
        class="
          mb-6 flex flex-col gap-4
          sm:flex-row sm:items-center sm:justify-between
        "
      >
        <h1 class="text-2xl font-bold text-neutral-100">Results</h1>
        <div class="flex flex-row gap-2">
          <form action={`${WEBROOT}/delete/${job.id}`} method="POST">
            <button
              type="submit"
              style={files.length !== job.num_files ? "pointer-events: none;" : ""}
              class="flex btn-secondary flex-row items-center gap-2"
              {...(files.length !== job.num_files ? { disabled: true, "aria-busy": "true" } : "")}
            >
              <DeleteIcon /> <span>Delete</span>
            </button>
          </form>
          <a
            style={files.length !== job.num_files ? "pointer-events: none;" : ""}
            href={`${WEBROOT}/archive/${job.id}`}
            download={`converted_files_${job.id}.tar`}
            class="flex btn-primary flex-row items-center gap-2"
            {...(files.length !== job.num_files ? { disabled: true, "aria-busy": "true" } : "")}
          >
            <DownloadIcon /> <span>Tar</span>
          </a>
          <button class="flex btn-primary flex-row items-center gap-2" onclick="downloadAll()">
            <DownloadIcon /> <span>All</span>
          </button>
        </div>
      </div>
      {files.length !== job.num_files && (
        <div class="mb-6 flex flex-col items-center gap-3">
          <Loader size={56} />
          <p class="text-sm text-neutral-400">Converting your files...</p>
        </div>
      )}
      <progress
        max={job.num_files}
        {...(files.length === job.num_files ? { value: files.length } : "")}
        class={`
          mb-6 inline-block h-2 w-full appearance-none overflow-hidden rounded-full border-0
          bg-(--surface-overlay) bg-none text-accent-500 accent-accent-500
          [&::-moz-progress-bar]:bg-accent-500
          [&::-webkit-progress-value]:rounded-full [&::-webkit-progress-value]:[background:none]
          [&[value]::-webkit-progress-value]:bg-accent-500
          [&[value]::-webkit-progress-value]:transition-[inline-size]
        `}
      />
      <div class="overflow-x-auto rounded-lg border border-(--border-subtle)">
        <table
          class="
            w-full table-auto text-left
            [&_td]:p-3
            [&_td]:first:max-w-[20vw] [&_td]:first:truncate
            [&_th]:border-b [&_th]:border-(--border-default) [&_th]:p-3 [&_th]:text-sm
            [&_th]:font-semibold [&_th]:tracking-wide [&_th]:text-neutral-400 [&_th]:uppercase
            [&_tr]:border-b [&_tr]:border-(--border-subtle)
          "
        >
          <thead>
            <tr>
              <th>Converted File Name</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {files.map((file) => (
              <tr>
                <td safe class="max-w-[20vw] truncate">
                  {file.output_file_name}
                </td>
                <td safe>
                  <span class="badge">{file.status}</span>
                </td>
                <td class="flex flex-row gap-3">
                  <a
                    class="
                      text-accent-500 transition-colors
                      hover:text-accent-400
                    "
                    href={`${WEBROOT}/download/${outputPath}${file.output_file_name}`}
                  >
                    <EyeIcon />
                  </a>
                  <a
                    class="
                      text-accent-500 transition-colors
                      hover:text-accent-400
                    "
                    href={`${WEBROOT}/download/${outputPath}${file.output_file_name}`}
                    download={file.output_file_name}
                  >
                    <DownloadIcon />
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </article>
  );
}

export const results = new Elysia()
  .use(userService)
  .get(
    "/results/:jobId",
    async ({ params, set, cookie: { job_id }, user }) => {
      if (job_id?.value) {
        // Clear the job_id cookie since we are viewing the results
        job_id.remove();
      }

      const job = db
        .query("SELECT * FROM jobs WHERE user_id = ? AND id = ?")
        .as(Jobs)
        .get(user.id, params.jobId);

      if (!job) {
        set.status = 404;
        return {
          message: "Job not found.",
        };
      }

      const outputPath = `${user.id}/${params.jobId}/`;

      const files = db
        .query("SELECT * FROM file_names WHERE job_id = ?")
        .as(Filename)
        .all(params.jobId);

      return (
        <BaseHtml webroot={WEBROOT} title="Convertor King | Result">
          <>
            <Header webroot={WEBROOT} allowUnauthenticated={ALLOW_UNAUTHENTICATED} loggedIn />
            <main class="w-full flex-1 px-4 py-8">
              <ResultsArticle job={job} files={files} outputPath={outputPath} />
            </main>
            <script src={`${WEBROOT}/results.js`} defer />
          </>
        </BaseHtml>
      );
    },
    { auth: true },
  )
  .post(
    "/progress/:jobId",
    async ({ set, params, cookie: { job_id }, user }) => {
      if (job_id?.value) {
        // Clear the job_id cookie since we are viewing the results
        job_id.remove();
      }

      const job = db
        .query("SELECT * FROM jobs WHERE user_id = ? AND id = ?")
        .as(Jobs)
        .get(user.id, params.jobId);

      if (!job) {
        set.status = 404;
        return {
          message: "Job not found.",
        };
      }

      const outputPath = `${user.id}/${params.jobId}/`;

      const files = db
        .query("SELECT * FROM file_names WHERE job_id = ?")
        .as(Filename)
        .all(params.jobId);

      return <ResultsArticle job={job} files={files} outputPath={outputPath} />;
    },
    { auth: true },
  );
