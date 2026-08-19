import { useState, useEffect, useMemo } from 'react';
import { X, Plus, Minus, Check, Clock, AlertCircle } from 'lucide-react';
import type {
  MenuItemResponse,
  MenuItemSize,
  MenuItemOptionGroup,
  SelectedOptionItem,
} from '@citydenapartments/shared';

interface ItemCustomizerModalProps {
  item: MenuItemResponse | null;
  onClose: () => void;
  onAddToCart: (
    item: MenuItemResponse,
    quantity: number,
    selectedSize?: MenuItemSize,
    selectedOptions?: SelectedOptionItem[],
    specialInstructions?: string,
  ) => void;
}

export function ItemCustomizerModal({ item, onClose, onAddToCart }: ItemCustomizerModalProps) {
  if (!item) return null;

  const [quantity, setQuantity] = useState(1);
  const [selectedSize, setSelectedSize] = useState<MenuItemSize | undefined>(() => {
    if (item.hasSizes && item.sizes && item.sizes.length > 0) {
      return item.sizes.find((s) => s.isDefault) || item.sizes[0];
    }
    return undefined;
  });

  // Selected options map: groupName -> array of option names
  const [selectedOptionsMap, setSelectedOptionsMap] = useState<Record<string, string[]>>({});
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  // Pre-select first choice for required single-select option groups
  useEffect(() => {
    if (item.optionGroups && item.optionGroups.length > 0) {
      const initialMap: Record<string, string[]> = {};
      for (const og of item.optionGroups) {
        if (og.required && og.options.length > 0) {
          initialMap[og.name] = [og.options[0].name];
        } else {
          initialMap[og.name] = [];
        }
      }
      setSelectedOptionsMap(initialMap);
    }
  }, [item]);

  // Calculate Unit Price
  const currentUnitPrice = useMemo(() => {
    let base = item.basePrice || 0;
    if (item.hasSizes && selectedSize) {
      base = selectedSize.price;
    }

    let extra = 0;
    if (item.optionGroups) {
      for (const og of item.optionGroups) {
        const selectedNames = selectedOptionsMap[og.name] || [];
        for (const optName of selectedNames) {
          const opt = og.options.find((o) => o.name === optName);
          if (opt && opt.extraPrice) {
            extra += opt.extraPrice;
          }
        }
      }
    }
    return base + extra;
  }, [item, selectedSize, selectedOptionsMap]);

  const totalCalculated = currentUnitPrice * quantity;

  // Handle Option Click
  const handleToggleOption = (group: MenuItemOptionGroup, optName: string) => {
    setValidationError(null);
    setSelectedOptionsMap((prev) => {
      const currentList = prev[group.name] || [];
      if (group.selectionType === 'single_select') {
        return { ...prev, [group.name]: [optName] };
      } else {
        // Multi select
        if (currentList.includes(optName)) {
          return { ...prev, [group.name]: currentList.filter((n) => n !== optName) };
        } else {
          if (group.maxSelections && currentList.length >= group.maxSelections) {
            return prev;
          }
          return { ...prev, [group.name]: [...currentList, optName] };
        }
      }
    });
  };

  const handleConfirm = () => {
    // Validate required option groups
    if (item.optionGroups) {
      for (const og of item.optionGroups) {
        const chosen = selectedOptionsMap[og.name] || [];
        if (og.required && chosen.length === 0) {
          setValidationError(`Please make a selection for "${og.name}"`);
          return;
        }
        if (og.minSelections && chosen.length < og.minSelections) {
          setValidationError(`Please select at least ${og.minSelections} for "${og.name}"`);
          return;
        }
      }
    }

    // Build structured selected options array
    const finalSelectedOptions: SelectedOptionItem[] = [];
    if (item.optionGroups) {
      for (const og of item.optionGroups) {
        const chosen = selectedOptionsMap[og.name] || [];
        for (const optName of chosen) {
          const matched = og.options.find((o) => o.name === optName);
          finalSelectedOptions.push({
            groupName: og.name,
            optionName: optName,
            extraPrice: matched?.extraPrice || 0,
          });
        }
      }
    }

    onAddToCart(item, quantity, selectedSize, finalSelectedOptions, specialInstructions.trim() || undefined);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
      <div
        className="w-full max-w-md bg-surface rounded-t-3xl sm:rounded-3xl border border-border overflow-hidden shadow-2xl flex flex-col max-h-[90vh] animate-in slide-in-from-bottom-8 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Image or Banner */}
        <div className="relative">
          {item.images?.[0] ? (
            <div className="h-44 w-full relative">
              <img src={item.images[0]} alt={item.name} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
            </div>
          ) : (
            <div className="h-28 bg-primary/10 flex items-center justify-center text-4xl">🍲</div>
          )}

          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center cursor-pointer hover:bg-black/80 transition-all"
          >
            <X size={16} />
          </button>

          <div className="absolute bottom-3 left-4 right-4 text-white">
            <h2 className="text-xl font-bold font-serif leading-tight drop-shadow-sm">{item.name}</h2>
            {item.estimatedPrepTimeMinutes && (
              <span className="inline-flex items-center gap-1 text-[11px] text-white/80 font-medium mt-0.5">
                <Clock size={12} /> ~{item.estimatedPrepTimeMinutes} mins prep time
              </span>
            )}
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="p-4 overflow-y-auto space-y-5 flex-1 divide-y divide-border/60">
          {item.description && <p className="text-xs text-muted-foreground leading-relaxed">{item.description}</p>}

          {/* Portion Sizes */}
          {item.hasSizes && item.sizes && item.sizes.length > 0 && (
            <div className="pt-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-foreground uppercase tracking-wider">
                  Select Portion Size *
                </label>
                <span className="text-[10px] bg-primary/10 text-primary font-bold px-2 py-0.5 rounded-full">
                  Required
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {item.sizes.map((size, idx) => {
                  const isSelected = selectedSize?.name === size.name;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setSelectedSize(size)}
                      className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? 'border-primary bg-primary/10 text-primary ring-1 ring-primary'
                          : 'border-border bg-surface-hover hover:border-primary/40 text-foreground'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs">{size.name}</span>
                        {isSelected && <Check size={14} className="text-primary" />}
                      </div>
                      <span className="text-xs font-mono font-bold mt-1.5">₦{size.price.toLocaleString()}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Nested Option Groups (e.g. Soup Type, Protein Choices) */}
          {item.optionGroups &&
            item.optionGroups.map((group, gIdx) => {
              const selectedList = selectedOptionsMap[group.name] || [];

              return (
                <div key={gIdx} className="pt-4 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-xs font-bold text-foreground uppercase tracking-wider block">
                        {group.name} {group.required && '*'}
                      </label>
                      <p className="text-[11px] text-muted-foreground">
                        {group.selectionType === 'single_select' ? 'Choose 1 option' : 'Multiple choices allowed'}
                      </p>
                    </div>

                    {group.required ? (
                      <span className="text-[10px] bg-primary/10 text-primary font-bold px-2 py-0.5 rounded-full">
                        Required
                      </span>
                    ) : (
                      <span className="text-[10px] bg-surface-hover text-muted-foreground font-medium px-2 py-0.5 rounded-full">
                        Optional
                      </span>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    {group.options.map((opt, oIdx) => {
                      const isChosen = selectedList.includes(opt.name);

                      return (
                        <button
                          key={oIdx}
                          type="button"
                          onClick={() => handleToggleOption(group, opt.name)}
                          className={`w-full p-2.5 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                            isChosen
                              ? 'border-primary bg-primary/5 text-foreground'
                              : 'border-border bg-surface-hover/50 hover:bg-surface-hover text-foreground'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <div
                              className={`w-4 h-4 rounded-${
                                group.selectionType === 'single_select' ? 'full' : 'md'
                              } border flex items-center justify-center ${
                                isChosen ? 'border-primary bg-primary text-white' : 'border-border bg-surface'
                              }`}
                            >
                              {isChosen && <Check size={10} />}
                            </div>
                            <span className="text-xs font-semibold">{opt.name}</span>
                          </div>

                          {opt.extraPrice > 0 ? (
                            <span className="text-xs font-mono font-bold text-primary">
                              +₦{opt.extraPrice.toLocaleString()}
                            </span>
                          ) : (
                            <span className="text-[11px] text-muted-foreground">Included</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}

          {/* Cooking Instructions / Item Notes */}
          <div className="pt-4 space-y-1.5">
            <label className="text-xs font-bold text-foreground uppercase tracking-wider block">
              Special Prep Instructions
            </label>
            <input
              type="text"
              placeholder="e.g. Less pepper, soup served hot, no onions..."
              value={specialInstructions}
              onChange={(e) => setSpecialInstructions(e.target.value)}
              className="w-full px-3 py-2 bg-surface-hover text-foreground rounded-xl border border-border text-xs focus:outline-none focus:border-primary"
            />
          </div>
        </div>

        {/* Validation Error Banner */}
        {validationError && (
          <div className="px-4 py-2 bg-rose-500/10 text-rose-500 text-xs font-medium border-t border-rose-500/20 flex items-center gap-1.5">
            <AlertCircle size={14} /> {validationError}
          </div>
        )}

        {/* Sticky Bottom Actions */}
        <div className="p-4 bg-surface border-t border-border flex mb-12 items-center gap-3">
          {/* Quantity Stepper */}
          <div className="flex items-center border border-border rounded-2xl bg-surface-hover px-2 py-1">
            <button
              type="button"
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-foreground hover:bg-surface cursor-pointer active:scale-95"
            >
              <Minus size={14} />
            </button>
            <span className="w-8 text-center font-bold text-sm font-mono text-foreground">{quantity}</span>
            <button
              type="button"
              onClick={() => setQuantity(quantity + 1)}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-foreground hover:bg-surface cursor-pointer active:scale-95"
            >
              <Plus size={14} />
            </button>
          </div>

          {/* Add to Order Button */}
          <button
            type="button"
            onClick={handleConfirm}
            className="flex-1 py-3 px-4 rounded-2xl bg-primary hover:bg-primary-dark text-on-primary font-medium text-sm flex items-center justify-between shadow-md active:scale-98 transition-all cursor-pointer"
          >
            <span>Add to Order</span>
            <span className="font-mono">₦{totalCalculated.toLocaleString()}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
