# Paleta y tokens de color

Todos los tokens viven en `:root` dentro de `src/styles/global.css`.

## Fondos

| Token | Uso |
|-------|-----|
| `--color-bg-base` | Fondo global de página (noche andina) |
| `--color-bg-secondary` | Footer legal, zonas secundarias |
| `--color-surface` | Cards principales (clima ahora) |
| `--color-surface-raised` | Cards elevadas, bloques de pronóstico |
| `--color-surface-overlay` | Overlays sutiles |

## Texto

| Token | Uso |
|-------|-----|
| `--color-text-primary` | Títulos y cuerpo principal |
| `--color-text-secondary` | Descripciones, valores en filas |
| `--color-text-muted` | Labels uppercase, metadata |
| `--color-text-disabled` | Estados inactivos |

## Acentos

| Token | Uso |
|-------|-----|
| `--color-accent` | Links, foco, interacción principal (azul andino) |
| `--color-accent-soft` / `--color-accent-muted` / `--color-accent-subtle` | Variantes de profundidad |
| `--color-copper` / `--color-copper-soft` / `--color-copper-subtle` | Advertencias (bloque de alertas), acento cálido |

## Estados del paso (semáforo)

Cada estado tiene variante base, `-soft`, `-muted`, `-subtle`, `-border` (donde aplica).

- **Abierto** — `--color-open*` (verde seco). Glow suave: `--shadow-glow-open`.
- **Condicionado** — `--color-conditional*` (ámbar). Glow: `--shadow-glow-conditional`.
- **Cerrado** — `--color-closed*` (rojo seco). Glow: `--shadow-glow-closed`.
- **Sin datos** — `--color-unknown*`.

**Importante:** el estado mostrado se **infiere** en servidor (`inferPassStatus`); no viene de un campo oficial.

## Bordes y sombras

- `--color-border-subtle` / `--color-border-default` / `--color-border-strong`
- `--shadow-card`, `--shadow-status`, `--shadow-glow-*`

## Tailwind

`tailwind.config.mjs` mapea alias (`page`, `surface`, `ink`, `accent`, `pass`, etc.) a estos mismos `var(--...)`.
