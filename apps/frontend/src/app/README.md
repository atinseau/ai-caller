# Dossier `app`

Ce dossier contient le **point d'entrée applicatif** de l'interface front-end : initialisation globale, providers, configuration du routeur, layout principal, etc.
Il regroupe tout ce qui structure l’application à l’échelle globale, en dehors de la logique métier spécifique à un module.

---

## À quoi sert ce dossier ?

- **Initialisation de l’application** (fichier `App.tsx`, layout racine, etc.)
- **Configuration du routeur** (définition des routes, navigation globale)
- **Providers globaux** (React Query, Theme, Auth, etc.)
- **Gestion des layouts principaux**
- **Logique d’orchestration globale** (ex : gestion des erreurs globales, wrappers, etc.)

---

## Arbre de décision : dois-je placer ce fichier dans `app/` ?

1. **Est-ce le point d’entrée principal de l’application (App.tsx, root.tsx, etc.) ?**
   - Oui → `app/`
   - Non → Question suivante

2. **Est-ce une configuration ou un provider global (ex : QueryClientProvider, ThemeProvider, RouterProvider) ?**
   - Oui → `app/providers/` ou directement dans `app/` si peu nombreux
   - Non → Question suivante

3. **Est-ce la définition ou la configuration des routes principales ?**
   - Oui → `app/routes/` ou directement dans `app/`
   - Non → Question suivante

4. **Est-ce un layout ou une structure globale (layout principal, gestion globale des erreurs, etc.) ?**
   - Oui → `app/`
   - Non → Question suivante

5. **Est-ce lié à une fonctionnalité métier spécifique (ex : gestion des utilisateurs, audio, auth, etc.) ?**
   - Oui → Ce fichier doit aller dans le module concerné (`modules/nom-du-module/`)
   - Non → Question suivante

6. **Est-ce un composant, hook ou utilitaire réutilisable dans toute l’application ?**
   - Oui → `shared/`
   - Non → Reconsidérer la pertinence de ce fichier dans `app/`

---

**Résumé** :
Le dossier `app/` structure l’application à l’échelle globale (initialisation, providers, routes, layout principal).
Tout ce qui concerne une fonctionnalité métier ou un composant réutilisable doit aller dans `modules/` ou `shared/`.
