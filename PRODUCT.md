# Product

## Register

brand

## Users

Stanislas (l'auteur) et toute personne à qui il partage le lien. Contexte principal : un téléphone posé contre un saladier dans une cuisine éclairée en plein jour, mains occupées, besoin de lire vite et de loin. Contexte secondaire : feuilleter le carnet depuis un canapé pour choisir quoi cuisiner.

## Product Purpose

« Cuisine » est un carnet de recettes public, versionné comme du code : les recettes sont écrites en langage Gram (`.gram`), la seule façon de les éditer, et le site est régénéré à chaque commit puis publié sur GitHub Pages. Succès = une recette se lit d'un coup d'œil en cuisinant, et l'ajout d'une recette est un simple commit.

## Brand Personality

Précis, appétissant, artisanal. L'objet physique de référence : un vieux livre de cuisine française (Didones à la Saint-Ange) annoté avec la rigueur d'un fichier source. L'émotion : la confiance tranquille d'une recette écrite par quelqu'un qui l'a vraiment cuisinée.

## Anti-references

- Les sites de recettes à publicité : pop-ups, pavés d'histoire personnelle avant la recette, listes noyées.
- Le « blog food » beige-crème générique (fond parchemin, Playfair italique, eyebrows en majuscules espacées).
- Tout ce qui ressemble à un template SaaS (hero-metric, grilles de cartes identiques icône+titre+texte).

## Design Principles

1. **La recette d'abord** — chaque écran de recette est optimisé pour cuisiner : gros corps de texte, quantités en évidence, états cochables, rien entre le titre et les ingrédients.
2. **La sémantique du langage est visible** — ingrédients, minuteurs, températures et variables intermédiaires du langage Gram sont typés visuellement ; le site rend palpable le fait que la recette est du code.
3. **La chaleur est dans la couleur, pas dans le fond** — fond blanc pur pour la lisibilité en cuisine ; l'olive profond porte l'identité, le paprika porte la chaleur (temps et températures).
4. **Une photo décisive par plat** — l'image donne faim ; jamais de bloc coloré à la place d'une photo.

## Accessibility & Inclusion

Contraste corps de texte ≥ 4.5:1 (cible 7:1), cibles tactiles ≥ 44px, `prefers-reduced-motion` respecté, thème sombre via `prefers-color-scheme`, HTML sémantique (le site doit rester lisible sans JavaScript — le JS n'apporte que filtres, coche et mise à l'échelle).
