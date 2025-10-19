# Dictées

> Saisissez une dictée et identifiez en quelques secondes les mots et formes censés être maîtrisés par vos élèves.

## 🎯 Objectif pédagogique
L'application répond à un besoin simple de l'enseignant :
- Gagner du temps lors de la préparation ou de la correction
- Repérer rapidement les mots et formes grammaticales qui devraient être acquises (niveau, progression, liste cible)
- Visualiser les éventuelles lacunes (formes verbales, accords, catégories grammaticales)

## 🧩 Principe
1. Vous collez ou saisissez le texte de la dictée.
2. L'application segmente et analyse chaque mot (lemme, catégorie, traits morphologiques) via le lexique.
3. Les formes sont rapprochées de vos listes de référence (mots/formes à maîtriser pour le niveau visé).
4. Un tableau synthétique met en évidence :
   - Les formes présentes et censées être acquises
   - Celles absentes des listes (potentielles difficultés / hors périmètre)
   - Les doublons / fréquence d'exposition
5. Vous pouvez ajuster la dictée (remplacements, simplifications) avant diffusion.

> Les listes d'acquisition peuvent être personnalisées (JSON / interface interne à venir).

## 📊 Exemple d'analyse
| Mot | Lemme | POS | Traits | Dans référentiel | Statut |
|-----|-------|-----|--------|------------------|--------|
| chats | chat | nc | pluriel | oui | forme exposée |
| mange | manger | v | présent 3e pers | oui | forme à revoir |
| Wapiti | (exotique) | — | — | non | hors périmètre |
| étaient | être | v | imparfait 3e pers plur | oui | déjà rencontré |

Référentiel (simplifié) : `chat`, `manger`, `être`.

## 🚀 Fonctionnalités essentielles
- Saisie / collage rapide d'un texte
- Analyse morphologique (lemme, POS, traits) des mots
- Mise en correspondance avec listes cibles (acquisition / référentiel)
- Indicateurs : couverture, fréquence, formes non prévues
- Stockage local (aucune donnée envoyée)

## ➕ Fonctionnalités secondaires (évolutives)
- Consultation des variantes (conjugaisons / déclinaisons)
- Suggestions de simplification (à venir)
- Historique des dictées (à venir)

## 👥 Public principal
- Enseignants du primaire / collège
- Formateurs FLE

Les apprenants ou parents peuvent l'utiliser, mais la priorité reste l'usage enseignant.

## 🖼️ Aperçu (à compléter)
_(Ajoutez ici des captures : saisie, tableau d'analyse, liste de formes cibles)_

## 🏁 Démarrage rapide
```bash
# Cloner
git clone <repo-url>
cd dictees-tauri

# Installer dépendances
yarn install

# Importer le lexique (voir section LEFFF)
yarn import-lefff

# Lancer en développement
yarn tauri dev
```

## 📦 Build
```bash
yarn tauri build
```
Les artefacts de build se trouvent dans `src-tauri/target/`.

## 📚 Lexique LEFFF
L'analyse morphologique s'appuie sur le **LEFFF 3.4** (Lexique des Formes Fléchies du Français).

Étapes :
1. Télécharger `lefff-3.4.mlex`
2. Placer dans `data/lefff/`
3. Exécuter `yarn import-lefff` (génère les index JSON dans `src-tauri/assets/`)

### Référence
```
Benoît Sagot (2010). The Lefff, a freely available and large-coverage 
morphological and syntactic lexicon for French. 
In Proceedings of the 7th international conference on Language Resources 
and Evaluation (LREC 2010), Istanbul, Turkey
```
Source : https://gforge.inria.fr/projects/lefff/
Licence du LEFFF : LGPL-LR.

## ⚙️ Détails techniques (résumé)
- Tauri (Rust) pour l'application desktop
- Vue 3 + TypeScript pour l'interface
- Stockage utilisateur : fichier JSON local `user_db.json` (aucune base SQLite) dans le répertoire de données de l'application (dépend de l'OS)
- Script d'import du lexique : `yarn import-lefff`

Structure rapide :
```
/ src               -> Interface
/ src-tauri         -> Code Rust & config
/ data/lefff        -> Fichier source mlex (non versionné)
/ src-tauri/assets  -> Index générés (formes, lemmes, mappings)
(app data dir)/user_db.json -> Données utilisateur (dictées, baseWords)
```

## 📁 Données utilisateur
Le fichier `user_db.json` est créé automatiquement au premier lancement (via Tauri) dans le dossier de données de l'application.

Exemple (simplifié) :
```json
{
  "dictees": [
    {
      "createdAt": "2025-10-19T12:34:56.000Z",
      "date": "19/10/2025",
      "title": "Dictée 3",
      "text": "Le petit chat mange.",
      "color": "#FFA500",
      "selectedWords": [
        { "lemma": "chat", "lemmaDisplay": "chat", "pos": "nc" },
        { "lemma": "manger", "lemmaDisplay": "manger", "pos": "v" },
        { "surface": "Wapiti" }
      ]
    }
  ],
  "baseWords": [
    {
      "integrated": true,
      "firstDictationId": "2025-10-18T09:11:00.000Z",
      "word": { "form": "chats", "lemma": "chat", "pos": "nc", "traits": "pluriel" }
    }
  ]
}
```

## 🔖 Format d'un référentiel (proposition)
Vous pourrez maintenir une liste cible externe (ex : `data/reference/ce2.json`) :
```json
{
  "version": 1,
  "label": "CE2 - Base 1",
  "lemmas": [
    { "lemma": "être", "pos": "v" },
    { "lemma": "avoir", "pos": "v" },
    { "lemma": "chat", "pos": "nc" },
    { "lemma": "manger", "pos": "v" }
  ]
}
```
> Intégration UI à venir. Pour l'instant, la logique interne utilise les lemmas ajoutés via le menu contextuel.

## 🔍 Script utile
```bash
yarn import-lefff   # Transforme le fichier mlex en index JSON
```

## 🧪 Pistes d'évolution
- Gestion de plusieurs référentiels d'acquisition
- Export PDF / partage
- Statistiques par séance
- Intégration audio lecture de la dictée
- Suggestions automatiques de remplacement de mots trop complexes

## 🤝 Contribution
1. Ouvrir une issue (bug / idée)
2. Discuter si gros changement
3. PR ciblée (petite, documentée)

## 🛡️ Licence
Code : MIT
Ressources linguistiques : LGPL-LR (LEFFF)

## 📬 Contact
Ouvrez une issue pour toute question ou suggestion.

---
Focalisé sur ce qui compte : voir rapidement si la dictée correspond au niveau attendu.
