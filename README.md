# Carnet de cuisine

Un carnet de recettes **écrit comme du code** : chaque recette est un fichier
[`.gram`](https://gram-lang.org) dans [`recipes/`](recipes/), et le site
public est régénéré à chaque commit puis publié sur GitHub Pages.

**→ Le site : <https://bernardstanislas.github.io/cuisine/>**

Il n'y a pas d'interface d'administration, pas de base de données, pas de CMS :
**l'édition des recettes se fait exclusivement dans les fichiers `.gram`**,
au clavier, avec une pull request comme fourneau.

## Pourquoi Gram ?

[Gram](https://gram-lang.org) est un langage de programmation pour la cuisine
de précision. Une recette y est du texte brut annoté : les ingrédients, les
ustensiles, les temps et les températures sont typés, ce qui permet de
compiler la recette — liste de courses agrégée, mise à l'échelle des
portions, chronologie, pourcentages du boulanger.

```gram
[Chauffer] Dans une #casserole{}, porter le @lait{50 cl}, le @beurre{50 g}
et la @gousse de vanille{1}(fendue et grattée) à ^{85C}. ->&lait vanillé{}
```

Le générateur (`scripts/build.mjs`) s'appuie sur le parser et le compilateur
officiels (`@gram-lang/parser`, `@gram-lang/kitchen`) : ce que le site
affiche — quantités agrégées, temps « devant le plan de travail », badges de
rétro-planning — est **calculé depuis la source**, jamais recopié à la main.

## Ajouter ou modifier une recette

1. Créer `recipes/ma-recette.gram` (le nom de fichier devient l'URL) :

   ```gram
   ---
   title: 'Ma recette'
   description: "Une phrase qui donne faim."
   category: 'Plats'        # Entrées · Plats · Desserts · Boulangerie…
   tags: [rapide, été]
   portions: 4
   ---

   [Faire] Cuire les @pâtes{400 g} dans une #casserole{} ~{11 min}.
   ```

2. Ajouter une photo `assets/img/ma-recette-hero.jpg` (1280×960) et
   `assets/img/ma-recette-card.jpg` (640×480).

3. Valider et prévisualiser :

   ```sh
   npm ci
   npm run check   # gram check --strict sur toutes les recettes
   npm run dev     # construit dist/ et le sert sur http://localhost:8000
   ```

4. Commit, push, merge : GitHub Actions reconstruit et publie le site.

### Affiner une recette (convention de commit)

L'historique d'une recette fait partie de la recette. Quand une modification
est un **affinage** (proportions ajustées après un essai, tour de main
corrigé…), committer avec la convention :

```
recette(<slug>): <commentaire au présent, comme une note de dégustation>
```

Exemple : `recette(pain-de-campagne): monter l'hydratation à 68 % après un four un peu sec`.

Chaque page de recette affiche alors la section « Affinages » : la liste de
ces commits (commentaire, date, lien vers le diff), extraite de
`git log --follow` au moment du build. Le scope `(<slug>)` est facultatif si
le commit ne touche qu'une seule recette ; le premier commit du fichier
apparaît comme « Entrée au carnet ». Les commits hors convention
(refactorings, typos) restent invisibles sur le site.

### Aide-mémoire Gram (le sous-ensemble utilisé ici)

| Syntaxe | Sens |
|---|---|
| `@farine{300 g}` | ingrédient + quantité (mise à l'échelle avec les portions) |
| `@=sel{1 pincée}` | quantité fixe (ne suit pas les portions) |
| `@?thym{}` | facultatif · `@-eau{1 l}` : hors liste de courses |
| `@jaunes d’œufs{4}<@œufs{4}` | composite : on utilise les jaunes, on achète des œufs |
| `@*farine{500 g}` / `@eau{65% @&farine}` | pourcentages du boulanger |
| `@guanciale{150 g}\|@pancetta{150 g}` | alternatives |
| `#cocotte en fonte{}` | ustensile |
| `~{30 min}` / `~_repos{2 h}` | minuteur actif / passif (repos, four) |
| `^{180C}` / `^{feu doux}` | température exacte / sémantique |
| `->&pâte{}` puis `&pâte{}` | variable intermédiaire et sa réutilisation |
| `## Marinade ~{-1d}` | section à commencer la veille (rétro-planning) |
| `[Saisir]` | verbe d'action en tête d'étape |

Dans un nom d'ingrédient, utiliser l'apostrophe typographique `’`
(`@huile d’olive{2 cs}`) — l'apostrophe droite `'` termine le nom.

## Architecture

```
recipes/*.gram            les recettes — la seule source de vérité
scripts/build.mjs         générateur : parse → compile → HTML statique
assets/                   styles, JS (filtres, portions, coches), photos
dist/                     site généré (ignoré par git)
.github/workflows/        build + déploiement GitHub Pages
PRODUCT.md · DESIGN.md    intentions produit et système de design
```

Le site est en HTML statique, lisible sans JavaScript ; le JS n'ajoute que
le confort de cuisine : filtres, mise à l'échelle des portions, étapes et
ingrédients cochables (persistés en local), écran maintenu allumé.

## Crédits

- [Gram](https://gram-lang.org) — le langage et son outillage, par
  [abiwab](https://codeberg.org/abiwab/gram) (GPL-3.0).
- Photos des plats : [Unsplash](https://unsplash.com)
  ([licence Unsplash](https://unsplash.com/license)).
