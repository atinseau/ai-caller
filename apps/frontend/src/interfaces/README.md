# Dossier `interfaces`

Ce dossier a pour but de centraliser **toutes les interfaces globales** de l’application front-end. Il s’agit des contrats TypeScript (interfaces, types) qui sont utilisés à travers plusieurs modules ou qui structurent les échanges entre différentes couches de l’application (UI, application, domaine, infrastructure).

## À quoi sert ce dossier ?

- Définir les **interfaces et types globaux** partagés entre plusieurs modules.
- Standardiser les **contrats d’échange** entre les couches (ex : forme des props, shape des réponses API, etc.).
- Éviter la duplication de types/interfaces dans chaque module.
- Servir de référence unique pour les types transverses à l’application.

---

## Arbre de décision : dois-je placer mon fichier ici ?

1. **Est-ce une interface ou un type TypeScript ?**
   - Non → Ce dossier n’est pas adapté.

2. **Ce type/interface est-il utilisé dans plusieurs modules ou à travers toute l’application ?**
   - Oui → Place-le dans `interfaces/`.
   - Non → Place-le dans le dossier `interfaces/` du module concerné, ou dans un dossier `types/` local au module.

3. **Ce type/interface décrit-il un contrat d’échange entre plusieurs couches (UI, application, domaine, infra) ?**
   - Oui → Place-le ici.

4. **Ce type/interface est-il spécifique à une feature métier ou à un module ?**
   - Oui → Place-le dans le dossier du module concerné (`modules/xxx/interfaces/` ou `modules/xxx/types/`).

5. **Ce type/interface concerne-t-il une dépendance technique (ex : API, stockage, etc.) ?**
   - Oui → Place-le dans le dossier `adapters/` ou `infrastructure/` approprié.

---

## Exemples de ce qu’on place ici

- Interfaces de props globales (ex : `WithChildren`, `WithClassName`)
- Types de réponse d’API partagés
- Contrats pour les context providers globaux
- Types d’événements globaux
- Interfaces transverses à plusieurs modules

---

**Résumé :**
Place ici uniquement les interfaces et types TypeScript qui sont utilisés à travers plusieurs modules ou qui structurent les échanges globaux de l’application.
Pour les types/interfaces spécifiques à un module, préfère les dossiers internes à ce module.
