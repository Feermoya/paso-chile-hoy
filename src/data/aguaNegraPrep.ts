/**
 * Preparación del cruce por Agua Negra.
 * Resumen de la guía pública del Gobierno de San Juan (no es una copia de esas páginas).
 * Fuente: https://aguanegra.sanjuan.gob.ar/antes-de-cruzar
 */

export const AGUA_NEGRA_PREP_SOURCE = {
  guide: "https://aguanegra.sanjuan.gob.ar/antes-de-cruzar",
  people: "https://aguanegra.sanjuan.gob.ar/documentacion-y-normativas/documentacion-personas",
  minors: "https://aguanegra.sanjuan.gob.ar/documentacion-y-normativas/documentacion-personas#4-1-2-title",
  vehicles: "https://aguanegra.sanjuan.gob.ar/documentacion-y-normativas/documentacion-vehiculos",
  safety: "https://aguanegra.sanjuan.gob.ar/seguridad-y-salud",
  emergencies: "https://aguanegra.sanjuan.gob.ar/contacto-y-emergencias",
  status: "https://aguanegra.sanjuan.gob.ar/estado-del-paso",
  checklistPdf: "https://drive.google.com/file/d/1HFVAa94kIEW-QLBfMWLgQ2R7P0azqEee/view",
  gpx: "https://aguanegra.sanjuan.gob.ar/files/mapas/paso-agua-negra.gpx",
  kml: "https://aguanegra.sanjuan.gob.ar/files/mapas/paso-agua-negra.kml",
} as const;

export const aguaNegraFuelStops = [
  {
    name: "YPF ACA Las Flores",
    side: "Argentina",
    tone: "ar",
    where: "Ruta Nacional 150",
    hours: ["Playa: 05:00 a 00:00", "Servicompras: 07:00 a 22:00"],
    note: "Última estación segura antes de subir.",
    badge: "Punto crítico",
    map: "https://maps.app.goo.gl/ZMeQBZy2B4iyQxwu6",
  },
  {
    name: "Aramco",
    side: "Chile",
    tone: "cl",
    where: "Ruta 41",
    hours: ["Abierto las 24 horas"],
    note: "Primera estación al bajar hacia Chile.",
    badge: "",
    map: "https://maps.app.goo.gl/QoNJ9VtkmSHnt2Du8",
  },
] as const;

export const aguaNegraEssentials = [
  { icon: "lucide:fuel", label: "Combustible", value: "230 km sin estaciones." },
  { icon: "lucide:droplets", label: "Agua", value: "Mínimo 2 L por persona." },
  { icon: "lucide:utensils", label: "Alimentos", value: "Livianos y calóricos." },
  { icon: "lucide:shirt", label: "Abrigo", value: "Sistema de capas." },
  { icon: "lucide:banknote", label: "Efectivo", value: "Sin cajeros en la ruta." },
] as const;

export const aguaNegraChecklist = [
  {
    icon: "lucide:id-card",
    title: "Documentación personal",
    teaser: "DNI o pasaporte físico, vigente, para todos los ocupantes.",
    body: "Tiene que ser el último ejemplar, en buen estado, y servir tanto para salir como para volver. Una foto en el celular no alcanza. Quien entra con otra nacionalidad necesita pasaporte y, si el convenio lo pide, visa. Si viaja un menor con los dos padres, sumá un documento del vínculo. Si falta un progenitor, hace falta la autorización de viaje al exterior, en Migraciones o ante escribano.",
    href: AGUA_NEGRA_PREP_SOURCE.people,
    linkLabel: "Requisitos de personas",
  },
  {
    icon: "lucide:car",
    title: "Documentación del vehículo",
    teaser: "Cédula verde o azul, seguro internacional y RTO al día.",
    body: "Licencia vigente y seguro con cobertura en el Mercosur. Si maneja un tercero, cédula azul a su nombre (Mi Argentina puede servir: guardá captura) o autorización de escribano, y igual la cédula verde. Un auto alquilado necesita la autorización de circulación en el Mercosur. Chile pide además el SOAPEX, que se muestra en el celular. Los cristales tienen que tener el dominio grabado.",
    href: AGUA_NEGRA_PREP_SOURCE.vehicles,
    linkLabel: "Requisitos del vehículo",
  },
  {
    icon: "lucide:wrench",
    title: "Estado del vehículo",
    teaser: "Frenos, fluidos, luces y neumáticos, incluida la de auxilio.",
    body: "Revisalo antes de salir de la ciudad. En la bajada el freno se recalienta si lo usás de continuo: conviene bajar en 2.ª o 3.ª.",
    href: AGUA_NEGRA_PREP_SOURCE.safety,
    linkLabel: "Seguridad y salud",
  },
  {
    icon: "lucide:backpack",
    title: "Equipamiento",
    teaser: "Botiquín, matafuegos, balizas, chaleco reflectante y eslinga.",
    body: "También pueden pedir gato, llave cruz y rueda de auxilio. En la guía de seguridad figura oxígeno portátil. Gendarmería y Carabineros pueden controlar estos elementos.",
    href: AGUA_NEGRA_PREP_SOURCE.safety,
    linkLabel: "Lista de seguridad",
  },
  {
    icon: "lucide:smartphone",
    title: "Teléfono",
    teaser: "Mapas offline. En alta montaña no hay señal.",
    body: "Hay puntos SOS del Gobierno de San Juan (red “SJ Innova”) con conexión solo para emergencias, cámara y botón al CISEM. No sirven para navegar.",
    href: AGUA_NEGRA_PREP_SOURCE.safety,
    linkLabel: "Mapa y puntos de la ruta",
  },
] as const;

export const aguaNegraDriving = [
  "Velocidad de precaución: 60 km/h en rectas y 40 km/h en curvas.",
  "En las bajadas, marchas bajas (2.ª o 3.ª). No frenes de continuo: el freno se recalienta.",
  "Luces bajas encendidas todo el día, de los dos lados de la cordillera.",
  "Puede cruzar fauna (guanacos, zorros). No adelantes en curvas, puentes, pendientes ni con línea amarilla.",
  "Pará solo en miradores o en banquinas anchas.",
  "Menores de 10 años, atrás. Silla o booster hasta los 10 años o 1,50 m. Cinturón para todos.",
] as const;

export const aguaNegraAltitude = {
  lead: "El paso está cerca de los 4.780 m. El mal agudo de montaña puede aparecer por encima de los 2.500 m, aunque la persona esté acostumbrada a viajar.",
  symptoms: "Dolor de cabeza, cansancio, mareos, náuseas o falta de aire.",
  warning:
    "Quien tenga una enfermedad cardíaca o respiratoria, hipertensión no controlada o un embarazo avanzado tiene que consultar al médico antes de subir.",
  actions: [
    { level: "Molestia leve", text: "Pará, descansá e hidratate. No sigas subiendo hasta mejorar." },
    { level: "Vómitos o dolor fuerte", text: "Bajá al menos 500 m. Oxígeno si lo tenés." },
    { level: "Confusión o no puede respirar", text: "Es una emergencia. Hay que evacuar. 911 en Argentina o 133 en Chile." },
  ],
} as const;

export const aguaNegraPhones = [
  { label: "CISEM San Juan", detail: "Policía, bomberos y ambulancia", tel: "911", display: "911" },
  { label: "Emergencias médicas", detail: "Argentina, riesgo vital", tel: "107", display: "107" },
  { label: "Gendarmería Las Flores", detail: "Escuadrón en la ruta", tel: "+542647497002", display: "02647 497-002" },
  { label: "Gendarmería Jáchal", detail: "Escuadrón 25", tel: "+542647420473", display: "02647 420-473" },
  { label: "SAMU Chile", detail: "Ambulancia", tel: "131", display: "131" },
  { label: "Carabineros", detail: "Chile", tel: "133", display: "133" },
  { label: "Bomberos Chile", detail: "Incendio y rescate vial", tel: "132", display: "132" },
] as const;

export const aguaNegraFaq = [
  {
    q: "¿Puedo cruzar de noche?",
    a: "No. El paso opera de día. El horario de hoy está en el estado de esta página; confirmalo también en el parte de San Juan si el dato de acá está viejo.",
  },
  {
    q: "¿Alcanza Mi Argentina en vez de la cédula?",
    a: "Para un conductor que no es el titular, la cédula azul puede mostrarse desde Mi Argentina. La cédula verde física del auto sigue siendo obligatoria.",
  },
  {
    q: "¿Qué hago si se me cierra el paso cerca de la aduana?",
    a: "Buscá alojamiento en el pueblo más cercano y esperá el horario de reapertura. No sigas si el parte dice cerrado.",
  },
  {
    q: "¿Qué es “tránsito con precaución”?",
    a: "El camino se puede usar, pero hay riesgo. Bajá la velocidad y aumentá la distancia.",
  },
  {
    q: "¿Hay internet en el camino?",
    a: "No de forma continua. Los puntos SOS dan conexión solo para una emergencia, no para navegar.",
  },
  {
    q: "¿Puedo llevar una mascota?",
    a: "Hace falta certificado de salud de un veterinario de los 10 días anteriores, certificado antirrábico (original y copia), certificado del antiparasitario interno y externo (original y copia), y fotocopia del DNI o pasaporte de quien viaja con el animal.",
  },
  {
    q: "¿Qué hago si pierdo los documentos en Chile?",
    a: "Denuncia en la oficina de Carabineros más cercana y contacto con el Consulado argentino en Valparaíso. El directorio está en la página de emergencias de San Juan.",
  },
  {
    q: "¿Dónde pido ayuda si me siento mal?",
    a: "La guía indica Guardia Vieja para primeros auxilios. En Argentina, 107 o 911. En Chile, 131 (ambulancia) o 133 (Carabineros).",
  },
] as const;
