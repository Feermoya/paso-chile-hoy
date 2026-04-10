/** Respuesta de `/detalle_consolidado/ruta/{id}` (campos extra del backend tolerados). */
export interface ConsolidadoResponse {
  detalle: {
    id: number;
    nombre: string;
    imagen: string;
    descripcion_general: string;
    latitud: string;
    longitud: string;
    estado: {
      estado: string;
      demoras: string;
      motivo_demora: string;
      motivo_cierre: string;
      motivo_cierre_extraordinario: string;
      tiempo_entrada: string;
      tiempo_salida: string;
      observaciones: string;
      ultima_actualizacion: string;
    };
    horario_atencion: string;
    categorias_migratorias_habilitadas: string;
    operatorias_aduaneras_habilitadas: string;
    seguridad: string;
    migraciones: string;
    aduana: string;
    contacto: string;
    tipo: string;
    clima: {
      sensacion: string;
      nubosidad: string;
      temperatura: string;
      viento: string;
      velocidad: string;
      direccion: string;
      visibilidad: string;
      distancia: string;
    };
    fecha_schema: string;
    [key: string]: unknown;
  };
  vialidad: {
    ruta: string;
    tramo: string;
    estado: string;
    calzada: string;
    km: string;
    observaciones: string;
    peaje: string;
    ruta_escenica: string;
  };
}

/** Respuesta de `/detalle_clima/{lat}/{lng}` */
export interface ClimaResponse {
  temperatura: {
    date: string;
    humidity: number;
    pressure: number;
    feels_like: number | null;
    temperature: number;
    visibility: number;
    weather: {
      description: string;
      id: number;
    };
    wind: {
      direction: string;
      deg: number | null;
      speed: number | null;
    };
    station_id: number;
    location: {
      id: number;
      name: string;
      department: string;
      province: string;
      type: string;
      coord: { lon: number; lat: number };
      distance: number;
    };
  };
  puesta_sol: string;
  salida_sol: string;
}
