# Componentes de interfaz

Ubicación: `src/components/*.astro` (salvo `pass-status/` y `ui/`, legado).

## StatusHero

- **Props:** `status` (`abierto` \| `condicionado` \| `cerrado` \| `sin_datos`), `passName`, `schedule`, `lastUpdatedRelative`, `officialUrl`.
- **Comportamiento:** Fondo/borde/sombra según `data-pass-status`. Punto con `pulse-dot` solo si `abierto`. Chip “Inferido · verificar en fuente”.
- **Datos:** `status` lo calcula `inferPassStatus(PassView)` en `index.astro`.

## WeatherNow

- **Props:** `weather` (`WeatherNowView`), `updatedAt` opcional (pie, p. ej. `providerNote`).
- Card con borde sutil, temperatura grande con clamp.

## WeatherForecast

- **Props:** `forecast: ForecastItemView[]`.
- Grid responsive; color de visibilidad vía `forecastVisibilityClass()`.

## AlertsBlock

- **Props:** `alerts`.
- No renderiza nada si `alerts.length === 0`.
- Estilo cobre: borde izquierdo 3px, fondo `--color-copper-subtle`.

## PassDetails

- **Props:** `view: PassView`.
- Horario, contacto (icono teléfono), GPS, enlaces útiles, proveedores, timestamp de snapshot.
- Si no hay ningún campo útil, no renderiza (usa `passDetailsHasContent`).

## Footer

- Texto legal fijo + enlace a pasos internacionales.
- Fondo `--color-bg-secondary`, tipografía pequeña.

## MainLayout

- Header del sitio, slot principal, `<Footer />` a ancho completo debajo del contenedor.
