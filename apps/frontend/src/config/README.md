# Dossier `config`

Ce dossier centralise **toute la configuration globale** de l'application frontend. Il permet de regrouper les paramètres, variables d'environnement, et fichiers de configuration qui doivent être accessibles à l'ensemble de l'application, indépendamment des modules métier.

## À quoi sert ce dossier ?

- Définir les variables d'environnement (API URL, clés, etc.)
- Centraliser la configuration de l'application (thèmes, options globales, etc.)
- Fournir des helpers/utilitaires pour accéder à la configuration
- Éviter la duplication de paramètres dans plusieurs modules

---

## Arbre de décision : dois-je placer ce fichier dans `config` ?

1. **Est-ce un fichier qui contient des paramètres ou des variables qui doivent être accessibles partout dans l'application ?**
   - Oui → Continue.
   - Non → Ce fichier n'a pas sa place ici.

2. **Est-ce une configuration globale (ex : URL d'API, options de thème, paramètres d'app, etc.) ?**
   - Oui → Place-le dans `config`.
   - Non → Continue.

3. **Est-ce une configuration spécifique à un module métier (ex : users, audio, auth, etc.) ?**
   - Oui → Place-la dans le dossier du module concerné (`modules/<module>/config` ou directement dans le module).
   - Non → Continue.

4. **Est-ce un utilitaire pour lire ou manipuler la configuration globale ?**
   - Oui → Place-le dans `config`.

5. **Sinon :**
   - Si le fichier concerne la logique métier, l'UI, ou l'infrastructure technique, il n'a pas sa place ici.

---

## Exemples de fichiers à mettre dans `config`

- `env.ts` : lecture et typage des variables d'environnement
- `appConfig.ts` : configuration générale de l'application (nom, version, options globales)
- `themeConfig.ts` : configuration des thèmes globaux
- `types.ts` : types liés à la configuration globale

---

**Résumé** :
Le dossier `config` sert à centraliser tout ce qui concerne la configuration globale et transversale de l'application.
Aucune logique métier, composant UI ou implémentation technique spécifique ne doit s'y trouver.
