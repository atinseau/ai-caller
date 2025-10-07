# Dossier `application`

Ce dossier contient la **logique métier applicative** de l'architecture hexagonale (aussi appelée "use cases" ou "services applicatifs"). Il fait le lien entre le domaine pur (`/domain`) et les couches externes (infrastructure, interfaces).

## Que doit-on mettre ici ?

- **Cas d'utilisation (Use Cases)** : Les classes/fonctions qui orchestrent les actions métier, en utilisant les entités et services du domaine.
  *Exemple :* `CreateUserUseCase`, `SendEmailUseCase`, etc.
- **Ports (interfaces d'entrée/sortie)** : Les interfaces qui définissent les contrats attendus par l'application pour interagir avec l'extérieur (repositories, services externes, etc).
  *Exemple :* `UserRepositoryPort`, `NotificationServicePort`.
- **DTOs (Data Transfer Objects)** : Les objets servant à transférer des données entre couches applicatives et interfaces (API, CLI, etc).
- **Services applicatifs** : Les services qui ne relèvent pas du domaine pur mais qui orchestrent des actions complexes.

## Que NE PAS mettre ici ?

- **Aucune logique technique** (accès base de données, HTTP, etc) : cela va dans `infrastructure`.
- **Aucune entité métier** : cela va dans `domain`.
- **Aucun contrôleur, resolver, handler HTTP** : cela va dans `interfaces`.

---

## Arbre de décision : où placer un fichier ?

1. **Est-ce une entité métier, une value object, une règle métier pure ?**
   - Oui → `/domain`
2. **Est-ce une classe/fonction qui orchestre un scénario métier (use case) ?**
   - Oui → `/application`
3. **Est-ce une interface qui définit un contrat pour un service externe ou un repository ?**
   - Oui → `/application/ports` (ou `/application` si peu d'interfaces)
4. **Est-ce un adaptateur concret (implémentation technique d'un port) ?**
   - Oui → `/infrastructure`
5. **Est-ce un contrôleur, resolver, handler, ou tout ce qui reçoit une requête externe ?**
   - Oui → `/interfaces`
6. **Est-ce un objet de transfert de données (DTO) utilisé entre application et interfaces ?**
   - Oui → `/application/dto` (ou `/application` si peu de DTOs)

---

## Exemple d'arborescence

```
application/
  ├── use-cases/
  │     └── create-user.usecase.ts
  ├── ports/
  │     └── user-repository.port.ts
  ├── dto/
  │     └── create-user.dto.ts
  └── README.md
```

> **Résumé** :
> Placez ici tout ce qui orchestre le métier, définit les contrats d'accès à l'extérieur, et structure les scénarios applicatifs.
> Ne mettez jamais de logique technique ou d'entités métier pures dans ce dossier.
