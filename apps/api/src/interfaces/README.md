# Dossier `interfaces` — Architecture Hexagonale

Ce dossier contient **toutes les interfaces d'entrée et de sortie** de l'application, c'est-à-dire tout ce qui permet à l'extérieur d'interagir avec le cœur métier (domain/application) ou inversement.

## Que mettre dans `interfaces` ?

- **Contrôleurs HTTP (REST, GraphQL, WebSocket, etc.)**
- **DTOs** (Data Transfer Objects) utilisés pour la communication avec l'extérieur
- **Adaptateurs d'entrée** (ex: listeners d'événements, handlers de commandes externes)
- **Adaptateurs de sortie** (ex: clients d'API externes, gateways, présentateurs)
- **Schemas de validation** (ex: class-validator, Joi, Zod, etc.)
- **Documentation d'API** (ex: Swagger decorators)

## Arbre de décision pour placer un fichier

1. **Est-ce que ce fichier concerne la façon dont l'extérieur interagit avec l'application ?**
   - Oui → `interfaces`
   - Non → Voir autres dossiers

2. **Est-ce un contrôleur, un DTO, un schéma de validation, ou un adaptateur (entrée/sortie) ?**
   - Oui → `interfaces`
   - Non → Voir autres dossiers

3. **Est-ce que ce fichier contient de la logique métier ou des règles de gestion ?**
   - Oui → Il doit aller dans `domain` ou `application`, **pas ici**.
   - Non → Reste dans `interfaces`.

## Sous-organisation recommandée

- `controllers/` : Contrôleurs HTTP, GraphQL, WebSocket, etc.
- `dto/` : Objets de transfert de données pour les entrées/sorties
- `validators/` : Schémas de validation
- `adapters/` : Adaptateurs d'entrée/sortie (API externes, présentateurs, etc.)

## Exemples

- Un contrôleur NestJS : `interfaces/controllers/user.controller.ts`
- Un DTO de création d'utilisateur : `interfaces/dto/create-user.dto.ts`
- Un schéma de validation : `interfaces/validators/user.validator.ts`
- Un client HTTP pour une API externe : `interfaces/adapters/external-api.client.ts`

---

**Résumé :**
Tout ce qui touche à l'**exposition** ou à l'**intégration** de l'application avec l'extérieur va dans `interfaces`.
Aucune logique métier ici, uniquement de l'orchestration, de la transformation ou de la validation de données.
