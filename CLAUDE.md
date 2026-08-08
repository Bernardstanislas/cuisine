# Carnet de cuisine — guide agent

Carnet de recettes **écrit comme du code**. Chaque recette est un fichier
`.gram` dans `recipes/`. Le site (accueil + une page par recette) est
**entièrement régénéré depuis ces fichiers** par `scripts/build.mjs`, puis
publié sur GitHub Pages à chaque commit sur `main`.

**Règle d'or : la seule source de vérité est `recipes/*.gram`.** Quantités
agrégées, temps de préparation, badges de rétro-planning, historique
« Affinages » — tout est *calculé* au build. Ne jamais écrire de HTML de
recette à la main, ne jamais éditer `dist/` (généré, ignoré par git).

---

## Ajouter une recette (le chemin rapide)

1. **Créer `recipes/<slug>.gram`.** Le nom de fichier devient l'URL
   (`/recettes/<slug>/`) et le préfixe des images. Slug en minuscules-tirets,
   sans accent : `pate-a-crepes-au-ble-noir`.

2. **Remplir le gabarit** (voir ci-dessous) : frontmatter YAML + étapes en Gram.

3. **Deux photos** dans `assets/img/`, nommées d'après le slug :
   - `assets/img/<slug>-hero.jpg` — 1280×960 (4:3), pleine largeur sur la page
   - `assets/img/<slug>-card.jpg` — 640×480 (4:3), vignette d'accueil

   Les deux sont obligatoires (le build ne les vérifie pas ; une image
   manquante = visuel cassé sur le site, pas d'erreur de build).

4. **Vérifier puis prévisualiser** :
   ```sh
   npm ci            # une seule fois (installe l'outillage Gram)
   npm run check     # gram check --strict --skip-db sur les recettes — doit passer
   npm run dev       # build + sert http://localhost:8000 (Ctrl-C pour arrêter)
   ```

5. **Committer** avec la convention `recette(<slug>): …` (voir « Affinages »).
   Le push sur `main` déclenche le rebuild et la publication.

### Gabarit à copier

```gram
---
title: 'Nom de la recette'
description: "Une phrase qui donne faim (≈ 1 ligne)."
category: 'Desserts'          # réutiliser un libellé existant (voir plus bas)
tags: [chocolat, rapide]      # 2–4 mots, servent à la recherche
portions: 6
author: ['Stanislas']
notes: "Le tour de main ou le piège à éviter — devient « Note du cuisinier »."
---

[Préchauffer] Préchauffer le #four{} à ^{160C}(chaleur tournante).

[Mélanger] Fouetter les @œufs{120 g}(env. 2 gros) avec le @sucre glace{55 g},
puis ajouter la @farine{45 g}(T55). ->&appareil{}

[Cuire] Verser l'&appareil{} dans un #moule à cake{} et enfourner ~_four{25 min}.
```

Une étape = un paragraphe (ligne vide entre chaque). Le verbe entre `[…]` en
tête est optionnel mais recommandé — il s'affiche en gras.

---

## Frontmatter (entre les `---`)

| Clé | Requis | Effet à l'affichage |
|---|---|---|
| `title` | **oui** | Titre (accueil, page, `<title>`) |
| `description` | recommandé | Sous-titre carte + page, meta OpenGraph |
| `category` | recommandé | Chip de catégorie + filtre d'accueil (défaut : « Autres ») |
| `tags` | non | Alimentent la recherche ; affichés avec la catégorie **au-dessus** du titre (page recette), pas sur les cartes. Liste `[a, b]` |
| `portions` | recommandé | Base du curseur de portions (défaut : 1) |
| `makes` | non | Rendement affiché (« 12 grosses gaufres ») ; ne remplace « pers. » que si `portions` est **absent** |
| `notes` | non | Encart « Note du cuisinier » en bas de recette |
| `source` | non | Lien « d'après <domaine> » en pied de recette |
| `photo_credit` | non | Crédit photo en pied de recette |
| `author` | non | Métadonnée, **non affichée** sur le site |

**Catégories déjà utilisées** (les réutiliser pour ne pas fragmenter les
filtres) : `Desserts`, `Accompagnements`, `Bases`. C'est du texte libre : toute
nouvelle valeur crée automatiquement un nouveau filtre sur l'accueil.

---

## Aide-mémoire Gram (la syntaxe utile pour ce carnet)

| Syntaxe | Sens |
|---|---|
| `@farine{300 g}` | ingrédient + quantité (**suit** la mise à l'échelle des portions) |
| `@=sel{1 pincée}` | `@=` quantité **fixe** (ne suit pas les portions) |
| `@?thym{}` | `@?` facultatif · `@-eau{1 l}` : présent mais hors liste de courses |
| `@jaunes d'œufs{5}<@œufs{5}` | composite : on *utilise* les jaunes, on *achète* des œufs |
| `@*farine{500 g}` … `@eau{65% @&farine}` | pourcentages du boulanger (base `@*`, référence `@&`) |
| `@guanciale{150 g}\|@pancetta{150 g}` | alternatives (« ou ») |
| `@sucre{50 g}(fondu)` | note de préparation en italique, **après un ingrédient** (ignorée après un ustensile) |
| `#cocotte en fonte{}` | ustensile (matériel) |
| `~{30 min}` | minuteur **actif** (pastille pleine) |
| `~_repos{2 h}` | minuteur **passif** nommé : repos, four, refroidissement |
| `^{180C}` / `^{feu doux}` | température exacte / sémantique |
| `->&pâte{}` puis `&pâte{}` | déclare une préparation intermédiaire, puis la réutilise |
| `## Marinade ~{-1d}` | titre de section à commencer la veille → badge rétro-planning |
| `[Saisir]` | verbe d'action en tête d'étape |

**Rétro-planning :** pour afficher le badge « à commencer la veille », mettre la
partie à préparer en avance sous un titre de section avec un décalage négatif,
p. ex. `## Montage ~{-1d}` (`-1d` = la veille, `-2h` = 2 h avant). Le badge
apparaît dès qu'une section porte un `~{-…}`.

**Préparations intermédiaires :** `->&nom{}` en fin d'étape produit une
variable (badge « → nom »), réutilisée plus loin par `&nom{}`. Ces ingrédients
intermédiaires n'apparaissent pas dans la liste de courses.

**Apostrophes :** l'apostrophe droite `'` fonctionne partout, y compris dans les
noms d'ingrédients (`@jaunes d'œufs{5}`) — c'est ce qu'emploient toutes les
recettes actuelles. La typographique `’` marche aussi mais n'est pas requise.

---

## Structure du dépôt

```
recipes/*.gram        les recettes — SEULE source de vérité
scripts/build.mjs     générateur : parse (@gram-lang/parser) → compile
                      (@gram-lang/kitchen) → HTML statique dans dist/
assets/site.css       styles ; assets/app.js : filtres, portions, coches
assets/img/           photos <slug>-hero.jpg (1280×960) + <slug>-card.jpg (640×480)
.github/workflows/    build + déploiement GitHub Pages (push sur main)
dist/                 site généré — ignoré par git, ne jamais éditer
README.md             version longue de ce guide (publique)
PRODUCT.md DESIGN.md  intentions produit et système de design
```

Le site est du HTML statique, lisible sans JavaScript ; `app.js` n'ajoute que
le confort de cuisine (filtres, mise à l'échelle des portions, étapes et
ingrédients cochables, écran maintenu allumé).

---

## Affinages (convention de commit)

L'historique d'une recette *est* affiché sur sa page (section « Affinages »,
lue depuis `git log --follow`). Pour qu'une modification y apparaisse, committer
avec un message au présent, comme une note de dégustation :

```
recette(<slug>): monter l'hydratation à 68 % après un four un peu sec
```

- Le scope `(<slug>)` est **facultatif** si le commit ne touche qu'une recette.
- Le **premier** commit d'un fichier est marqué « création » : libellé « Entrée
  au carnet » s'il ne suit pas la convention, sinon c'est son propre message.
- Les commits **hors convention** (refactor, typo, ce guide…) restent invisibles
  sur le site — les utiliser pour tout ce qui n'est pas un affinage de recette.

---

## Garde-fous

- **Ne jamais** écrire du HTML de recette à la main ni modifier `dist/` : tout
  vient de `.gram` via le build.
- **Vocabulaire cuisine dans l'interface, jamais technique** (fichier, commit,
  git, langage…). La mécanique « as-code » reste dans le README (cf. `DESIGN.md`,
  « Ton éditorial »). Cela concerne le texte visible ; le contenu des recettes
  est de toute façon culinaire.
- **Une vraie photo par plat** — jamais un aplat de couleur à la place.
- `npm run check` doit passer avant de committer (`npm run build` l'exécute
  d'abord de toute façon).
- En session autonome : ne pas pousser de fichiers `.github/workflows/*` (le
  token n'a pas le scope `workflow`).
