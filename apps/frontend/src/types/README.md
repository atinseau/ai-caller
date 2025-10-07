# Dossier `types`

Ce dossier centralise **tous les types TypeScript globaux** de l'application frontend. Il permet de partager des définitions de types transverses, utilisés dans plusieurs modules ou parties de l'application, afin d'éviter les duplications et de garantir la cohérence des types à l'échelle du projet.

## À quoi sert ce dossier ?

- Définir des types utilitaires, communs à plusieurs modules (ex : `ID`, `ApiResponse<T>`, etc.).
- Partager des types globaux (ex : types d'environnement, types d'événements globaux, etc.).
- Faciliter la maintenance et la découverte des types partagés.
- Éviter la redéfinition de types identiques dans plusieurs modules.

**Attention :**  
Les types spécifiques à un module ou à une feature doivent rester dans le dossier `types/` du module concerné (ex : `modules/users/types/`).  
Ce dossier est réservé aux types **transverses**.

---

## Arbre de décision : dois-je placer mon fichier ici ?

1. **Ce type est-il utilisé dans plusieurs modules ou dans toute l'application ?**
   - Oui → Continue.
   - Non → Place-le dans le dossier `types/` du module concerné.

2. **Ce type est-il une définition pure TypeScript (pas une interface métier, pas une implémentation) ?**
   - Oui → Continue.
   - Non → Si c'est une interface métier, voir `interfaces/`. Si c'est une classe/implémentation, ce n'est pas le bon endroit.

3. **Ce type n'est-il pas spécifique à une technologie ou à une infrastructure ?**
   - Oui → Continue.
   - Non → Les types techniques/infrastructurels doivent aller dans le dossier concerné (`adapters/`, `infrastructure/`, etc.).

4. **Ce type n'est-il pas déjà défini dans un module ou dans un package externe ?**
   - Oui → Place-le ici.
   - Non → Utilise la définition existante.

---

## Exemples de types à placer ici

- `type ID = string | number`
- `type ApiResponse<T> = { data: T; error?: string }`
- `type Theme = "light" | "dark"`
- `type Nullable<T> = T | null`
- Types d'événements globaux, de configuration, etc.

---

**Résumé :**  
Place ici uniquement les types TypeScript **globaux et transverses** à toute l'application.  
Pour les types spécifiques à un module, utilise le dossier `types/` du module concerné.