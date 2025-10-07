# Architecture Hexagonale Frontend – ai-caller

Ce projet frontend React/TypeScript adopte une **architecture hexagonale** (aussi appelée Clean Architecture) adaptée au monde du front. L’objectif est de séparer clairement la logique métier, l’orchestration applicative, l’infrastructure technique et l’interface utilisateur, tout en favorisant la maintenabilité, la scalabilité et la testabilité.

---

## Vue d’ensemble de l’architecture

```
src/
├── app/           # Point d'entrée, providers, layout, routes globales
├── modules/       # Fonctionnalités métier découpées en sous-domaines hexagonaux
│   └── <feature>/
│       ├── domain/         # Cœur métier pur (entités, types, interfaces)
│       ├── application/    # Cas d’usage, services applicatifs
│       ├── infrastructure/ # Implémentations techniques concrètes
│       └── ui/             # Interface utilisateur spécifique au module
├── shared/        # Composants, hooks, utils, types, etc. réutilisables globalement
├── adapters/      # Accès techniques globaux (API, stockage, auth, etc.)
├── config/        # Configuration globale de l’application
├── styles/        # Styles globaux, thèmes, variables CSS
├── types/         # Types TypeScript globaux et transverses
├── interfaces/    # Interfaces TypeScript globales et transverses
└── tests/         # Utilitaires de tests globaux, mocks, setup
```

---

## Détail et documentation des dossiers

### `app/`
Contient le **point d’entrée** de l’application, la configuration du routeur, les providers globaux (React Query, Theme, etc.), le layout principal et la gestion des erreurs globales.

**Arbre de décision :**
1. Est-ce le point d’entrée principal, un provider global, la config du routeur ou un layout global ?
   → Oui : ici.
2. Est-ce lié à une feature métier spécifique ?
   → Oui : dans le module concerné.
3. Est-ce un composant/hook/utilitaire réutilisable partout ?
   → Oui : dans `shared/`.

---

### `modules/`
Regroupe **chaque fonctionnalité métier** dans un dossier dédié, structuré selon l’architecture hexagonale.

**Arbre de décision :**
1. Le fichier concerne-t-il une fonctionnalité métier spécifique (ex : users, audio, auth) ?
   → Oui : ici, dans le module concerné.
2. Est-il transverse à plusieurs modules (bouton, hook, utilitaire global) ?
   → Oui : dans `shared/`.
3. Est-ce une interaction technique globale (API, stockage, etc.) ?
   → Oui : dans `adapters/`.

#### Sous-dossiers dynamiques d’un module

##### `domain/`
Cœur métier pur du module.
Contient : entités, value objects, types, interfaces métier, exceptions métier.

**Arbre de décision :**
1. Est-ce une entité métier, value object, règle métier pure, interface de repository/service métier, exception métier ?
   → Oui : ici.
2. Dépend-il d’une techno, d’un framework, d’une API externe ?
   → Oui : ailleurs (`infrastructure/` ou `application/`).

##### `application/`
Orchestre les cas d’usage du module.
Contient : use-cases, services applicatifs, ports/interfaces d’entrée/sortie, DTOs.

**Arbre de décision :**
1. Est-ce un use-case, un service applicatif, un port (interface d’entrée/sortie), un DTO ?
   → Oui : ici.
2. Contient-il de la logique technique (fetch, accès API, etc.) ?
   → Oui : dans `infrastructure/`.

##### `infrastructure/`
Implémentations techniques concrètes des ports/interfaces définis dans `domain` ou `application`.
Contient : repositories, services externes, adaptateurs techniques, accès API, stockage, etc.

**Arbre de décision :**
1. Est-ce une implémentation concrète d’un port/interface métier ou applicatif ?
   → Oui : ici.
2. Est-ce une config technique, un adaptateur, un utilitaire technique lié à ce module ?
   → Oui : ici.
3. Contient-il de la logique métier pure ?
   → Oui : dans `domain/`.

##### `ui/`
Interface utilisateur spécifique au module.
Contient : composants, pages, hooks, styles, tests propres au module.

**Arbre de décision :**
1. Est-ce un composant, une page, un hook, un style ou un test spécifique à ce module ?
   → Oui : ici.
2. Est-ce un composant/hook/style/test réutilisable dans plusieurs modules ?
   → Oui : dans `shared/`.

##### `types/` et `interfaces/` (dans chaque module)
Types et interfaces spécifiques au module, non transverses.

---

### `shared/`
Composants, hooks, utils, types, styles, etc. **génériques et réutilisables** dans toute l’application.

**Arbre de décision :**
1. Utilisé dans plusieurs modules ou parties de l’app ?
   → Oui : ici.
2. Indépendant d’un contexte métier précis ?
   → Oui : ici.
3. Dépend d’une logique métier spécifique ?
   → Oui : dans le module concerné.

---

### `adapters/`
Centralise les **accès techniques globaux** (API, stockage, auth, etc.), leurs types et interfaces.

**Arbre de décision :**
1. Est-ce une interaction technique partagée (httpClient, tokenManager, etc.) ?
   → Oui : ici.
2. Spécifique à un module ?
   → Oui : dans `infrastructure/` du module.

---

### `config/`
Configuration globale de l’application (env, thèmes, options globales, etc.).

**Arbre de décision :**
1. Paramètre ou variable accessible partout dans l’app ?
   → Oui : ici.
2. Config spécifique à un module ?
   → Oui : dans le module concerné.

---

### `styles/`
Styles globaux, thèmes, variables CSS partagées.

**Arbre de décision :**
1. Style appliqué à toute l’app, variable/thème global, config CSS globale ?
   → Oui : ici.
2. Style spécifique à un module/composant ?
   → Oui : dans le module concerné.

---

### `types/` et `interfaces/`
Types et interfaces **globaux et transverses** à toute l’application.

**Arbre de décision :**
1. Utilisé dans plusieurs modules ou globalement ?
   → Oui : ici.
2. Spécifique à un module ?
   → Oui : dans le module concerné.

---

### `tests/`
Utilitaires de tests globaux, mocks, setup.

---

## Exemple d’organisation d’un module

```
modules/
  └── users/
        ├── domain/          # Entités, value objects, interfaces métier, exceptions
        ├── application/     # Use-cases, services applicatifs, ports, DTOs
        ├── infrastructure/  # Implémentations concrètes (API, stockage, etc.)
        └── ui/              # Composants, pages, hooks, styles, tests spécifiques
```

---

## Résumé

- **Séparez strictement** métier, application, infrastructure et UI.
- **Placez chaque fichier** là où il a le plus de sens selon sa responsabilité et sa portée.
- **Utilisez les arbres de décision** pour éviter les ambiguïtés et garantir la maintenabilité.
- **Documentez chaque dossier** pour faciliter l’onboarding et la cohérence de l’équipe.

Pour plus de détails, consultez les README présents dans chaque dossier clé du projet.

---
