import React, { useLayoutEffect, useRef } from 'react';
import { X } from 'lucide-react';

// Tampilan "1.500.000,5" dari nilai tersimpan "1500000.5"
const toDisplay = (raw) => {
  const [whole, decimal] = String(raw ?? '').split('.');
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return decimal === undefined ? grouped : `${grouped},${decimal}`;
};

const toRaw = (text) => {
  const cleaned = text.replace(/[^\d,]/g, '');
  const commaAt = cleaned.indexOf(',');
  const whole = (commaAt === -1 ? cleaned : cleaned.slice(0, commaAt)).replace(/^0+(?=\d)/, '');
  if (commaAt === -1) return whole;
  return `${whole || '0'}.${cleaned.slice(commaAt + 1).replace(/,/g, '')}`;
};

// Input nominal: titik ribuan muncul saat mengetik, nilai ke onChange tetap angka polos
export function MoneyInput({ value, onChange, ...props }) {
  const inputRef = useRef(null);
  const charsAfterCaret = useRef(null);

  // Titik yang bertambah/berkurang tidak boleh menggeser posisi kursor
  useLayoutEffect(() => {
    if (charsAfterCaret.current === null || !inputRef.current) return;
    const text = inputRef.current.value;
    let position = text.length;
    let remaining = charsAfterCaret.current;
    while (position > 0 && remaining > 0) {
      position -= 1;
      if (text[position] !== '.') remaining -= 1;
    }
    inputRef.current.setSelectionRange(position, position);
    charsAfterCaret.current = null;
  });

  const handleChange = (e) => {
    const { value: typed, selectionStart: caret } = e.target;
    const previous = toDisplay(value);
    let text = typed;
    let after = typed.slice(caret);

    // Yang terhapus hanya titik: hapus angka di sebelahnya supaya tombol hapus tidak terasa macet.
    // Dicek di sini, bukan di keydown, karena keyboard ponsel tidak melaporkan nama tombolnya.
    const removedOnlyDot = typed.length === previous.length - 1 && previous[caret] === '.' && toRaw(typed) === toRaw(previous);
    if (removedOnlyDot) {
      if (e.nativeEvent.inputType === 'deleteContentForward') {
        after = typed.slice(caret + 1);
        text = typed.slice(0, caret) + after;
      } else {
        text = typed.slice(0, Math.max(caret - 1, 0)) + after;
      }
    }

    charsAfterCaret.current = after.replace(/[^\d,]/g, '').length;
    onChange(toRaw(text));
  };

  return <input {...props} ref={inputRef} type="text" inputMode="numeric" autoComplete="off" value={toDisplay(value)} onChange={handleChange} />;
}

export function Field({ label, htmlFor, children }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="block text-xs font-semibold text-muted mb-2">{label}</label>
      {children}
    </div>
  );
}

// Pilihan berbentuk pil; pilihan aktif berwarna lime
export function Segmented({ options, value, onChange, label, className = '' }) {
  return (
    <div role="group" aria-label={label} className={`flex gap-1 p-1 bg-raised rounded-2xl ${className}`}>
      {options.map(option => {
        const Icon = option.icon;
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            className={`flex-1 min-h-10 px-3 sm:px-4 inline-flex items-center justify-center gap-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-colors ${active ? 'bg-lime text-ink' : 'text-muted hover:text-fg'}`}
          >
            {Icon && <Icon className="w-4 h-4" />}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export function Modal({ title, onClose, children, size = 'max-w-md', zIndex = 'z-[60]' }) {
  return (
    <div className={`fixed inset-0 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-6 ${zIndex}`}>
      <div role="dialog" aria-modal="true" aria-label={title} className={`enter w-full ${size} max-h-[92vh] flex flex-col bg-surface border border-line rounded-t-[28px] sm:rounded-[28px] overflow-hidden`}>
        <div className="flex items-center justify-between gap-3 px-6 pt-5 pb-4">
          <h3 className="text-lg font-bold">{title}</h3>
          <button type="button" onClick={onClose} className="icon-btn" aria-label="Tutup"><X className="w-5 h-5" /></button>
        </div>
        <div className="px-6 pb-6 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

export function StatTile({ label, value, icon: Icon, tone = 'text-muted', hint }) {
  return (
    <div className="card p-4 sm:p-5 min-w-0">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-muted">{label}</p>
        {Icon && <Icon className={`w-4 h-4 flex-none ${tone}`} />}
      </div>
      <p className="tabular mt-3 text-lg sm:text-2xl font-bold tracking-tight truncate" title={value}>{value}</p>
      {hint && <p className="mt-1 text-xs text-faint truncate">{hint}</p>}
    </div>
  );
}
