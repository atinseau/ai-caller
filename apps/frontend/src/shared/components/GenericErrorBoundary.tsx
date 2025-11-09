import { isRouteErrorResponse } from "react-router";
import { useState } from "react";

export function GenericErrorBoundary({ error }: { error: unknown }) {
  const [open, setOpen] = useState(true);

  // Valeurs par défaut
  let title = "Oops!";
  let description = "An unexpected error occurred.";
  let stackTrace: string | undefined;

  // Gestion des erreurs de route
  if (isRouteErrorResponse(error)) {
    if (error.status === 404) {
      title = "404";
      description = "The requested page could not be found.";
    } else {
      title = "Error";
      description = error.statusText || description;
    }
  }
  // Gestion des erreurs en développement
  else if (import.meta.env.DEV && error instanceof Error) {
    description = error.message;
    stackTrace = error.stack;
  }

  if (!open) return null;

  return <p>salut</p>
}
