import { useEffect, useState, useCallback } from 'react';
import { X } from 'lucide-react';
import { getGallery } from '../lib/api';
import type { GalleryItem } from '../lib/api';

export const GalleryPage = () => {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [lightbox, setLightbox] = useState<GalleryItem | null>(null);

  const loadPage = useCallback(async (pageNum: number) => {
    setLoading(true);
    try {
      const data = await getGallery(pageNum, 20);
      setItems((prev) => (pageNum === 1 ? data.items : [...prev, ...data.items]));
      setHasMore(data.hasMore);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPage(1);
  }, [loadPage]);

  const handleLoadMore = () => {
    const next = page + 1;
    setPage(next);
    loadPage(next);
  };

  return (
    <div className="min-h-screen bg-[#FAF8F6] pt-[5.85rem] md:pt-[6.25rem]">
      {/* Header */}
      <section className="px-[var(--spacing-margin-mobile)] py-16 lg:px-[var(--spacing-margin-desktop)]">
        <div className="mx-auto w-full max-w-[1240px] text-center">
          <span className="text-[11px] font-bold tracking-widest text-primary uppercase">VISUAL STORIES</span>
          <h1 className="mt-4 font-serif text-4xl md:text-5xl font-normal tracking-tight text-on-surface">
            The Gallery
          </h1>
          <p className="mt-4 text-base text-secondary max-w-2xl mx-auto leading-relaxed font-serif italic">
            A curated collection of moments captured across our properties.
          </p>
        </div>
      </section>

      {/* Gallery Grid */}
      <section className="px-[var(--spacing-margin-mobile)] pb-24 lg:px-[var(--spacing-margin-desktop)]">
        <div className="mx-auto w-full max-w-[1240px]">
          <div className="columns-1 gap-4 sm:columns-2 lg:columns-3 xl:columns-4 [column-fill:_balance]">
            {items.map((item, index) => (
              <div
                key={item.key}
                className="break-inside-avoid mb-4 group cursor-pointer rounded-sm overflow-hidden shadow-card hover:shadow-ambient transition-all duration-500"
                onClick={() => setLightbox(item)}
              >
                <img
                  src={item.url}
                  alt={`Gallery image ${index + 1}`}
                  className="w-full h-auto object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                  loading="lazy"
                />
              </div>
            ))}
          </div>

          {/* Load More */}
          {hasMore && (
            <div className="mt-16 flex justify-center">
              <button
                onClick={handleLoadMore}
                disabled={loading}
                className="text-xs font-bold tracking-widest bg-on-surface hover:bg-[#735c00] disabled:bg-secondary/40 text-white py-4 px-12 transition-all uppercase rounded-none"
              >
                {loading ? 'Loading...' : 'Load More'}
              </button>
            </div>
          )}

          {!loading && items.length === 0 && (
            <div className="text-center py-24">
              <p className="font-serif text-xl italic text-secondary">Gallery coming soon.</p>
            </div>
          )}
        </div>
      </section>

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-4 cursor-pointer"
          onClick={() => setLightbox(null)}
        >
          <button
            onClick={() => setLightbox(null)}
            className="absolute top-6 right-6 text-white/80 hover:text-white transition-colors p-2"
          >
            <X className="size-8" />
          </button>
          <img
            src={lightbox.url}
            alt="Gallery full view"
            className="max-h-[90vh] max-w-[90vw] object-contain rounded-sm shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
};
