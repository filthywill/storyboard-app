import { usePageStore } from '@/store/pageStore';
import { useShotStore } from '@/store/shotStore';
import { useProjectStore } from '@/store/projectStore';

/**
 * Reconcile pages from canonical shotOrder without using React hooks in caller.
 * Safe to call from non-React contexts (e.g., during project switch).
 */
export function reconcileFromShotOrderNonHook(): void {
  const pageStore = usePageStore.getState();
  const shotStore = useShotStore.getState();
  const projectStore = useProjectStore.getState();

  const pages = pageStore.pages;
  const shotOrder = shotStore.shotOrder;

  try {
    const pageIds = new Set<string>();
    pages.forEach(p => p.shots.forEach(id => pageIds.add(id)));
    const orderIds = new Set<string>(shotOrder);
    let mismatch = false;
    if (pageIds.size !== orderIds.size) mismatch = true;
    else {
      for (const id of pageIds) if (!orderIds.has(id)) { mismatch = true; break; }
    }
    if (mismatch) {
      console.log('[reconcile-nonhook] Detected mismatch. Normalizing from shotOrder.', {
        pageCount: pages.length,
        pageIdCount: pageIds.size,
        orderCount: orderIds.size,
      });
    } else {
      console.debug('[reconcile-nonhook] No mismatch detected. Ensuring layout matches shotOrder.');
    }
  } catch (_) {}

  // Project pages strictly from shotOrder by capacity
  if (!pages.length) return;
  const firstPage = pages[0];
  const capacity = firstPage.gridRows * firstPage.gridCols;

  // Ensure enough pages (no-op if capacity already sufficient)
  const needed = Math.ceil((shotOrder.length || 0) / (capacity || 1)) || 1;
  while (pageStore.pages.length < needed) {
    const newId = pageStore.createPage(`Page ${pageStore.pages.length + 1}`);
    const fp = pageStore.pages[0];
    if (fp) {
      pageStore.updateGridSize(newId, fp.gridRows, fp.gridCols);
      pageStore.updatePageAspectRatio(newId, fp.aspectRatio);
    }
  }

  // Assign slices
  pageStore.pages.forEach((p, idx) => {
    const start = idx * capacity;
    const end = start + capacity;
    const slice = shotOrder.slice(start, end);
    pageStore.reorderShotsInPage(p.id, slice);
  });

  // Remove trailing empty pages (keep at least one)
  const updated = pageStore.pages;
  const nonEmpty = updated.filter(p => p.shots.length > 0);
  const empties = updated.slice(nonEmpty.length);
  if (empties.length && updated.length > 1 && nonEmpty.length > 0) {
    empties.forEach(p => pageStore.deletePage(p.id));
  }

  // Single renumber pass
  shotStore.renumberAllShotsImmediate(projectStore.templateSettings.shotNumberFormat);
}


