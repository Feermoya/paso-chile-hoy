# Espaciado, radios y layout

## Escala `--space-*`

Definida en `global.css`: `--space-1` (0.25rem) hasta `--space-16` (4rem).

Uso en componentes nuevos: `p-[var(--space-6)]`, `gap-[var(--space-4)]`, etc.

## Radios `--radius-*`

| Token | Valor | Uso típico |
|-------|-------|------------|
| `--radius-sm` | 6px | Código inline, chips pequeños |
| `--radius-md` | 10px | Focus rings, inputs |
| `--radius-lg` | 16px | Mini-cards de pronóstico |
| `--radius-xl` | 22px | Hero de estado, clima ahora, alertas |
| `--radius-pill` | 9999px | Badges |

## Layout de página

- Contenedor principal: `max-w-[960px]` centrado (`MainLayout`).
- **StatusHero**: en viewport &lt; `sm`, ancho completo vía `100vw` + centrado; altura mínima ~`58dvh` para que el estado sea visible sin scroll en muchos móviles.
- **Pronóstico**: grid `2×2` hasta `lg`, luego `4×1`.

## Transiciones

- `--transition-fast`: 150ms ease
- `--transition-base`: 250ms ease
