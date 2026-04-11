/**
 * Compatibilidad con imports existentes: lectura/escritura unificada vía `snapshotService` + `passSnapshotStorage` (Redis en prod si hay KV; archivo fuera de Vercel).
 */
export {
  getSnapshotForApi as getPassSnapshotBySlug,
  readPersistedSnapshot,
  refreshAndPersistSnapshot,
  refreshPassSnapshot,
} from "@/lib/server/services/snapshotService";
