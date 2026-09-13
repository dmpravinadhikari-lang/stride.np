/**
 * Daily sweep — SPEC §10, "auto-delete uploaded photos after 30 days".
 *
 * An R2 lifecycle rule is the primary mechanism and should be configured at
 * deploy time (docs/DEPLOY.md). This cron is the belt to that braces: it
 * catches anything written before the rule existed, and it means the retention
 * promise is visible in the code rather than only in a console setting nobody
 * remembers.
 *
 * Only `uploads/` is swept. Generated images carry no personal data and are the
 * cache's backing store — deleting them would silently start costing money.
 */
import type { Env } from './env.ts';

export async function sweepExpiredUploads(env: Env): Promise<void> {
  const now = Date.now();
  let cursor: string | undefined;
  let deleted = 0;
  let scanned = 0;

  do {
    const listing = await env.IMAGES.list({
      prefix: 'uploads/',
      cursor,
      include: ['customMetadata'],
    });

    const expired = listing.objects
      .filter((object) => {
        scanned++;
        const expiresAt = object.customMetadata?.expiresAt;
        return expiresAt ? Date.parse(expiresAt) <= now : false;
      })
      .map((object) => object.key);

    if (expired.length > 0) {
      await env.IMAGES.delete(expired);
      deleted += expired.length;
    }

    cursor = listing.truncated ? listing.cursor : undefined;
  } while (cursor);

  console.log(JSON.stringify({ type: 'sweep', scanned, deleted }));
}
