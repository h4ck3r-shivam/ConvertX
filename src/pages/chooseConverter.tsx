import Elysia, { t } from "elysia";
import { getPossibleTargets } from "../converters/main";
import { userService } from "./user";

export const chooseConverter = new Elysia().use(userService).post(
  "/conversions",
  ({ body }) => {
    return (
      <>
        <article
          class={`
            convert_to_popup absolute z-20 m-0 hidden h-[50vh] max-h-[50vh] w-full flex-col
            overflow-x-hidden overflow-y-auto rounded-lg border border-(--border-default)
            bg-(--surface-raised)
            sm:h-[30vh]
          `}
        >
          {Object.entries(getPossibleTargets(body.fileType)).map(([converter, targets]) => (
            <article
              class={`convert_to_group flex w-full flex-col border-b border-(--border-subtle) p-4`}
              data-converter={converter}
            >
              <header
                class="mb-2 w-full text-sm font-bold tracking-wide text-accent-500 uppercase"
                safe
              >
                {converter}
              </header>
              <ul class="convert_to_target flex flex-row flex-wrap gap-1">
                {targets.map((target) => (
                  <button
                    tabindex={0}
                    class={`
                      target rounded-md bg-(--surface-overlay) px-3 py-1.5 text-sm transition-all
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
          {Object.entries(getPossibleTargets(body.fileType)).map(([converter, targets]) => (
            <optgroup label={converter}>
              {targets.map((target) => (
                <option value={`${target},${converter}`} safe>
                  {target}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </>
    );
  },
  { body: t.Object({ fileType: t.String() }) },
);
