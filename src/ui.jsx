import React from 'react';
import { X } from 'lucide-react';

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
