# Design

## Theme

Livre de cuisine française, sobre et appétissant. Lumière de plein jour : fond blanc pur, encre chaude, un bordeaux profond (Restrained) qui porte l'identité en petites touches, un ambre qui porte tout ce qui chauffe (minuteurs, températures). L'accueil est typographique sur fond blanc — **pas de bloc de couleur drapé** (essayé en olive, rejeté). Thème sombre « cuisine du soir » via `prefers-color-scheme`.

## Color

Palette OKLCH — la couleur de marque est le bordeaux (hue ~20).

```css
:root {
  --bg: oklch(1 0 0);                     /* blanc pur, jamais crème */
  --surface: oklch(0.966 0.005 20);       /* panneaux, cartes */
  --ink: oklch(0.24 0.015 20);            /* texte courant, ≥ 12:1 */
  --muted: oklch(0.45 0.015 20);          /* texte secondaire, ≥ 5:1 */
  --primary: oklch(0.40 0.13 20);         /* bordeaux — identité, texte blanc dessus */
  --primary-strong: oklch(0.32 0.12 20);
  --primary-tint: oklch(0.96 0.016 20);   /* surlignage ingrédients */
  --accent: oklch(0.55 0.15 55);          /* ambre brûlé — chaleur : minuteurs, températures */
  --accent-tint: oklch(0.945 0.03 55);
  --line: oklch(0.90 0.007 20);
}
```

Règles : texte blanc sur tout aplat bordeaux ou ambre (effet Helmholtz-Kohlrausch) ; l'ambre est réservé au vocabulaire de la chaleur ; le bordeaux reste un accent (liens, chiffres, badges) — la couleur des pages vient des photos.

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
- **Variable intermédiaire** (`->&nom` / `&nom`) : badge mono arrondi bordeaux (`→ nom` à la déclaration, `nom` à l'usage).

**Ton éditorial** : jamais de vocabulaire technique dans l'interface (fichier, commit, git, langage, JSON…). La mécanique as-code reste dans le README ; le site parle cuisine. Les seuls liens vers le dépôt : « Code source & recettes » (accueil), « Texte source de la recette » et « voir la modification » (page recette).

## Layout

- Mobile-first, une colonne ; page recette max 68ch de texte.
- Accueil : en-tête typographique blanc (Bodoni, « cuisine » en italique bordeaux), cartes photo `repeat(auto-fit, minmax(280px, 1fr))`, filtres par catégorie en chips.
- Page recette : photo pleine largeur, titre, chips méta (portions · actif · total · rétro-planning), panneau ingrédients cochable avec pas-à-pas de portions, étapes numérotées cochables.

## Motion

Discret : transitions 150–250ms ease-out-quart sur hover/coche ; aucune animation de layout ; `prefers-reduced-motion` → tout instantané.
