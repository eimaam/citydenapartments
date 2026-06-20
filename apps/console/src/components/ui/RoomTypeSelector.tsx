import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronDown, DoorOpen, Users } from 'lucide-react';
import type { RoomResponse } from '../../features/rooms/api/rooms.api';

const PER_PAGE = 5;

interface RoomTypeSelectorProps {
  rooms: RoomResponse[];
  selectedRoomId: string;
  onSelectRoom: (roomId: string) => void;
}

export function RoomTypeSelector({ rooms, selectedRoomId, onSelectRoom }: RoomTypeSelectorProps) {
  const [selectedTypeId, setSelectedTypeId] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState<Record<string, number>>({});

  const grouped = useMemo(() => {
    const map = new Map<string, { typeId: string; typeName: string; amenities: string[]; rooms: RoomResponse[] }>();
    for (const r of rooms) {
      const tid = r.roomTypeId._id;
      if (!map.has(tid)) {
        map.set(tid, { typeId: tid, typeName: r.roomTypeId.name, amenities: r.roomTypeId.amenities, rooms: [] });
      }
      map.get(tid)!.rooms.push(r);
    }
    return Array.from(map.values());
  }, [rooms]);

  const typeCards = useMemo(() => grouped.map((g) => ({
    ...g,
    count: g.rooms.length,
    totalVisible: visibleCount[g.typeId] ?? Math.min(PER_PAGE, g.rooms.length),
  })), [grouped, visibleCount]);

  const selectedGroup = useMemo(
    () => grouped.find((g) => g.typeId === selectedTypeId),
    [grouped, selectedTypeId],
  );

  const selectedVisible = selectedGroup
    ? visibleCount[selectedGroup.typeId] ?? Math.min(PER_PAGE, selectedGroup.rooms.length)
    : 0;

  const loadMore = (typeId: string, total: number) => {
    setVisibleCount((prev) => ({ ...prev, [typeId]: Math.min(total, (prev[typeId] ?? PER_PAGE) + PER_PAGE) }));
  };

  if (!rooms.length) {
    return <p className="text-xs text-outline py-6 text-center">No rooms available for selected dates.</p>;
  }

  if (selectedGroup) {
    const roomsToShow = selectedGroup.rooms.slice(0, selectedVisible);
    const hasMore = selectedVisible < selectedGroup.rooms.length;

    return (
      <div>
        <button
          type="button"
          onClick={() => { setSelectedTypeId(null); onSelectRoom(''); }}
          className="flex items-center gap-1 text-xs text-primary mb-3 bg-transparent border-none cursor-pointer font-medium hover:underline"
        >
          <ChevronLeft size={14} /> Back to room types
        </button>
        <p className="text-[10px] text-outline uppercase tracking-wide mb-2 font-semibold">{selectedGroup.typeName}</p>
        <div className="space-y-1.5">
          {roomsToShow.map((r) => {
            const active = r._id === selectedRoomId;
            return (
              <button
                key={r._id}
                type="button"
                onClick={() => onSelectRoom(r._id)}
                className={`w-full text-left p-3 rounded-lg border transition-all cursor-pointer ${
                  active
                    ? 'border-primary bg-primary-container/15'
                    : 'border-outline-variant/60 bg-surface-container-lowest hover:border-outline hover:bg-surface-container-high/50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${active ? 'bg-primary/15' : 'bg-surface-container'}`}>
                      <DoorOpen size={16} className={active ? 'text-primary' : 'text-outline'} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{r.roomNumber}</p>
                      <p className="text-[10px] text-outline">{selectedGroup.typeName}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 text-[10px] text-outline">
                      <Users size={11} />
                      <span>{r.maxGuests}</span>
                    </div>
                    {active && (
                      <div className="w-2 h-2 rounded-full bg-primary" />
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
        {hasMore && (
          <button
            type="button"
            onClick={() => loadMore(selectedGroup.typeId, selectedGroup.rooms.length)}
            className="w-full mt-2 py-2 text-xs font-medium text-primary bg-transparent border border-dashed border-outline-variant/60 rounded-lg hover:bg-primary-container/10 transition-all cursor-pointer flex items-center justify-center gap-1"
          >
            <ChevronDown size={14} /> Show {Math.min(PER_PAGE, selectedGroup.rooms.length - selectedVisible)} more rooms ({selectedGroup.rooms.length - selectedVisible} remaining)
          </button>
        )}
      </div>
    );
  }

  return (
    <div>
      <p className="text-[10px] text-outline uppercase tracking-wide mb-2 font-semibold">Select Room Type</p>
      <div className="grid grid-cols-2 gap-2">
        {typeCards.map((t) => {
          const active = t.typeId === selectedTypeId;
          const roomsToShow = t.rooms.slice(0, t.totalVisible);
          const hasMore = t.totalVisible < t.count;

          return (
            <div key={t.typeId} className="flex flex-col">
              <button
                type="button"
                onClick={() => setSelectedTypeId(t.typeId)}
                className={`w-full text-left p-3 rounded-lg border transition-all cursor-pointer ${
                  active
                    ? 'border-primary bg-primary-container/15'
                    : 'border-outline-variant/60 bg-surface-container-lowest hover:border-outline hover:bg-surface-container-high/50'
                }`}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${active ? 'bg-primary/15' : 'bg-surface-container'}`}>
                    <DoorOpen size={14} className={active ? 'text-primary' : 'text-outline'} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">{t.typeName}</p>
                    <p className="text-[10px] text-outline">{t.count} room{t.count !== 1 ? 's' : ''} · {t.amenities.length} amenit{t.amenities.length !== 1 ? 'ies' : 'y'}</p>
                  </div>
                </div>
                {t.amenities.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {t.amenities.slice(0, 3).map((a) => (
                      <span key={a} className="px-1.5 py-0.5 rounded bg-surface-container text-[9px] text-outline font-medium">{a}</span>
                    ))}
                    {t.amenities.length > 3 && (
                      <span className="text-[9px] text-outline font-medium">+{t.amenities.length - 3}</span>
                    )}
                  </div>
                )}
              </button>
              {active && (
                <div className="mt-1.5 space-y-1 pl-1">
                  {roomsToShow.map((r) => {
                    const roomActive = r._id === selectedRoomId;
                    return (
                      <button
                        key={r._id}
                        type="button"
                        onClick={() => onSelectRoom(r._id)}
                        className={`w-full text-left p-2 rounded-lg border transition-all cursor-pointer ${
                          roomActive
                            ? 'border-primary bg-primary/8'
                            : 'border-transparent bg-surface-container-low/40 hover:bg-surface-container-low'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className={`text-sm font-medium ${roomActive ? 'text-primary' : 'text-on-surface'}`}>{r.roomNumber}</span>
                            <span className="text-[9px] text-outline bg-surface-container px-1.5 py-0.5 rounded font-medium">{t.typeName}</span>
                          </div>
                          <div className="flex items-center gap-1 text-[9px] text-outline">
                            <Users size={10} />
                            <span>{r.maxGuests}</span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                  {hasMore && (
                    <button
                      type="button"
                      onClick={() => loadMore(t.typeId, t.count)}
                      className="w-full py-1.5 text-[10px] font-medium text-primary bg-transparent border-none cursor-pointer hover:underline flex items-center justify-center gap-0.5"
                    >
                      <ChevronDown size={12} /> Show {Math.min(PER_PAGE, t.count - t.totalVisible)} more
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
