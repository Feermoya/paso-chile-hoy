# Paso Chile Hoy

Web informativa para consultar el estado del Paso Cristo Redentor / Los Libertadores entre Mendoza y Chile, con foco en claridad, rapidez y futura automatización mediante fuentes oficiales, clima y alertas.

## Stack actual

- [Astro](https://astro.build/)
- TypeScript
- [Tailwind CSS](https://tailwindcss.com/)

## Objetivo actual

Construir una base frontend moderna, minimalista, responsive y escalable.

## Visión futura

- Integración con fuentes oficiales
- Actualización automática del estado
- Soporte para múltiples pasos fronterizos
- Alertas y requisitos para cruzar

## Requisitos

- Node.js **18.14.1** o superior (recomendado LTS actual)

## Scripts

| Comando       | Descripción                |
| ------------- | -------------------------- |
| `npm install` | Instala dependencias       |
| `npm run dev` | Servidor de desarrollo     |
| `npm run build` | Compila para producción (`astro check` + build) |
| `npm run preview` | Previsualiza el build localmente |

## Estado del proyecto

**Fase inicial de construcción.** Los datos mostrados son **mock** con fines de diseño y arquitectura; no reflejan el estado real del paso. Antes de viajar, consultá siempre fuentes oficiales.

## Estructura (resumen)

- `src/layouts` — layouts y shell de página
- `src/components/ui` — piezas de interfaz genéricas
- `src/components/pass-status` — UI del dominio “estado del paso”
- `src/data` — datos mock (reemplazables por API más adelante)
- `src/types` — modelos TypeScript
- `src/utils` — formateo y helpers de presentación
- `src/content` — reservado para contenido estático (Markdown, etc.)

## Licencia

Privado (repositorio `paso-chile-hoy`).
