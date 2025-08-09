'use client';

import React, { useEffect, useState } from 'react';

type PersonnelLite = {
  _id: string;
  firstName: string;
  lastName: string;
  employeeId: string;
  jobTitle?: string;
};

interface AttendanceDetailsModalProps {
  open: boolean;
  person: PersonnelLite | null;
  initialLocation?: string;
  initialNote?: string;
  anchor?: { x: number; y: number };
  onClose: () => void;
  onSave: (location: string, note: string) => void;
}

export default function AttendanceDetailsModal({ open, person, initialLocation, initialNote, anchor, onClose, onSave }: AttendanceDetailsModalProps) {
  const [location, setLocation] = useState<string>(initialLocation || '');
  const [note, setNote] = useState<string>(initialNote || '');
  const [pos, setPos] = useState<{ left: number; top: number }>({ left: 0, top: 0 });

  useEffect(() => {
    if (open) {
      setLocation(initialLocation || '');
      setNote(initialNote || '');
      if (anchor) {
        const margin = 12;
        const panelWidth = 480;
        const panelHeight = 260;
        // Varsayılan: anchor altına ve ortalanmış konum
        let left = anchor.x - panelWidth / 2;
        let top = anchor.y + margin;
        const vw = typeof window !== 'undefined' ? window.innerWidth : panelWidth;
        const vh = typeof window !== 'undefined' ? window.innerHeight : panelHeight;
        // Sağ taşma
        if (left + panelWidth > vw - margin) left = vw - panelWidth - margin;
        // Sol taşma
        if (left < margin) left = margin;
        // Alt taşma -> yukarı yerleştir
        if (top + panelHeight > vh - margin) top = Math.max(margin, vh - panelHeight - margin);
        setPos({ left, top });
      }
    }
  }, [open, initialLocation, initialNote, anchor]);

  if (!open || !person) return null;

  return (
    <div className="fixed inset-0 z-[100000]">
      {/* tıklayınca kapanan alan */}
      <button aria-label="dismiss" onClick={onClose} className="absolute inset-0 w-full h-full bg-transparent" />
      <div className="fixed" style={{ left: pos.left, top: pos.top, width: 480, maxWidth: 'calc(100vw - 24px)' }}>
        <div className="relative">
          {/* Futuristik çerçeve */}
          <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500 rounded-2xl blur opacity-60" />
          <div className="relative bg-gray-900 text-gray-100 rounded-2xl p-6 shadow-2xl border border-white/10">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-lg font-semibold tracking-wide">
                Detaylar • {person.firstName} {person.lastName}
              </h3>
              <p className="text-xs text-gray-400 mt-1">Sicil: {person.employeeId}{person.jobTitle ? ` • ${person.jobTitle}` : ''}</p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-white transition">✕</button>
          </div>

          <div className="mt-5 space-y-4">
            <div>
              <label className="text-xs text-gray-300">Bulunduğu Yer</label>
              <input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Örn: Şantiye • A Blok • 2. Kat"
                className="mt-1 w-full rounded-lg bg-gray-800/70 border border-white/10 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400"
              />
            </div>
            <div>
              <label className="text-xs text-gray-300">Açıklama</label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                placeholder="Kısa not bırakın..."
                className="mt-1 w-full rounded-lg bg-gray-800/70 border border-white/10 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
              />
            </div>
          </div>

          <div className="mt-6 flex items-center justify-end gap-2">
            <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm bg-gray-800 hover:bg-gray-700 border border-white/10">İptal</button>
            <button
              onClick={() => onSave(location.trim(), note.trim())}
              className="px-4 py-2 rounded-lg text-sm text-white bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-400 hover:to-purple-400 shadow-lg"
            >
              Kaydet
            </button>
          </div>
          </div>
        </div>
      </div>
    </div>
  );
}


