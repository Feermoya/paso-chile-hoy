/**
 * Compatibilidad con imports existentes: la fuente de verdad pasa a ser disco + `snapshotService`.
 */
export {
  getSnapshotForApi as getPassSnapshotBySlug,
  readPersistedSnapshot,
  refreshAndPersistSnapshot,
} from "@/lib/server/services/snapshotService";
