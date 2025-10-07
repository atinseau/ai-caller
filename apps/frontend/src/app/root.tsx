import "@/styles/app.css";

import { Meta, Outlet } from "react-router";

import type { Route } from "./+types/root";
import { GenericErrorBoundary } from "@/shared/components/GenericErrorBoundary";
import { Links } from "react-router";
import { ScrollRestoration } from "react-router";
import { Scripts } from "react-router";

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
  return <html lang="en">
    <head>
      <meta charSet="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <Meta />
      <Links />
    </head>
    <body>
      <Outlet />
      <ScrollRestoration />
      <Scripts />
    </body>
  </html>;
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  return <GenericErrorBoundary error={error} />;
}
