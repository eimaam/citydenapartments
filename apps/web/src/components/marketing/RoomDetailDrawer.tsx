import { useState } from 'react';
import { Link } from 'react-router-dom';
import { X, ChevronLeft, ChevronRight, ArrowUpRight } from 'lucide-react';
import { formatNGN } from '@citydenapartments/shared';
import type { PublicRoomType } from '../../lib/api';

const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=80';

interface RoomDetailDrawerProps {
  room: PublicRoomType | null;
  onClose: () => void;
  branchCode?: string;
}

export function RoomDetailDrawer({ room, onClose, branchCode }: RoomDetailDrawerProps) {
  const [imgIdx, setImgIdx] = useState(0);

  if (!room) return null;

  const images = room.images?.length ? room.images : [FALLBACK_IMAGE];

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-2xl bg-white shadow-2xl overflow-y-auto">
        <div className="sticky top-0 z-10 flex items-center justify-between bg-white/95 backdrop-blur-sm px-6 py-4 border-b border-outline-variant/30">
          <h2 className="font-serif text-xl text-on-surface">{room.name}</h2>
          <button onClick={onClose} className="p-1.5 rounded-sm hover:bg-surface-container cursor-pointer bg-transparent border-none text-outline hover:text-on-surface">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-8">
          {/* Image Gallery */}
          <div>
            <div className="relative aspect-[16/10] w-full overflow-hidden rounded-sm bg-surface-container-low">
              <img
                src={images[imgIdx]}
                alt=""
                className="size-full object-cover transition-opacity duration-300"
                onError={(e) => { (e.target as HTMLImageElement).src = FALLBACK_IMAGE }}
              />
              {images.length > 1 && (
                <>
                  <button onClick={() => setImgIdx((i) => (i - 1 + images.length) % images.length)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/80 hover:bg-white shadow-sm cursor-pointer border-none text-on-surface">
                    <ChevronLeft size={18} />
                  </button>
                  <button onClick={() => setImgIdx((i) => (i + 1) % images.length)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/80 hover:bg-white shadow-sm cursor-pointer border-none text-on-surface">
                    <ChevronRight size={18} />
                  </button>
                </>
              )}
              {images.length > 1 && (
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                  {images.map((_, i) => (
                    <button key={i} onClick={() => setImgIdx(i)}
                      className={`w-2 h-2 rounded-full border-0 cursor-pointer transition-all ${i === imgIdx ? 'bg-white w-4' : 'bg-white/50'}`} />
                  ))}
                </div>
              )}
            </div>
            {images.length > 1 && (
              <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
                {images.map((img, i) => (
                  <button key={i} onClick={() => setImgIdx(i)}
                    className={`shrink-0 w-16 h-12 rounded overflow-hidden border-2 cursor-pointer transition-all ${i === imgIdx ? 'border-primary opacity-100' : 'border-transparent opacity-60 hover:opacity-100'}`}>
                    <img src={img} alt="" className="size-full object-cover"
                      onError={(e) => { (e.target as HTMLImageElement).src = FALLBACK_IMAGE }} />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Description */}
          <div>
            <h3 className="text-xs font-bold tracking-[0.15em] uppercase text-outline mb-2">About this suite</h3>
            <p className="text-sm text-secondary leading-relaxed">{room.description}</p>
          </div>

          {/* Amenities */}
          {room.amenities?.length > 0 && (
            <div>
              <h3 className="text-xs font-bold tracking-[0.15em] uppercase text-outline mb-3">Amenities</h3>
              <div className="flex flex-wrap gap-2">
                {room.amenities.map((a, i) => (
                  <span key={i} className="px-3 py-1.5 text-xs font-medium rounded-full bg-surface-container text-on-surface-variant border border-outline-variant/50">
                    {a}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Price & CTA */}
          <div className="border-t border-outline-variant/30 pt-6 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-outline font-bold uppercase tracking-widest">Starting from</span>
              <p className="font-serif text-2xl font-bold text-on-surface">{formatNGN(room.basePrice)}<span className="text-sm font-normal text-secondary">/night</span></p>
            </div>
            <Link to={`/book?city=${branchCode || ''}`}
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-on-primary text-xs font-bold tracking-widest uppercase hover:bg-primary-container hover:text-on-primary-container transition-colors rounded-sm border-none cursor-pointer">
              Book Now <ArrowUpRight size={14} />
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
