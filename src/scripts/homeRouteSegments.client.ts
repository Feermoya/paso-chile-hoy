const mountCleanups: (() => void)[] = [];

function setExpanded(card: HTMLElement, expanded: boolean): void {
  const btn = card.querySelector<HTMLButtonElement>(".rutas-expand-btn");
  const body = card.querySelector<HTMLElement>(".rutas-tramos-body");
  if (!btn || !body) return;

  body.classList.toggle("rutas-tramos-body--expanded", expanded);
  card.classList.toggle("ruta-card--expanded", expanded);
  btn.setAttribute("aria-expanded", expanded ? "true" : "false");
  body.setAttribute("aria-hidden", expanded ? "false" : "true");
}

function toggleCard(card: HTMLElement): void {
  const body = card.querySelector<HTMLElement>(".rutas-tramos-body");
  const expanded = body?.classList.contains("rutas-tramos-body--expanded") ?? false;
  const next = !expanded;
  setExpanded(card, next);
  if (next) card.dataset.expanded = "true";
}

function wireAccordion(card: HTMLElement): () => void {
  const onClick = (e: MouseEvent): void => {
    const btn = (e.target as HTMLElement).closest(".hrr7-expand-btn");
    if (!btn || !card.contains(btn)) return;
    const wasExpanded = btn.getAttribute("aria-expanded") === "true";
    const nextExpanded = !wasExpanded;
    btn.setAttribute("aria-expanded", String(nextExpanded));
    const panel = btn.parentElement?.querySelector(".hrr7-tramos-collapsed");
    if (panel) {
      panel.classList.toggle("hrr7-tramos-collapsed--expanded", nextExpanded);
    }
    const icon = btn.querySelector(".hrr7-expand-icon");
    if (icon) icon.textContent = nextExpanded ? "−" : "+";
    const label = btn.querySelector<HTMLElement>(".hrr7-expand-label");
    if (label) {
      const c = label.dataset.textCollapsed;
      const ex = label.dataset.textExpanded;
      if (c && ex) label.textContent = nextExpanded ? ex : c;
    }
  };
  card.addEventListener("click", onClick);
  return () => card.removeEventListener("click", onClick);
}

function initRutaCard(card: HTMLElement): () => void {
  const btn = card.querySelector<HTMLButtonElement>(".rutas-expand-btn");
  const body = card.querySelector<HTMLElement>(".rutas-tramos-body");
  if (!btn || !body) return () => undefined;

  body.setAttribute("aria-hidden", "true");

  const onExpandClick = (e: MouseEvent): void => {
    if ((e.target as HTMLElement).closest(".rutas-expand-btn") !== btn) return;
    e.preventDefault();
    toggleCard(card);
  };
  btn.addEventListener("click", onExpandClick);

  const offAccordion = wireAccordion(card);

  return () => {
    btn.removeEventListener("click", onExpandClick);
    offAccordion();
  };
}

function attachStaleRefreshDelegation(): () => void {
  const h = (e: Event): void => {
    const t = (e.target as HTMLElement).closest(".rutas-refresh-inline");
    if (!t) return;
    e.preventDefault();
    window.location.reload();
  };
  document.addEventListener("click", h);
  return () => document.removeEventListener("click", h);
}

export function mountHomeRouteSegments(): void {
  mountCleanups.splice(0).forEach((c) => c());
  document.querySelectorAll<HTMLElement>("[data-ruta-card]").forEach((card) => {
    mountCleanups.push(initRutaCard(card));
  });
  mountCleanups.push(attachStaleRefreshDelegation());
}

/** @deprecated usar mountHomeRouteSegments */
export function mountHomeCristoRoute(): void {
  mountHomeRouteSegments();
}
