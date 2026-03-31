import { ProductDetail, ProductImage, ProductVideo } from '../../../domain/adapters/product-detail-fetcher.interface';

/**
 * Maps a Lazada product detail API response to ProductDetail.
 * The exact shape varies by endpoint — this handles common ACS/REST API shapes.
 */
export function mapLazadaDetail(json: Record<string, unknown>): ProductDetail | null {
  // ACS shape: { data: { root: { fields: { ... } } } }
  // REST shape: { result: { ... } }  or  { data: { ... } }
  const dataObj = json?.data as Record<string, unknown> | undefined;
  const fields: Record<string, unknown> =
    (dataObj?.root as Record<string, unknown> | undefined) ??
    (json?.result as Record<string, unknown> | undefined) ??
    dataObj ??
    json;

  if (!fields || typeof fields !== 'object') return null;

  const description = extractDescription(fields);
  if (!description) return null; // Not a product detail response

  const images = extractImages(fields);
  const videos = extractVideos(fields);
  const rating = extractRating(fields);
  const reviewCount = extractReviewCount(fields);
  const categories = extractCategories(fields);

  return {
    description,
    primaryImageUrl: images[0]?.url,
    images,
    videos,
    rating,
    reviewCount,
    categories,
  };
}

function extractDescription(obj: Record<string, unknown>): string | undefined {
  const raw =
    (obj.description as string | undefined) ??
    ((obj.item as Record<string, unknown> | undefined)?.description as string | undefined) ??
    ((obj.product as Record<string, unknown> | undefined)?.description as string | undefined);
  return typeof raw === 'string' && raw.length > 0 ? raw : undefined;
}

function extractImages(obj: Record<string, unknown>): ProductImage[] {
  const candidates: unknown[] =
    (obj.images as unknown[] | undefined) ??
    ((obj.item as Record<string, unknown> | undefined)?.images as unknown[] | undefined) ??
    [];
  return candidates
    .filter((img): img is string | Record<string, unknown> => !!img)
    .flatMap((img, i) => {
      const url = typeof img === 'string' ? img : (img as Record<string, unknown>).url as string;
      return url ? [{ url, isPrimary: i === 0 } as ProductImage] : [];
    });
}

function extractVideos(obj: Record<string, unknown>): ProductVideo[] {
  const candidates: unknown[] =
    (obj.videos as unknown[] | undefined) ??
    ((obj.item as Record<string, unknown> | undefined)?.videos as unknown[] | undefined) ??
    [];
  return candidates
    .filter((v): v is Record<string, unknown> => !!v && typeof v === 'object')
    .flatMap((v) => {
      const url = (v.url as string | undefined) ?? (v.playUrl as string | undefined);
      return url ? [{ url, thumbnailUrl: v.thumbnail as string | undefined } as ProductVideo] : [];
    });
}

function extractRating(obj: Record<string, unknown>): number | undefined {
  const raw =
    (obj.rating as number | string | undefined) ??
    ((obj.item as Record<string, unknown> | undefined)?.rating as number | string | undefined);
  const n = parseFloat(String(raw));
  return isNaN(n) ? undefined : n;
}

function extractReviewCount(obj: Record<string, unknown>): number | undefined {
  const raw =
    (obj.reviewCount as number | string | undefined) ??
    (obj.review_count as number | string | undefined) ??
    ((obj.item as Record<string, unknown> | undefined)?.reviewCount as number | string | undefined);
  const n = parseInt(String(raw));
  return isNaN(n) ? undefined : n;
}

function extractCategories(obj: Record<string, unknown>): string[] {
  const candidates: unknown[] =
    (obj.breadcrumbs as unknown[] | undefined) ??
    (obj.categories as unknown[] | undefined) ??
    [];
  return candidates
    .filter((c): c is Record<string, unknown> => !!c && typeof c === 'object')
    .map((c) => (c.name ?? c.displayName ?? c.display_name) as string | undefined)
    .filter((s): s is string => typeof s === 'string');
}
