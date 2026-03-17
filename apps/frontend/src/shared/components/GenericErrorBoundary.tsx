import { useState } from "react";
import { isRouteErrorResponse } from "react-router";

export function GenericErrorBoundary({ error }: { error: unknown }) {
  const [open, _setOpen] = useState(true);

  // Valeurs par défaut
  let _title = "Oops!";
  let description = "An unexpected error occurred.";
  let _stackTrace: string | undefined;

  // Gestion des erreurs de route
  if (isRouteErrorResponse(error)) {
    if (error.status === 404) {
      _title = "404";
      description = "The requested page could not be found.";
    } else {
      _title = "Error";
      description = error.statusText || description;
    }
  }
  // Gestion des erreurs en développement
  else if (import.meta.env.DEV && error instanceof Error) {
    description = error.message;
    _stackTrace = error.stack;
  }

  if (!open) return null;

  return <p>salut</p>;
}
