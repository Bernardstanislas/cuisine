// Progressive enhancement : filtres (accueil), portions + coches + écran allumé (recette).
// Le site reste entièrement lisible sans ce fichier.
(() => {
  "use strict";

  // ---------------------------------------------------------- accueil
  const cards = document.getElementById("cards");
  if (cards) {
    const chips = [...document.querySelectorAll(".chip")];
    const search = document.getElementById("search");
    const empty = document.getElementById("empty");
    let category = "";

    const fold = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
    const apply = () => {
      const q = fold((search.value || "").trim());
      let shown = 0;
      for (const card of cards.children) {
        const okCat = !category || card.dataset.category === category;
        const okQ = !q || card.dataset.search.includes(q);
        const on = okCat && okQ;
        card.hidden = !on;
        if (on) shown++;
      }
      empty.hidden = shown > 0;
    };

    for (const chip of chips) {
      chip.addEventListener("click", () => {
        category = chip.dataset.filter;
        chips.forEach((c) => c.classList.toggle("is-on", c === chip));
        apply();
      });
    }
    search.addEventListener("input", apply);
    return;
  }

  // ------------------------------------------------------------ recette
  const main = document.querySelector("main.recipe");
  if (!main) return;

  const slug = document.body.dataset.recipe;
  const KEY = `cuisine:${slug}`;
  const base = Number(main.dataset.portions) || 1;

  let state = { portions: base, checked: [] };
  try {
    const saved = JSON.parse(localStorage.getItem(KEY));
    if (saved && typeof saved === "object") state = { portions: saved.portions || base, checked: saved.checked || [] };
  } catch {}

  const save = () => {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {}
  };

  // — quantités ajustables
  const out = document.getElementById("portions");
  const fmt = (n) => {
    const r = n >= 100 ? Math.round(n) : Math.round(n * 100) / 100;
    return String(r).replace(".", ",");
  };

  const rescale = () => {
    const k = state.portions / base;
    for (const el of main.querySelectorAll("[data-qty], [data-qty-min]")) {
      if (el.dataset.qtyMin) {
        el.textContent = el.textContent.replace(/^[\d,.–]+/, `${fmt(el.dataset.qtyMin * k)}–${fmt(el.dataset.qtyMax * k)}`);
      } else {
        const unitText = el.textContent.replace(/^[\d\s,./½⅓⅔¼¾–]+/, "");
        el.textContent = `${fmt(el.dataset.qty * k)}${unitText ? ` ${unitText}` : ""}`;
      }
    }
    out.textContent = state.portions;
  };

  for (const btn of main.querySelectorAll("[data-portions-delta]")) {
    btn.addEventListener("click", () => {
      const next = state.portions + Number(btn.dataset.portionsDelta);
      if (next < 1 || next > 96) return;
      state.portions = next;
      rescale();
      save();
    });
  }

  // — coches (ingrédients + étapes)
  const applyCheck = (btn, on) => {
    btn.setAttribute("aria-pressed", String(on));
    btn.closest(".step")?.classList.toggle("done", on);
  };

  for (const btn of main.querySelectorAll("[data-check]")) {
    const id = btn.dataset.check;
    if (state.checked.includes(id)) applyCheck(btn, true);
    btn.addEventListener("click", () => {
      const on = btn.getAttribute("aria-pressed") !== "true";
      applyCheck(btn, on);
      state.checked = on ? [...state.checked, id] : state.checked.filter((x) => x !== id);
      save();
    });
  }

  const reset = document.getElementById("reset");
  reset.hidden = false;
  reset.addEventListener("click", () => {
    state = { portions: base, checked: [] };
    save();
    for (const btn of main.querySelectorAll("[data-check]")) applyCheck(btn, false);
    rescale();
  });

  // — garder l'écran allumé pendant la cuisine
  const wl = document.getElementById("wakelock");
  if ("wakeLock" in navigator) {
    wl.hidden = false;
    let lock = null;
    const release = () => { lock?.release().catch(() => {}); lock = null; wl.setAttribute("aria-pressed", "false"); };
    wl.addEventListener("click", async () => {
      if (lock) return release();
      try {
        lock = await navigator.wakeLock.request("screen");
        wl.setAttribute("aria-pressed", "true");
        lock.addEventListener("release", () => { lock = null; wl.setAttribute("aria-pressed", "false"); });
      } catch {}
    });
    document.addEventListener("visibilitychange", async () => {
      if (document.visibilityState === "visible" && wl.getAttribute("aria-pressed") === "true" && !lock) {
        try { lock = await navigator.wakeLock.request("screen"); } catch {}
      }
    });
  }

  if (state.portions !== base) rescale();
})();
