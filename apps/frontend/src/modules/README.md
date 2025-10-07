# Dossier `modules`

Ce dossier regroupe **toutes les fonctionnalités métier** de l'application, organisées par "module" fonctionnel (ex : `users`, `auth`, `audio`, etc.).  
Chaque module isole sa logique métier, ses cas d'usage, ses accès techniques et son interface utilisateur, selon les principes de l'architecture hexagonale (ou Clean Architecture).

---

## À quoi sert ce dossier ?

- **Centraliser la logique métier** par domaine fonctionnel.
- **Séparer** clairement le métier (`domain`), les cas d'usage (`application`), l'accès aux données ou services (`infrastructure`) et l'interface utilisateur (`ui`).
- **Faciliter la scalabilité** : chaque module évolue indépendamment.
- **Favoriser la maintenabilité** et les tests unitaires.

---

## Arbre de décision : dois-je placer ce fichier dans `modules/` ?

1. **Le fichier concerne-t-il une fonctionnalité métier spécifique (ex : utilisateur, audio, auth, etc.) ?**
   - Oui → Continue.
   - Non → Voir `shared/`, `adapters/`, ou un dossier global.

2. **Ce fichier est-il lié à une logique métier, un cas d'usage, une implémentation technique ou l'UI de ce domaine ?**
   - Oui → Continue.
   - Non → Il n'a pas sa place ici.

3. **Le fichier est-il transverse à plusieurs modules (ex : bouton réutilisable, hook générique, utilitaire global) ?**
   - Oui → Place-le dans `shared/`.

4. **Le fichier concerne-t-il une interaction technique globale (API, stockage, auth, etc.) ?**
   - Oui → Place-le dans `adapters/`.

5. **Sinon** :  
   - Si le fichier est propre à un domaine métier, place-le dans le module correspondant, dans le sous-dossier adapté (`domain`, `application`, `infrastructure`, `ui`).
   - Si tu hésites, pose-toi la question : "Ce code a-t-il du sens en dehors de ce module ?"  
     - Oui → `shared/` ou `adapters/`
     - Non → Ce module

---

## Exemple d'organisation d'un module

```
modules/
  └── users/
        ├── domain/          # Entités, types, interfaces métier
        ├── application/     # Use-cases, services applicatifs
        ├── infrastructure/  # Implémentations concrètes (API, stockage, etc.)
        └── ui/              # Composants, pages, hooks, styles, tests
```

---

**Résumé** :  
Place ici tout ce qui est **spécifique à un domaine métier**.  
Pour le transverse ou le technique global, préfère `shared/` ou `adapters/`.