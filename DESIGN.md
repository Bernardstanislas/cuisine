# Design

## Theme

Livre de cuisine française composé comme une page de code annotée. Lumière de plein jour : fond blanc pur, encre olive-noire, un olive profond engagé (Committed) qui porte l'identité, un paprika qui porte tout ce qui chauffe (minuteurs, températures). Thème sombre « cuisine du soir » via `prefers-color-scheme`.

## Color

Palette OKLCH — la graine de marque est l'olive (hue 110–115).

```css
:root {
  --bg: oklch(1 0 0);                      /* blanc pur, jamais crème */
  --surface: oklch(0.965 0.006 115);       /* panneaux, cartes */
  --ink: oklch(0.24 0.02 115);             /* texte courant, ≥ 12:1 */
  --muted: oklch(0.45 0.02 115);           /* texte secondaire, ≥ 5:1 */
  --primary: oklch(0.42 0.09 115);         /* olive profond — identité, texte blanc dessus */
  --primary-strong: oklch(0.34 0.08 115);
  --primary-tint: oklch(0.955 0.022 115);  /* surlignage ingrédients */
  --accent: oklch(0.55 0.16 40);           /* paprika — chaleur : minuteurs, températures */
  --accent-tint: oklch(0.945 0.028 45);
  --line: oklch(0.90 0.008 115);
}
```

Règles : texte blanc sur tout aplat olive ou paprika (effet Helmholtz-Kohlrausch) ; le paprika est réservé au vocabulaire de la chaleur ; l'olive ne dépasse jamais ~40 % d'une page de recette (la cuisine se fait sur fond blanc).

## Typography

- **Titres** : Bodoni Moda (Didone française des couvertures de livres de cuisine ; optical sizing actif, uniquement ≥ 20px).
- **Texte** : Source Sans 3 — humaniste, très lisible à bout de bras sur mobile. Corps de recette ≥ 18px.
- **Mono** (`ui-monospace`, système) : réservé au clin d'œil « as-code » (lien vers la source `.gram`, badges de variables intermédiaires).
- Échelle fluide `clamp()`, ratio ≥ 1.25. `text-wrap: balance` sur les titres.

## Recipe Semantics (vocabulaire visuel du langage Gram)

- **Ingrédient dans une étape** : fond `--primary-tint`, quantité en gras.
- **Minuteur actif** : pastille paprika pleine, texte blanc, symbole ⏱.
- **Minuteur passif** (repos, four) : pastille `--accent-tint`, texte paprika foncé, symbole ◷.
- **Température** : pastille `--accent-tint` avec valeur en gras.
- **Ustensile** : souligné pointillé discret, pas de couleur.
- **Variable intermédiaire** (`->&nom` / `&nom`) : badge mono arrondi olive (`→ nom` à la déclaration, `nom` à l'usage).

## Layout

- Mobile-first, une colonne ; page recette max 68ch de texte.
- Accueil : en-tête olive drapé (Committed), cartes photo `repeat(auto-fit, minmax(280px, 1fr))`, filtres par catégorie en chips.
- Page recette : photo pleine largeur, titre, chips méta (portions · actif · total · rétro-planning), panneau ingrédients cochable avec pas-à-pas de portions, étapes numérotées cochables.

## Motion

Discret : transitions 150–250ms ease-out-quart sur hover/coche ; aucune animation de layout ; `prefers-reduced-motion` → tout instantané.
