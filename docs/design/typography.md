# Tipografía

## Fuentes

| Rol | Familia | Carga |
|-----|---------|--------|
| Display / estados / números grandes | **Sora** | Google Fonts |
| Cuerpo / UI | **DM Sans** | Google Fonts |
| Monoespaciado | **JetBrains Mono** | Google Fonts |

Declaradas en CSS como:

- `--font-display`
- `--font-body`
- `--font-mono`

`MainLayout.astro` incluye el `<link>` único de Google Fonts (Sora + DM Sans + JetBrains Mono).

## Escala sugerida

| Uso | Aproximación |
|-----|----------------|
| Estado en hero | `text-2xl`–`text-3xl`, `font-bold`, `font-display` |
| Temperatura | `clamp(3rem, 8vw, 5rem)`, `font-light`, `tabular-nums` |
| Títulos de sección | `text-xl`–`text-2xl`, `font-semibold`, `font-display` |
| Cuerpo | `text-sm`–`text-base` |
| Labels uppercase | `text-[0.65rem]`–`text-xs`, `tracking-[0.08em]`–`0.14em`, `text-muted` |
| Legal / footer | `text-[0.75rem]`, color muted |

## Reglas

- No usar Inter, Roboto ni Arial como fuentes principales.
- Números grandes: `font-variant-numeric: tabular-nums` y `letter-spacing` ligeramente negativo en temperatura.
