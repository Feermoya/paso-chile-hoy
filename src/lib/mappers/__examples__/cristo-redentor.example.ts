/**
 * Ejemplo educativo: `PassRaw` realista (basado en análisis HTML / JSON ideal de referencia)
 * y el `PassView` resultante del mapper.
 *
 * No se ejecuta en runtime de la app; sirve como contrato y prueba manual de tipos.
 */
import { mapPassRawToView } from "@/lib/mappers/passViewMapper";
import type { PassRaw } from "@/types/pass-raw";
import type { PassView } from "@/types/pass-view";

/** Datos de referencia alineados al slug del proyecto (`cristo-redentor`). */
export const cristoRedentorRawExample: PassRaw = {
  slug: "cristo-redentor",
  routeId: 29,
  name: "Sistema Cristo Redentor",
  localityAR: "Villa Las Cuevas",
  localityCL: "Los Andes",
  provinceAR: "Mendoza",
  countryCL: "Chile",
  schedule: "09:00-21:00",
  scheduleFrom: "09:00",
  scheduleTo: "21:00",
  contact: {
    phone: "(2624) 420094",
    telHref: "tel:(2624) 420094",
  },
  gps: {
    lat: -32.8211,
    lng: -69.9232,
    geoHref: "geo:-32.8211,-69.9232",
  },
  alerts: [
    {
      source: "Vialidad Nacional",
      title: "Atención",
      description: "RN 7 tramo Tunel Internacional",
      detail: "horario de 24 hs",
    },
  ],
  currentWeather: {
    description: "Algo nublado",
    temperatureC: 20.8,
    wind: "Calma",
    visibilityKm: 15,
    sunrise: "07:00",
  },
  forecast: [
    {
      period: "Hoy por la tarde",
      description: "Tormentas fuertes",
      temperatureC: 10,
      wind: "E a 7-12 Km/h",
      visibility: "Muy mala",
    },
    {
      period: "Hoy por la noche",
      description: "Tormentas aisladas",
      temperatureC: 6,
      wind: "SO a 13-22 Km/h",
      visibility: "Regular",
    },
    {
      period: "Mañana por la madrugada",
      description: "Tormentas aisladas",
      temperatureC: 1,
      wind: "SO a 13-22 Km/h",
      visibility: "Regular",
    },
    {
      period: "Mañana por la mañana",
      description: "Parcialmente nublado",
      temperatureC: 0,
      wind: "O a 13-22 Km/h",
      visibility: "Buena",
    },
  ],
  usefulLinks: [
    {
      text: "Conocé los requisitos para entrar o salir de la Argentina.",
      url: "https://www.argentina.gob.ar/interior/migraciones/entrada-y-salida-del-pais",
    },
    {
      text: "Tené en cuenta estos consejos para circular por las rutas argentinas.",
      url: "https://www.argentina.gob.ar/justicia/derechofacil/leysimple/circulacion-vial",
    },
    {
      text: "Conocé el estado de la ruta nacional más cercana.",
      url: "https://www.argentina.gob.ar/obras-publicas/vialidad-nacional/estado-de-las-rutas#ruta7",
    },
    {
      text: "¿Cuáles alimentos podés traer y cuáles están prohibidos?",
      url: "https://www.argentina.gob.ar/senasa/informacion-al-viajero/ingresar-o-regresar-al-pais",
    },
    {
      text: "Agendate el contacto de la Cancillería Argentina más cercana en Chile.",
      url: "https://www.cancilleria.gob.ar/es/representaciones/cvalp",
    },
  ],
  providers: [
    {
      name: "Gendarmería Nacional",
      lastUpdated: "2026-01-28T11:33:00.000Z",
      lastUpdatedRaw: "28/01/2026 - 11:33",
    },
    {
      name: "Vialidad Nacional",
      lastUpdated: "2026-01-29T07:43:00.000Z",
      lastUpdatedRaw: "29/01/2026 - 7:43",
    },
    {
      name: "Servicio Meteorológico Nacional",
      lastUpdated: "2026-01-30T00:00:00.000Z",
      lastUpdatedRaw: "30/01/2026",
    },
  ],
  scrapedAt: "2026-04-09T12:00:00.000Z",
  sourceUrl:
    "https://www.argentina.gob.ar/seguridad/pasosinternacionales/detalle/ruta/29/Sistema-Cristo-Redentor",
};

export const cristoRedentorViewExample: PassView = mapPassRawToView(cristoRedentorRawExample);
