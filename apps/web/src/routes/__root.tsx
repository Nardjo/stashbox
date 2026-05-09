import { createRootRoute, Outlet } from "@tanstack/react-router";

import { ThemeProvider, themeInitScript } from "~/components/theme/theme.tsx";

export const Route = createRootRoute({
  component: RootLayout,
});

function RootLayout() {
  return (
    <html lang="fr">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Stashbox</title>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript() }} />
      </head>
      <body>
        <ThemeProvider>
          <Outlet />
        </ThemeProvider>
      </body>
    </html>
  );
}
