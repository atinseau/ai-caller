# Dossier `shared`

Le dossier `shared` regroupe **tous les éléments réutilisables et transverses** à l'ensemble de l'application front-end. Il s'agit de composants, hooks, utilitaires, types, etc. qui ne sont pas spécifiques à un module métier, mais qui peuvent être utilisés partout dans l'application.

## À quoi sert ce dossier ?

- **Centraliser** les briques génériques et réutilisables.
- **Éviter la duplication** de code entre modules.
- **Faciliter la maintenance** et l'évolution des éléments communs.
- **Promouvoir la cohérence** de l'UI et des comportements à travers l'app.

Exemples de contenus :
- Composants UI génériques (boutons, modales, inputs, etc.)
- Hooks React personnalisés réutilisables
- Fonctions utilitaires (helpers, formatters, etc.)
- Types et interfaces globaux
- Styles globaux ou utilitaires

---

## Arbre de décision : dois-je placer ce fichier dans `shared` ?

1. **Ce fichier est-il utilisé dans plusieurs modules ou parties de l'application ?**
   - Oui → Continue.
   - Non → Place-le dans le module concerné.

2. **Ce fichier est-il indépendant d'un contexte métier précis ?**
   - Oui → Continue.
   - Non → Place-le dans le module métier correspondant.

3. **Ce fichier est-il un composant, hook, utilitaire, type ou style générique ?**
   - Oui → Place-le dans `shared` (dans le sous-dossier approprié : `components/`, `hooks/`, `utils/`, `types/`, etc.).
   - Non → Reconsidère sa place, il n'a peut-être pas vocation à être partagé.

4. **Ce fichier dépend-il d'une logique métier spécifique ou d'une API métier ?**
   - Oui → Il doit rester dans le module métier concerné.
   - Non → Il peut rester dans `shared`.

---

## Résumé

- **Place dans `shared` tout ce qui est générique, réutilisable et non lié à un métier précis.**
- **N'y mets jamais de logique métier ou de code spécifique à un module.**
- **Utilise les sous-dossiers pour organiser les différents types de ressources partagées.**
