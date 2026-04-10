# Principios del sistema visual

1. **Estado primero** — En mobile, el usuario debe entender de inmediato si el paso se considera abierto, condicionado, cerrado o sin datos (con la salvedad de que es **inferido**).
2. **Honestidad** — Chip explícito “Inferido · verificar en fuente”; footer legal; sin copiar tono de sitio gubernamental ni de fintech.
3. **Andino sin turismo** — Paleta nocturna, azul glaciar y cobre; sin íconos de montaña, viñedos ni gradientes agresivos.
4. **Semáforo legible** — Verde / ámbar / rojo solo para estado del paso y semántica de visibilidad en pronóstico; no mezclar con “éxito” genérico de producto.
5. **Tokens únicos** — Colores y espaciado salen de variables CSS documentadas; Tailwind actúa como capa fina encima.
6. **Accesibilidad** — Skip link, `aria-labelledby` en secciones clave, contraste suficiente sobre fondos oscuros.
7. **SSR puro** — Sin hidratar lógica visual crítica en el cliente; Astro entrega HTML completo.

## Limitación conocida

El HTML oficial **no** expone `status: abierto`. La inferencia puede fallar; por eso el diseño no presenta el estado como “verdad absoluta” y refuerza el enlace a la fuente oficial.
