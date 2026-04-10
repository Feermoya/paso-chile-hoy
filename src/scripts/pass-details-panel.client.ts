function syncPassDetailsOpen(details: HTMLDetailsElement): void {
  const mq = window.matchMedia("(min-width: 768px)");
  details.open = mq.matches;
}

export function initPassDetailsPanels(): void {
  document.querySelectorAll("[data-pass-details]").forEach((el) => {
    const details = el;
    if (!(details instanceof HTMLDetailsElement)) return;
    syncPassDetailsOpen(details);
    const mq = window.matchMedia("(min-width: 768px)");
    const onChange = (): void => {
      syncPassDetailsOpen(details);
    };
    mq.addEventListener("change", onChange);
    document.addEventListener(
      "astro:before-swap",
      () => mq.removeEventListener("change", onChange),
      { once: true },
    );
  });
}
