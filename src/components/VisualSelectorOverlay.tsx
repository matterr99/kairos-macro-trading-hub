import { useState, useEffect, useMemo, useRef } from 'react';
import { Trash2, Pencil, X, Copy, Check } from 'lucide-react';

interface VisualSelectorOverlayProps {
  currentTab: string;
}

type SelectorMode = 'off' | 'delete' | 'edit';
type ItemAction = 'delete' | 'edit';

interface SelectedItem {
  id: string;
  el: HTMLElement;
  tab: string;
  tag: string;
  label: string;
  path: string;
  action: ItemAction;
  note: string;
}

const SVG_TAGS = new Set([
  'svg',
  'path',
  'circle',
  'rect',
  'line',
  'polyline',
  'polygon',
  'ellipse',
  'g',
  'use',
  'defs',
  'lineargradient',
  'stop'
]);

function resolveTarget(raw: EventTarget | null): HTMLElement | null {
  if (!raw || !(raw instanceof Element)) return null;
  if (raw.closest('[data-visual-selector="true"]')) return null;

  let current: Element | null = raw;
  while (
    current &&
    (current instanceof SVGElement || SVG_TAGS.has(current.tagName.toLowerCase()))
  ) {
    current = current.parentElement;
  }

  if (!current || !(current instanceof HTMLElement)) return null;

  const tag = current.tagName.toLowerCase();
  if (tag === 'html' || tag === 'body' || current.id === 'root') return null;
  if (current.closest('[data-visual-selector="true"]')) return null;

  return current;
}

function getElementLabel(el: HTMLElement): string {
  const aria = el.getAttribute('aria-label')?.trim();
  if (aria) return aria.length > 60 ? `${aria.slice(0, 57)}...` : aria;

  if (el.id) {
    const idLabel = `#${el.id}`;
    return idLabel.length > 60 ? `${idLabel.slice(0, 57)}...` : idLabel;
  }

  const rawText = (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim();
  if (rawText) {
    return rawText.length > 60 ? `${rawText.slice(0, 57)}...` : rawText;
  }

  return el.tagName.toLowerCase();
}

function getElementPath(el: HTMLElement): string {
  const parts: string[] = [];
  let current: HTMLElement | null = el;
  let depth = 0;

  while (current && depth < 5) {
    const tag = current.tagName.toLowerCase();
    if (tag === 'body' || tag === 'html' || current.id === 'root') break;

    if (current.id) {
      parts.unshift(`${tag}#${current.id}`);
      break;
    }

    const parent: HTMLElement | null = current.parentElement;
    if (parent) {
      const sameTagSiblings = Array.from(parent.children).filter(
        (child) => child.tagName.toLowerCase() === tag
      );
      const index = sameTagSiblings.indexOf(current);
      const nth = index >= 0 ? index + 1 : 1;
      parts.unshift(`${tag}:nth-of-type(${nth})`);
    } else {
      parts.unshift(tag);
    }

    current = parent;
    depth += 1;
  }

  return parts.join(' > ');
}

export function VisualSelectorOverlay({ currentTab }: VisualSelectorOverlayProps) {
  const [mode, setMode] = useState<SelectorMode>('off');
  const [hoveredEl, setHoveredEl] = useState<HTMLElement | null>(null);
  const [selected, setSelected] = useState<SelectedItem[]>([]);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showList, setShowList] = useState(false);
  const [, setTick] = useState(0);
  const noteInputRef = useRef<HTMLTextAreaElement>(null);

  const isSelecting = mode !== 'off';

  // Auto-focus note editor when an edit item is opened
  useEffect(() => {
    if (activeNoteId && noteInputRef.current) {
      noteInputRef.current.focus();
    }
  }, [activeNoteId]);

  // Clear stale hover target on tab changes
  useEffect(() => {
    setHoveredEl(null);
  }, [currentTab]);

  // Keep highlight overlays aligned on scroll and window resize
  useEffect(() => {
    if (!isSelecting && selected.length === 0) return;

    const handleReposition = () => {
      setTick((prev) => prev + 1);
    };

    window.addEventListener('scroll', handleReposition, true);
    window.addEventListener('resize', handleReposition, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleReposition, true);
      window.removeEventListener('resize', handleReposition);
    };
  }, [isSelecting, selected.length]);

  // Selection event listeners active only while mode is 'delete' or 'edit'
  useEffect(() => {
    if (mode === 'off') {
      setHoveredEl(null);
      return;
    }

    const handleMouseMove = (e: MouseEvent) => {
      const target = resolveTarget(e.target);
      setHoveredEl(target);
    };

    const handleClick = (e: MouseEvent) => {
      const target = resolveTarget(e.target);
      if (!target) return;

      e.preventDefault();
      e.stopPropagation();

      if (mode === 'delete') {
        setSelected((prev) => {
          const existing = prev.find((item) => item.el === target);
          if (existing) {
            if (existing.action === 'delete') {
              return prev.filter((item) => item.id !== existing.id);
            }
            if (activeNoteId === existing.id) {
              setActiveNoteId(null);
            }
            return prev.map((item) =>
              item.id === existing.id ? { ...item, action: 'delete' } : item
            );
          }

          const newItem: SelectedItem = {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            el: target,
            tab: currentTab,
            tag: target.tagName.toUpperCase(),
            label: getElementLabel(target),
            path: getElementPath(target),
            action: 'delete',
            note: ''
          };
          return [...prev, newItem];
        });
      } else if (mode === 'edit') {
        const existing = selected.find((item) => item.el === target);
        if (existing) {
          if (existing.action !== 'edit') {
            setSelected((prev) =>
              prev.map((item) =>
                item.id === existing.id ? { ...item, action: 'edit' } : item
              )
            );
          }
          setActiveNoteId(existing.id);
          setShowList(false);
        } else {
          const newId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
          const newItem: SelectedItem = {
            id: newId,
            el: target,
            tab: currentTab,
            tag: target.tagName.toUpperCase(),
            label: getElementLabel(target),
            path: getElementPath(target),
            action: 'edit',
            note: ''
          };
          setSelected((prev) => [...prev, newItem]);
          setActiveNoteId(newId);
          setShowList(false);
        }
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (activeNoteId) {
          setActiveNoteId(null);
        } else {
          setMode('off');
          setHoveredEl(null);
        }
      }
    };

    document.addEventListener('mousemove', handleMouseMove, true);
    document.addEventListener('click', handleClick, true);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove, true);
      document.removeEventListener('click', handleClick, true);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [mode, currentTab, selected, activeNoteId]);

  const formattedList = useMemo(() => {
    if (selected.length === 0) return '';

    const deleteItems = selected.filter((item) => item.action === 'delete');
    const editItems = selected.filter((item) => item.action === 'edit');
    const sections: string[] = [];

    if (deleteItems.length > 0) {
      const lines = deleteItems.map(
        (item, idx) =>
          `${idx + 1}. [Tab: ${item.tab}] <${item.tag}> "${item.label}" (path: ${item.path})`
      );
      sections.push(`### DELETE:\n${lines.join('\n')}`);
    }

    if (editItems.length > 0) {
      const lines = editItems.map((item, idx) => {
        const noteText = item.note.trim() || '(no note added)';
        return `${idx + 1}. [Tab: ${item.tab}] <${item.tag}> "${item.label}" (path: ${item.path})\n   Note: ${noteText}`;
      });
      sections.push(`### EDIT:\n${lines.join('\n')}`);
    }

    return `Please apply these visual changes:\n\n${sections.join('\n\n')}`;
  }, [selected]);

  const handleCopy = async () => {
    if (!formattedList) return;

    let copiedOk = false;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(formattedList);
        copiedOk = true;
      }
    } catch {
      // Fallback below
    }

    if (!copiedOk) {
      try {
        const textarea = document.createElement('textarea');
        textarea.value = formattedList;
        textarea.style.position = 'fixed';
        textarea.style.left = '-9999px';
        textarea.style.top = '0';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        copiedOk = document.execCommand('copy');
        document.body.removeChild(textarea);
      } catch {
        // ignore copy error
      }
    }

    if (copiedOk) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleUpdateNote = (id: string, note: string) => {
    setSelected((prev) =>
      prev.map((item) => (item.id === id ? { ...item, note } : item))
    );
  };

  const handleRemoveItem = (id: string) => {
    setSelected((prev) => prev.filter((item) => item.id !== id));
    if (activeNoteId === id) {
      setActiveNoteId(null);
    }
  };

  const handleClear = () => {
    setSelected([]);
    setActiveNoteId(null);
    setShowList(false);
  };

  const activeNoteItem = activeNoteId
    ? selected.find((item) => item.id === activeNoteId) || null
    : null;

  const hoverRect =
    isSelecting && hoveredEl && document.body.contains(hoveredEl)
      ? hoveredEl.getBoundingClientRect()
      : null;

  const deleteCount = selected.filter((i) => i.action === 'delete').length;
  const editCount = selected.filter((i) => i.action === 'edit').length;

  return (
    <>
      {/* Selected elements highlight overlays */}
      {selected.map((item, idx) => {
        if (!document.body.contains(item.el)) return null;
        const rect = item.el.getBoundingClientRect();
        if (rect.width === 0 && rect.height === 0) return null;

        const isEdit = item.action === 'edit';
        const notePreview =
          isEdit && item.note.trim()
            ? ` · ${item.note.trim().slice(0, 28)}${item.note.trim().length > 28 ? '…' : ''}`
            : '';

        return (
          <div
            key={item.id}
            style={{
              top: rect.top,
              left: rect.left,
              width: rect.width,
              height: rect.height
            }}
            className={`fixed pointer-events-none z-[9996] border-2 rounded-[2px] print:hidden ${
              isEdit
                ? 'border-[#3B82F6] bg-[#3B82F6]/15'
                : 'border-[#EF4444] bg-[#EF4444]/15'
            }`}
          >
            <span
              style={{
                top: rect.top > 24 ? -20 : 4
              }}
              className={`absolute left-0 max-w-[280px] truncate px-1.5 py-0.5 rounded-[2px] text-white text-[10px] font-mono font-semibold ${
                isEdit ? 'bg-[#3B82F6]' : 'bg-[#EF4444]'
              }`}
            >
              {isEdit ? `EDIT #${idx + 1}${notePreview}` : `DEL #${idx + 1}`}
            </span>
          </div>
        );
      })}

      {/* Hover highlight overlay */}
      {isSelecting && hoveredEl && hoverRect && (hoverRect.width > 0 || hoverRect.height > 0) && (
        <div
          style={{
            top: hoverRect.top,
            left: hoverRect.left,
            width: hoverRect.width,
            height: hoverRect.height
          }}
          className={`fixed pointer-events-none z-[9997] border-2 border-dashed rounded-[2px] print:hidden ${
            mode === 'edit'
              ? 'border-[#3B82F6] bg-[#3B82F6]/10'
              : 'border-[#EF4444] bg-[#EF4444]/10'
          }`}
        >
          <span
            style={{
              top: hoverRect.top > 28 ? -24 : 4
            }}
            className={`absolute left-0 max-w-[320px] truncate px-2 py-0.5 rounded-[2px] bg-[#0B0E11] border text-[10px] font-mono font-semibold ${
              mode === 'edit'
                ? 'text-[#60A5FA] border-[#3B82F6]/60'
                : 'text-[#FCA5A5] border-[#EF4444]/60'
            }`}
          >
            [{mode.toUpperCase()}] &lt;{hoveredEl.tagName}&gt; · {getElementLabel(hoveredEl)}
          </span>
        </div>
      )}

      {/* Floating Control Toolbar */}
      <div
        data-visual-selector="true"
        className="fixed bottom-5 right-5 z-[9999] flex flex-col items-end gap-2 print:hidden font-sans"
      >
        {/* Active Edit Note Popover */}
        {activeNoteItem && (
          <div className="w-80 sm:w-96 rounded-[2px] bg-[#11151B] text-[#F0F3F6] border border-white/15 p-3.5 space-y-2.5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="px-1.5 py-0.5 rounded-[2px] bg-[#3B82F6] text-white font-mono text-[10px] font-semibold shrink-0">
                  EDIT NOTE
                </span>
                <span className="font-mono text-[11px] text-[#8A94A6] truncate">
                  &lt;{activeNoteItem.tag}&gt; "{activeNoteItem.label}"
                </span>
              </div>
              <button
                onClick={() => setActiveNoteId(null)}
                className="p-1 rounded-[2px] hover:bg-white/10 text-[#8A94A6] hover:text-white cursor-pointer shrink-0"
                aria-label="Close note editor"
              >
                <X size={14} />
              </button>
            </div>

            <textarea
              ref={noteInputRef}
              value={activeNoteItem.note}
              onChange={(e) => handleUpdateNote(activeNoteItem.id, e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  setActiveNoteId(null);
                }
              }}
              rows={3}
              placeholder="Describe what should be edited on this element... (Enter to save)"
              className="w-full rounded-[2px] bg-[#0B0E11] border border-white/[0.12] focus:border-[#3B82F6] p-2.5 text-xs text-[#F0F3F6] placeholder:text-[#5B6577] outline-none resize-none font-sans"
            />

            <div className="flex items-center justify-between gap-2">
              <button
                onClick={() => handleRemoveItem(activeNoteItem.id)}
                className="px-2.5 py-1.5 rounded-[2px] border border-white/10 text-[11px] font-mono text-[#8A94A6] hover:text-[#EF4444] hover:border-[#EF4444]/40 transition-colors cursor-pointer"
              >
                Remove
              </button>
              <button
                onClick={() => setActiveNoteId(null)}
                className="px-3.5 py-1.5 rounded-[2px] bg-[#FFFFFF] text-[#0B0E11] hover:bg-[#E5E7EB] text-xs font-semibold transition-colors cursor-pointer"
              >
                Save Note
              </button>
            </div>
          </div>
        )}

        {/* Selected items list popover */}
        {showList && selected.length > 0 && (
          <div className="w-80 sm:w-[420px] max-h-80 overflow-y-auto rounded-[2px] bg-[#11151B] text-[#F0F3F6] border border-white/15 shadow-2xl p-3.5 space-y-2.5">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-2">
              <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-[#C5CDD8]">
                Queued Changes ({deleteCount} Del · {editCount} Edit)
              </span>
              <button
                onClick={() => setShowList(false)}
                className="p-1 rounded-[2px] hover:bg-white/10 text-[#8A94A6] hover:text-white cursor-pointer"
                aria-label="Close list"
              >
                <X size={14} />
              </button>
            </div>

            <div className="space-y-2">
              {selected.map((item, idx) => {
                const isEdit = item.action === 'edit';
                return (
                  <div
                    key={item.id}
                    className="p-2.5 rounded-[2px] bg-[#0B0E11] border border-white/[0.08] space-y-1.5 text-xs"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <div className="flex items-center gap-1.5 font-mono text-[10px] font-semibold">
                          <span
                            className={`px-1 py-0.5 rounded-[2px] text-white ${
                              isEdit ? 'bg-[#3B82F6]' : 'bg-[#EF4444]'
                            }`}
                          >
                            {isEdit ? 'EDIT' : 'DEL'} #{idx + 1}
                          </span>
                          <span className="text-[#8A94A6]">[{item.tab}]</span>
                          <span className="text-[#C5CDD8]">&lt;{item.tag}&gt;</span>
                        </div>
                        <div className="text-[#F0F3F6] font-medium truncate">"{item.label}"</div>
                        <div className="text-[10px] text-[#5B6577] font-mono truncate">{item.path}</div>
                      </div>
                      <button
                        onClick={() => handleRemoveItem(item.id)}
                        className="p-1 rounded-[2px] hover:bg-[#EF4444]/20 text-[#8A94A6] hover:text-[#EF4444] shrink-0 cursor-pointer"
                        aria-label={`Remove item ${idx + 1}`}
                      >
                        <X size={13} />
                      </button>
                    </div>

                    {isEdit && (
                      <input
                        type="text"
                        value={item.note}
                        onChange={(e) => handleUpdateNote(item.id, e.target.value)}
                        placeholder="Add edit note..."
                        className="w-full rounded-[2px] bg-[#11151B] border border-white/[0.1] focus:border-[#3B82F6] px-2 py-1 text-[11px] text-[#F0F3F6] placeholder:text-[#5B6577] outline-none"
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Compact dual-button trigger when idle and empty */}
        {!isSelecting && selected.length === 0 ? (
          <div className="flex items-stretch rounded-[2px] bg-[#11151B] text-[#F0F3F6] border border-white/15 divide-x divide-white/10 shadow-2xl overflow-hidden">
            <button
              onClick={() => setMode('delete')}
              className="flex items-center gap-2 px-3.5 py-2 hover:bg-[#EF4444]/15 hover:text-[#FCA5A5] transition-colors text-xs font-mono font-semibold cursor-pointer"
            >
              <Trash2 size={13} className="text-[#EF4444]" />
              <span>Select to Delete</span>
            </button>
            <button
              onClick={() => setMode('edit')}
              className="flex items-center gap-2 px-3.5 py-2 hover:bg-[#3B82F6]/15 hover:text-[#93C5FD] transition-colors text-xs font-mono font-semibold cursor-pointer"
            >
              <Pencil size={13} className="text-[#3B82F6]" />
              <span>Select to Edit</span>
            </button>
          </div>
        ) : (
          /* Expanded bar when active or has selections */
          <div className="flex flex-wrap items-stretch rounded-[2px] bg-[#11151B] text-[#F0F3F6] border border-white/15 divide-x divide-white/10 shadow-2xl overflow-hidden">
            <button
              onClick={() => setMode((prev) => (prev === 'delete' ? 'off' : 'delete'))}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-mono font-semibold transition-colors cursor-pointer ${
                mode === 'delete'
                  ? 'bg-[#EF4444] text-white'
                  : 'text-[#C5CDD8] hover:bg-white/[0.06]'
              }`}
              title={mode === 'delete' ? 'Click to pause delete selection (Esc)' : 'Switch to Delete selection mode'}
            >
              <Trash2 size={13} />
              <span>{mode === 'delete' ? 'Delete: ON' : 'Delete'}</span>
            </button>

            <button
              onClick={() => setMode((prev) => (prev === 'edit' ? 'off' : 'edit'))}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-mono font-semibold transition-colors cursor-pointer ${
                mode === 'edit'
                  ? 'bg-[#3B82F6] text-white'
                  : 'text-[#C5CDD8] hover:bg-white/[0.06]'
              }`}
              title={mode === 'edit' ? 'Click to pause edit selection (Esc)' : 'Switch to Edit + Note selection mode'}
            >
              <Pencil size={13} />
              <span>{mode === 'edit' ? 'Edit: ON' : 'Edit + Note'}</span>
            </button>

            {selected.length > 0 && (
              <>
                <button
                  onClick={() => {
                    setShowList((prev) => !prev);
                    setActiveNoteId(null);
                  }}
                  className="px-3 py-2 hover:bg-white/[0.06] text-xs font-mono font-medium text-[#C5CDD8] transition-colors cursor-pointer"
                  title="View or edit queued items"
                >
                  {selected.length} {selected.length === 1 ? 'item' : 'items'}
                </button>

                <button
                  onClick={handleClear}
                  className="px-3 py-2 hover:bg-[#EF4444]/15 text-xs font-mono font-medium text-[#8A94A6] hover:text-[#FCA5A5] transition-colors cursor-pointer"
                  title="Clear all selections"
                >
                  Clear
                </button>

                <button
                  onClick={handleCopy}
                  className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-mono font-semibold transition-colors cursor-pointer ${
                    copied
                      ? 'bg-[#10B981] text-[#0B0E11]'
                      : 'bg-[#FFFFFF] text-[#0B0E11] hover:bg-[#E5E7EB]'
                  }`}
                >
                  {copied ? <Check size={13} /> : <Copy size={13} />}
                  <span>{copied ? 'Copied!' : 'Copy List'}</span>
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </>
  );
}
