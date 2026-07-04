import { version } from "../../package.json";

export const BaseHtml = ({
  children,
  title = "Convertor King",
  webroot = "",
}: {
  children: JSX.Element;
  title?: string;
  webroot?: string;
}) => (
  <html lang="en" data-theme="dark">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <meta name="webroot" content={webroot} />
      <title safe>{title}</title>
      <link rel="stylesheet" href={`${webroot}/generated.css`} />
      <link rel="icon" type="image/svg+xml" href={`${webroot}/favicon.svg`} />
      <link rel="apple-touch-icon" sizes="180x180" href={`${webroot}/apple-touch-icon.png`} />
      <link rel="icon" type="image/png" sizes="32x32" href={`${webroot}/favicon-32x32.png`} />
      <link rel="icon" type="image/png" sizes="16x16" href={`${webroot}/favicon-16x16.png`} />
      <link rel="manifest" href={`${webroot}/site.webmanifest`} />
      <script>
        {`(function(){try{var c=document.cookie.match(/theme=([^;]+)/);if(c){document.documentElement.setAttribute('data-theme',c[1]);}}catch(e){}})();`}
      </script>
    </head>
    <body
      class={`flex min-h-screen w-full flex-col bg-neutral-950 text-neutral-300`}
      style="background: var(--surface-base);"
    >
      <div id="page-loader" class="ck-page-loader" />
      {children}
      <footer class="w-full border-t border-(--border-subtle)">
        <div class="mx-auto max-w-4xl p-4 text-center text-sm text-neutral-500">
          <span>Powered by </span>
          <a
            href="https://github.com/C4illin/ConvertX"
            class={`
              text-neutral-400 transition-colors
              hover:text-accent-500
            `}
          >
            Convertor King{" "}
          </a>
          <span safe>v{version || ""}</span>
        </div>
      </footer>
      <script src={`${webroot}/theme.js`} />
      <script>
        {`(function(){var l=document.getElementById('page-loader');if(!l)return;function trigger(){l.classList.remove('ck-active');void l.offsetWidth;l.classList.add('ck-active');}document.addEventListener('submit',function(e){if(e.target&&e.target.tagName==='FORM')trigger();},true);document.addEventListener('click',function(e){var a=e.target.closest&&e.target.closest('a');if(a&&a.href&&a.href.startsWith(location.origin)&&!a.hasAttribute('download'))trigger();},true);window.addEventListener('load',function(){l.classList.remove('ck-active');});})();`}
      </script>
    </body>
  </html>
);
