# Dossier `styles`

Ce dossier centralise **tous les styles globaux** de l'application frontend. Il sert à définir l'apparence générale, les thèmes, les variables CSS, les resets, et tout ce qui doit être partagé à l'échelle de l'application.

## À quoi sert ce dossier ?

- Définir les styles globaux (ex : `global.css`, `app.css`)
- Gérer les thèmes (dark/light mode, variables CSS, etc.)
- Centraliser les variables, mixins, et utilitaires CSS globaux
- Fournir des fichiers de configuration pour les frameworks CSS (ex : Tailwind, theme.ts)
- Appliquer des resets ou normalisations CSS

Ce dossier **ne doit pas contenir** de styles spécifiques à un module ou à un composant isolé. Ceux-ci doivent rester dans le dossier du module concerné (ex : `modules/xxx/ui/styles/`).

---

## Arbre de décision : dois-je placer ce fichier dans `styles/` ?

1. **Ce style doit-il s'appliquer à toute l'application, indépendamment des modules ?**
   - Oui → Continue.
   - Non → Place-le dans le dossier `styles/` du module ou composant concerné.

2. **Est-ce une variable, un thème, un reset ou une configuration CSS globale ?**
   - Oui → Place-le ici.
   - Non → Continue.

3. **Est-ce un fichier de configuration pour un framework CSS (ex : Tailwind, thème global) ?**
   - Oui → Place-le ici.
   - Non → Continue.

4. **Ce fichier contient-il des styles spécifiques à une feature, un composant ou une page ?**
   - Oui → Il doit aller dans le dossier du module ou composant concerné, **pas ici**.
   - Non → Place-le ici.

---

## Exemples de fichiers à placer ici

- `global.css` : styles globaux, resets
- `app.css` : point d'entrée principal des styles
- `theme.ts` : définition des thèmes globaux (couleurs, polices, etc.)
- `tailwind.config.js` ou équivalent
- Variables CSS partagées

---

**Résumé :**
Le dossier `styles/` contient uniquement les styles et configurations CSS globaux, partagés par toute l'application.
Les styles locaux ou spécifiques à une feature doivent rester dans leur module respectif.
