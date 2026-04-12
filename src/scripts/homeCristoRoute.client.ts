const TRAVEL_MS = 700;
const PAUSE_MS = 300;
const LOOP_WAIT_MS = 4000;
const FADE_OUT_MS = 400;
const FADE_IN_MS = 200;
const CAR_H = 26;
const MQ_MOBILE = "(max-width: 639px)";

let carRunVersion = 0;

const mountCleanups: (() => void)[] = [];

function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function activeStepsList(section: HTMLElement): HTMLElement | null {
  const mobile = window.matchMedia(MQ_MOBILE).matches;
  return section.querySelector(mobile ? ".hrr7-steps--mobile" : ".hrr7-steps--desktop");
}

function isStepMeasurable(li: HTMLElement): boolean {
  const collapsed = li.closest(".hrr7-tramos-collapsed");
  if (collapsed && !collapsed.classList.contains("hrr7-tramos-collapsed--expanded")) {
    return false;
  }
  return li.offsetHeight > 0 && li.getClientRects().length > 0;
}

function carDots(section: HTMLElement): HTMLElement[] {
  const list = activeStepsList(section);
  if (!list) return [];
  const sel =
    'li.tramo-row[data-tramo-estado="HABILITADA"] .line-dot, li.tramo-row[data-tramo-estado="PRECAUCION"] .line-dot';
  const out: HTMLElement[] = [];
  list.querySelectorAll<HTMLElement>(sel).forEach((dot) => {
    const li = dot.closest("li.tramo-row");
    if (li instanceof HTMLElement && isStepMeasurable(li)) out.push(dot);
  });
  return out;
}

function dotCenterTop(dot: HTMLElement, container: HTMLElement): number {
  const cr = container.getBoundingClientRect();
  const dr = dot.getBoundingClientRect();
  return dr.top - cr.top + dr.height / 2 - CAR_H / 2;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function runOneCycle(
  section: HTMLElement,
  carY: HTMLElement,
  myVersion: number,
): Promise<void> {
  if (prefersReducedMotion()) return;
  const track = section.querySelector<HTMLElement>(".hrr7-track");
  if (!track || carRunVersion !== myVersion) return;

  const dots = carDots(section);
  carY.getAnimations().forEach((a) => a.cancel());

  if (dots.length === 0) {
    carY.style.opacity = "1";
    carY.style.marginLeft = "-9px";
    carY.style.top = "0px";
    await sleep(1500);
    return;
  }

  const positions = dots.map((d) => Math.max(0, dotCenterTop(d, track)));
  carY.style.opacity = "1";
  carY.style.marginLeft = "-9px";
  let currentTop = positions[0];
  carY.style.top = `${currentTop}px`;

  for (let i = 0; i < positions.length; i++) {
    if (carRunVersion !== myVersion) return;
    const target = positions[i];
    const duration = i === 0 || Math.abs(target - currentTop) < 0.5 ? 0 : TRAVEL_MS;
    try {
      await carY
        .animate(
          { top: [`${currentTop}px`, `${target}px`] },
          {
            duration,
            easing: "cubic-bezier(0.4, 0, 0.2, 1)",
            fill: "forwards",
          },
        )
        .finished;
    } catch {
      return;
    }
    currentTop = target;
    if (carRunVersion !== myVersion) return;

    const dot = dots[i];
    try {
      await dot
        .animate(
          [
            { transform: "scale(1)", boxShadow: "0 0 0 0 rgba(99,153,34,0)" },
            {
              transform: "scale(1.4)",
              boxShadow: "0 0 0 5px rgba(99,153,34,0.25)",
            },
            { transform: "scale(1)", boxShadow: "0 0 0 0 rgba(99,153,34,0)" },
          ],
          { duration: 280, easing: "ease-out" },
        )
        .finished;
    } catch {
      /* ignore */
    }

    if (carRunVersion !== myVersion) return;
    await sleep(PAUSE_MS);
  }

  if (carRunVersion !== myVersion) return;

  try {
    await carY
      .animate(
        [
          { marginLeft: "-9px" },
          { marginLeft: "-12px" },
          { marginLeft: "-6px" },
          { marginLeft: "-10.5px" },
          { marginLeft: "-9px" },
        ],
        { duration: 350, easing: "ease-out" },
      )
      .finished;
  } catch {
    return;
  }

  if (carRunVersion !== myVersion) return;
  await sleep(LOOP_WAIT_MS);
  if (carRunVersion !== myVersion) return;

  try {
    await carY
      .animate([{ opacity: 1 }, { opacity: 0 }], { duration: FADE_OUT_MS, fill: "forwards" })
      .finished;
  } catch {
    return;
  }

  if (carRunVersion !== myVersion) return;
  carY.style.top = `${positions[0]}px`;

  try {
    await carY
      .animate([{ opacity: 0 }, { opacity: 1 }], { duration: FADE_IN_MS, fill: "forwards" })
      .finished;
  } catch {
    return;
  }
}

function restartCarAnimation(section: HTMLElement, carY: HTMLElement): void {
  carRunVersion++;
  const myVersion = carRunVersion;
  carY.getAnimations().forEach((a) => a.cancel());

  void (async () => {
    while (true) {
      if (prefersReducedMotion()) return;
      if (carRunVersion !== myVersion) return;
      await runOneCycle(section, carY, myVersion);
      if (carRunVersion !== myVersion) return;
    }
  })();
}

export function initHomeCristoRouteAnimation(root: HTMLElement): () => void {
  const carY = root.querySelector<HTMLElement>(".hrr7-car-y");
  if (!carY) return () => undefined;

  const run = (): void => {
    restartCarAnimation(root, carY);
  };

  requestAnimationFrame(run);

  const onResize = (): void => {
    restartCarAnimation(root, carY);
  };

  const mq = window.matchMedia(MQ_MOBILE);
  const onMq = (): void => {
    restartCarAnimation(root, carY);
  };

  const onRn7Reset = (): void => {
    if (!document.contains(root)) return;
    carY.getAnimations().forEach((a) => a.cancel());
    carY.style.opacity = "0";
    carY.style.top = "0px";
    carY.style.marginLeft = "-9px";
    requestAnimationFrame(() => restartCarAnimation(root, carY));
  };

  window.addEventListener("resize", onResize);
  mq.addEventListener("change", onMq);
  document.addEventListener("pch:rn7-route-reset", onRn7Reset);

  const onSectionClick = (e: MouseEvent): void => {
    const btn = (e.target as HTMLElement).closest(".hrr7-expand-btn");
    if (!btn || !root.contains(btn)) return;
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
    requestAnimationFrame(() => restartCarAnimation(root, carY));
  };
  root.addEventListener("click", onSectionClick);

  return () => {
    carRunVersion++;
    root.removeEventListener("click", onSectionClick);
    window.removeEventListener("resize", onResize);
    mq.removeEventListener("change", onMq);
    document.removeEventListener("pch:rn7-route-reset", onRn7Reset);
    carY.getAnimations().forEach((a) => a.cancel());
  };
}

export function mountHomeCristoRoute(): void {
  mountCleanups.splice(0).forEach((c) => c());
  document.querySelectorAll<HTMLElement>("[data-home-route-rn7]").forEach((section) => {
    mountCleanups.push(initHomeCristoRouteAnimation(section));
  });
}
