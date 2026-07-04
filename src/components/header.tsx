import { ThemeToggle } from "./themeToggle";

export const Header = ({
  loggedIn,
  accountRegistration,
  allowUnauthenticated,
  hideHistory,
  webroot = "",
}: {
  loggedIn?: boolean;
  accountRegistration?: boolean;
  allowUnauthenticated?: boolean;
  hideHistory?: boolean;
  webroot?: string;
}) => {
  let rightNav: JSX.Element;
  if (loggedIn) {
    rightNav = (
      <ul
        class="
          flex items-center gap-1
          sm:gap-2
        "
      >
        {!hideHistory && (
          <li>
            <a
              class="
                rounded-md px-3 py-1.5 text-sm text-neutral-400 transition-all
                hover:bg-(--surface-overlay) hover:text-accent-500
              "
              href={`${webroot}/history`}
            >
              History
            </a>
          </li>
        )}
        <li>
          <a
            class="
              rounded-md px-3 py-1.5 text-sm text-neutral-400 transition-all
              hover:bg-(--surface-overlay) hover:text-accent-500
            "
            href={`${webroot}/passport/`}
          >
            Passport Photo
          </a>
        </li>
        {!allowUnauthenticated ? (
          <li>
            <a
              class="
                rounded-md px-3 py-1.5 text-sm text-neutral-400 transition-all
                hover:bg-(--surface-overlay) hover:text-accent-500
              "
              href={`${webroot}/account`}
            >
              Account
            </a>
          </li>
        ) : null}
        {!allowUnauthenticated ? (
          <li>
            <a
              class="
                rounded-md px-3 py-1.5 text-sm text-neutral-400 transition-all
                hover:bg-(--surface-overlay) hover:text-accent-500
              "
              href={`${webroot}/logoff`}
            >
              Logout
            </a>
          </li>
        ) : null}
        <li class="ml-1">
          <ThemeToggle webroot={webroot} />
        </li>
      </ul>
    );
  } else {
    rightNav = (
      <ul
        class="
          flex items-center gap-1
          sm:gap-2
        "
      >
        <li>
          <a
            class="
              rounded-md px-3 py-1.5 text-sm text-neutral-400 transition-all
              hover:bg-(--surface-overlay) hover:text-accent-500
            "
            href={`${webroot}/login`}
          >
            Login
          </a>
        </li>
        {accountRegistration ? (
          <li>
            <a
              class="
                rounded-md px-3 py-1.5 text-sm text-neutral-400 transition-all
                hover:bg-(--surface-overlay) hover:text-accent-500
              "
              href={`${webroot}/register`}
            >
              Register
            </a>
          </li>
        ) : null}
        <li class="ml-1">
          <ThemeToggle webroot={webroot} />
        </li>
      </ul>
    );
  }

  return (
    <header
      class="sticky top-0 z-50 w-full border-b border-(--border-subtle) backdrop-blur-md"
      style="background: var(--surface-base);"
    >
      <nav class="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
        <ul>
          <li>
            <a
              href={`${webroot}/`}
              class="
                text-lg font-bold text-neutral-100 transition-colors
                hover:text-accent-500
              "
            >
              Convertor King
            </a>
          </li>
        </ul>
        {rightNav}
      </nav>
    </header>
  );
};
