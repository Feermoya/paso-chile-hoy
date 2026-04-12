const COLORS = ["#639922", "#2563eb", "#d97706", "#dc2626", "#7c3aed"];

let debounceTimer: number | undefined;

function runConfetti(): void {
  document.querySelector(".confetti-container")?.remove();

  const container = document.createElement("div");
  container.className = "confetti-container";
  container.setAttribute("aria-hidden", "true");
  document.body.appendChild(container);

  const count = 50;
  for (let i = 0; i < count; i++) {
    const piece = document.createElement("div");
    piece.className = "confetti-piece";

    const color = COLORS[Math.floor(Math.random() * COLORS.length)]!;
    const left = Math.random() * 100;
    const delay = Math.random() * 0.8;
    const duration = 1.8 + Math.random() * 1.2;
    const size = 6 + Math.random() * 8;
    const rotation = Math.random() * 360;
    const shape = Math.random() > 0.5 ? "50%" : "2px";

    piece.style.cssText = `
      position: absolute;
      left: ${left}%;
      top: -20px;
      width: ${size}px;
      height: ${size}px;
      background: ${color};
      border-radius: ${shape};
      animation: confetti-fall ${duration}s ease-in ${delay}s forwards;
      transform: rotate(${rotation}deg);
      opacity: 1;
    `;
    container.appendChild(piece);
  }

  window.setTimeout(() => {
    container.remove();
  }, 4000);
}

/** Entre 40 y 60 partículas; el contenedor se elimina a los ~4 s. */
export function mountGraciasConfetti(): void {
  if (!document.querySelector("[data-gracias-page]")) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  if (debounceTimer !== undefined) window.clearTimeout(debounceTimer);
  debounceTimer = window.setTimeout(() => {
    debounceTimer = undefined;
    runConfetti();
  }, 32);
}
