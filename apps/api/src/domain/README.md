# Dossier `domain`

Ce dossier contient le **cœur métier** de l'application selon l'architecture hexagonale (ou "Clean Architecture").
Aucun code ici ne doit dépendre de NestJS, d'une base de données, d'un framework ou d'une technologie externe.

## Où placer un fichier dans `domain` ?

### 1. Entités (`entities`)
- **Définition** : Les objets métier principaux, avec leur logique métier propre.
- **Exemples** : `User`, `Order`, `Invoice`, etc.
- **Quand ?** : Si un objet a des règles métier ou des invariants à respecter.

### 2. Value Objects (`value-objects`)
- **Définition** : Objets immuables représentant une valeur (ex : Email, PhoneNumber).
- **Quand ?** : Si une donnée a une logique de validation ou de comparaison propre.

### 3. Agrégats (`aggregates`)
- **Définition** : Racines d'agrégat qui regroupent des entités et value objects cohérents.
- **Quand ?** : Si plusieurs entités sont liées et doivent être modifiées ensemble.

### 4. Référentiels (interfaces) (`repositories`)
- **Définition** : Interfaces pour accéder aux entités (jamais d’implémentation ici !).
- **Quand ?** : Si un service métier a besoin de persister ou récupérer des entités.

### 5. Services Métier (`services`)
- **Définition** : Logique métier complexe qui ne rentre pas dans une entité ou un value object.
- **Quand ?** : Si une règle métier implique plusieurs entités ou des calculs.

### 6. Exceptions Métier (`exceptions`)
- **Définition** : Exceptions spécifiques au domaine métier.
- **Quand ?** : Si une règle métier n’est pas respectée.

---

## Décision d’arbre pour placer un fichier

1. **Est-ce une règle métier ou une donnée métier ?**
   - Oui → Continue.
   - Non → Ce fichier n’a rien à faire dans `domain`.

2. **Est-ce une entité, un value object ou un agrégat ?**
   - Oui → Place-le dans le dossier correspondant.

3. **Est-ce une interface de repository ?**
   - Oui → Place-la dans `repositories`.

4. **Est-ce un service métier pur ?**
   - Oui → Place-le dans `services`.

5. **Est-ce une exception métier ?**
   - Oui → Place-la dans `exceptions`.

6. **Sinon** : Reconsidère la pertinence de ce fichier dans le domaine.

---

## À ne PAS mettre ici

- Contrôleurs, DTO, schémas de base de données, services d’infrastructure, dépendances techniques.
- Toute dépendance à NestJS, TypeORM, Mongoose, etc.

---

**Résumé** :
Le dossier `domain` ne contient que le code métier pur, indépendant de toute technologie ou framework.
