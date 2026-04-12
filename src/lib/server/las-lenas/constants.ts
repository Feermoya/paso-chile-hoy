/** Coordenadas SMN / gob.ar para Las Leñas (location id 10868). */
export const LAS_LENAS_LAT = "-35.15";
export const LAS_LENAS_LON = "-70.0833";

/** Query wttr.in por lat,lon (misma referencia). */
export const LAS_LENAS_WTTR_QUERY = `${LAS_LENAS_LAT},${LAS_LENAS_LON}`;

/** Estación SMN habitual asociada a este punto (id en respuesta oficial). */
export const SMN_STATION_NAMES: Record<number, string> = {
  87506: "Malargüe Aero",
};
