import Elysia from "elysia";
import { BaseHtml } from "../components/base";
import { Header } from "../components/header";
import { getAllInputs, getAllTargets } from "../converters/main";
import { ALLOW_UNAUTHENTICATED, WEBROOT } from "../helpers/env";
import { userService } from "./user";

export const listConverters = new Elysia().use(userService).get(
  "/converters",
  async () => {
    return (
      <BaseHtml webroot={WEBROOT} title="Convertor King | Converters">
        <>
          <Header webroot={WEBROOT} allowUnauthenticated={ALLOW_UNAUTHENTICATED} loggedIn />
          <main class="w-full flex-1 px-4 py-8">
            <article class="article">
              <h1 class="mb-6 text-2xl font-bold text-neutral-100">Converters</h1>
              <div class="overflow-x-auto rounded-lg border border-(--border-subtle)">
                <table
                  class={`
                    w-full table-auto text-left
                    [&_td]:p-3
                    [&_th]:border-b [&_th]:border-(--border-default) [&_th]:p-3 [&_th]:text-sm
                    [&_th]:font-semibold [&_th]:tracking-wide [&_th]:text-neutral-400
                    [&_th]:uppercase
                    [&_tr]:border-b [&_tr]:border-(--border-subtle)
                    [&_ul]:list-inside [&_ul]:list-disc
                  `}
                >
                  <thead>
                    <tr>
                      <th>Converter</th>
                      <th>From (Count)</th>
                      <th>To (Count)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(getAllTargets()).map(([converter, targets]) => {
                      const inputs = getAllInputs(converter);
                      return (
                        <tr>
                          <td safe class="font-medium text-accent-500">
                            {converter}
                          </td>
                          <td>
                            <span class="mb-2 badge">Count: {inputs.length}</span>
                            <ul>
                              {inputs.map((input) => (
                                <li safe>{input}</li>
                              ))}
                            </ul>
                          </td>
                          <td>
                            <span class="mb-2 badge">Count: {targets.length}</span>
                            <ul>
                              {targets.map((target) => (
                                <li safe>{target}</li>
                              ))}
                            </ul>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </article>
          </main>
        </>
      </BaseHtml>
    );
  },
  {
    auth: true,
  },
);
