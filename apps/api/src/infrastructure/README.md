# Dossier `infrastructure`

Ce dossier contient tout ce qui concerne les détails techniques et l'intégration avec l'extérieur (frameworks, bases de données, services externes, etc.).
Dans l'architecture hexagonale, l'infrastructure est responsable de la concrétisation des ports définis dans le domaine ou l'application.

## Où placer les fichiers ?

### 1. **Adaptateurs techniques**
Placez ici les implémentations concrètes des interfaces (ports) définies dans le domaine ou l'application :
- Repositories (accès à la base de données)
- Services externes (APIs, emails, stockage, etc.)
- Adapters pour des outils/frameworks (ex: scheduler, file system, etc.)

**Exemple :**
```
infrastructure/
  ├── repositories/
  ├── services/
  └── adapters/
```

### 2. **Configuration**
Tout ce qui concerne la configuration technique de l’application :
- Fichiers de configuration (ORM, providers, etc.)
- Initialisation des modules techniques

**Exemple :**
```
infrastructure/
  └── config/
```

### 3. **Fichiers spécifiques à NestJS**
Si vous avez des modules, providers ou interceptors spécifiques à NestJS qui ne relèvent pas du domaine métier, placez-les ici.

**Exemple :**
```
infrastructure/
  └── nest/
      ├── interceptors/
      ├── filters/
      └── guards/
```

---

## Arbre de décision pour placer un fichier

1. **Est-ce une implémentation concrète d'une interface métier (repository, service, etc.) ?**
   - Oui → `repositories/`, `services/`, ou `adapters/`
2. **Est-ce un fichier de configuration technique ou d’initialisation ?**
   - Oui → `config/`
3. **Est-ce un composant technique propre à NestJS (guard, interceptor, filter, etc.) ?**
   - Oui → `nest/`
4. **Est-ce un utilitaire purement technique, sans logique métier ?**
   - Oui → Créez un sous-dossier adapté (`utils/`, `migrations/`, etc.)
5. **Sinon :**
   - Si le fichier touche au métier ou à la logique applicative, il n’a pas sa place ici (voir `domain` ou `application`).

---

## Résumé

- **Jamais de logique métier ici.**
- **Uniquement des détails techniques, des implémentations concrètes, et de la configuration.**
- **Respectez la séparation des responsabilités pour garder l’architecture claire et maintenable.**
