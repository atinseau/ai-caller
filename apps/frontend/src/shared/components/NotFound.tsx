import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { ExclamationTriangleIcon, HomeIcon, ArrowUturnLeftIcon } from "@heroicons/react/24/outline";
import { Link, useNavigate } from "react-router";

export function NotFound() {
  const navigate = useNavigate();

  return (
    <main className="min-h-screen grid place-items-center bg-gray-50">
      <div className="relative w-full max-w-xl px-4">
        <div className="pointer-events-none absolute inset-0 -z-10" />
        <Card className="border-muted/40">
          <CardHeader className="space-y-3 text-center">
            <Badge variant="secondary" className="mx-auto w-fit gap-1">
              <ExclamationTriangleIcon className="h-4 w-4" />
              Erreur 404
            </Badge>
            <CardTitle className="text-3xl sm:text-4xl">
              Page introuvable
            </CardTitle>
            <CardDescription className="text-balance mx-auto max-w-md">
              Désolé, la page que vous cherchez n’existe pas ou a été déplacée.
              Vérifiez l’URL ou revenez à l’accueil.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mx-auto grid max-w-md gap-2 text-sm text-muted-foreground">
              <p className="text-center">Voici quelques actions utiles :</p>
              <ul className="mx-auto grid list-disc gap-1 pl-5 text-left">
                <li>Retourner à la page d’accueil</li>
                <li>Revenir à la page précédente</li>
              </ul>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col items-stretch justify-center gap-3 sm:flex-row">
            <Button asChild className="gap-2">
              <Link to="/" aria-label="Retour à l’accueil">
                <HomeIcon className="h-4 w-4" />
                Accueil
              </Link>
            </Button>
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => navigate(-1)}
              aria-label="Revenir en arrière"
            >
              <ArrowUturnLeftIcon className="h-4 w-4" />
              Page précédente
            </Button>
          </CardFooter>
        </Card>
      </div>
    </main>
  );
}
