import "@/styles/app.css";

import { Links, Meta, Outlet, Scripts, ScrollRestoration } from "react-router";
import { GenericErrorBoundary } from "@/shared/components/GenericErrorBoundary";
import { Toaster } from "@/shared/components/ui/sonner";
import type { Route } from "./+types/root";
import { QueryProvider } from "./providers/QueryProvider";
import { ServicesProvider } from "./providers/ServicesProvider";

export const links: Route.LinksFunction = () => [
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous",
  },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap",
  },
];

export default function App() {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        <QueryProvider>
          <ServicesProvider>
            <Outlet />
            <Toaster />
          </ServicesProvider>
        </QueryProvider>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  return <GenericErrorBoundary error={error} />;
}
