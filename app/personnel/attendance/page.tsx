'use client';

import { useEffect, useMemo, useState } from 'react';

type Personnel = {
  _id: string;
  firstName: string;
  lastName: string;
  employeeId: string;
  jobTitle: string;
  site: string;
  country?: string;
  company?: string;
};

type AttendanceStatus =
  | 'GUNDUZ'
  | 'GECE'
  | 'IZINLI'
  | 'HASTA_RAPORLU'
  | 'MAZERETSIZ'
  | 'GOREVLI'
  | 'VIZE'
  | 'PATENT_OTURUM_BEKLIYOR'
  | 'HAFTA_SONU_TATILI'
  | 'GIRIS_CIKIS'
  | 'HASTA_RAPORSUZ'
  | 'CALISMA_KARTI_BEKLIYOR';

const STATUS_LABELS: Record<AttendanceStatus, string> = {
  GUNDUZ: 'Gündüz',
  GECE: 'Gece',
  IZINLI: 'İzinli',
  HASTA_RAPORLU: 'Hasta (Raporlu)',
  MAZERETSIZ: 'Mazeretsiz İşe Çıkmayan',
  GOREVLI: 'Görevli',
  VIZE: 'Vize',
  PATENT_OTURUM_BEKLIYOR: 'Patent - Oturum Bekliyor',
  HAFTA_SONU_TATILI: 'Hafta Sonu Tatili',
  GIRIS_CIKIS: 'Giriş - Çıkış',
  HASTA_RAPORSUZ: 'Hasta (Raporsuz)',
  CALISMA_KARTI_BEKLIYOR: 'Çalışma Kartı Bekliyor',
};

const STATUS_STYLES: Record<AttendanceStatus, { border: string; bg: string; text: string }> = {
  GUNDUZ: { border: 'border-emerald-500/30', bg: 'bg-emerald-500/10', text: 'text-emerald-300' },
  GECE: { border: 'border-indigo-500/30', bg: 'bg-indigo-500/10', text: 'text-indigo-300' },
  IZINLI: { border: 'border-yellow-500/30', bg: 'bg-yellow-500/10', text: 'text-yellow-300' },
  HASTA_RAPORLU: { border: 'border-rose-500/30', bg: 'bg-rose-500/10', text: 'text-rose-300' },
  MAZERETSIZ: { border: 'border-red-500/30', bg: 'bg-red-500/10', text: 'text-red-300' },
  GOREVLI: { border: 'border-sky-500/30', bg: 'bg-sky-500/10', text: 'text-sky-300' },
  VIZE: { border: 'border-purple-500/30', bg: 'bg-purple-500/10', text: 'text-purple-300' },
  PATENT_OTURUM_BEKLIYOR: { border: 'border-violet-500/30', bg: 'bg-violet-500/10', text: 'text-violet-300' },
  HAFTA_SONU_TATILI: { border: 'border-cyan-500/30', bg: 'bg-cyan-500/10', text: 'text-cyan-300' },
  GIRIS_CIKIS: { border: 'border-zinc-500/30', bg: 'bg-zinc-500/10', text: 'text-zinc-300' },
  HASTA_RAPORSUZ: { border: 'border-orange-500/30', bg: 'bg-orange-500/10', text: 'text-orange-300' },
  CALISMA_KARTI_BEKLIYOR: { border: 'border-pink-500/30', bg: 'bg-pink-500/10', text: 'text-pink-300' },
};

export default function AttendancePage() {
  const [date, setDate] = useState<string>(() => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  });
  const [site, setSite] = useState<string>('');
  const [personnel, setPersonnel] = useState<Personnel[]>([]);
  const [selection, setSelection] = useState<Record<string, { status?: AttendanceStatus; location?: string; note?: string }>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [viewDate, setViewDate] = useState<string>('');
  const [history, setHistory] = useState<any[]>([]);
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);
  const [fadeIn, setFadeIn] = useState<boolean>(false);
  const [showInputTable, setShowInputTable] = useState<boolean>(false);
  const [summary, setSummary] = useState<{ total: number; byStatus: Record<string, number>; present: number; totalWorkers: number; byCompany: Record<string, any> }>({ total: 0, byStatus: {}, present: 0, totalWorkers: 0, byCompany: {} });
  const [search, setSearch] = useState<string>('');

  // Kullanıcı site'ını belirle
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    let siteFromUrl = urlParams.get('site');
    if (!siteFromUrl) {
      const userStr = sessionStorage.getItem('currentUser');
      if (userStr) {
        try {
          const user = JSON.parse(userStr);
          siteFromUrl = user.activeSite || user.site;
        } catch {}
      }
    }
    setSite(siteFromUrl || '');
  }, []);

  // Personel listesini çek
  useEffect(() => {
    const fetchPersonnel = async () => {
      if (!site) return;
      setLoading(true);
      const res = await fetch(`/api/personnel?site=${encodeURIComponent(site)}&_t=${Date.now()}`);
      const data = await res.json();
      setPersonnel(Array.isArray(data) ? data : []);
      setLoading(false);
    };
    fetchPersonnel();
  }, [site]);

  // Seçim güncelleme
  const updateSelection = (id: string, patch: Partial<{ status: AttendanceStatus; location: string; note: string }>) => {
    setSelection((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  };

  const toggleExpand = (id: string) => {
    setExpandedRowId((prev) => (prev === id ? null : id));
  };

  useEffect(() => {
    if (expandedRowId) {
      setFadeIn(false);
      const r = requestAnimationFrame(() => setFadeIn(true));
      return () => cancelAnimationFrame(r);
    } else {
      setFadeIn(false);
    }
  }, [expandedRowId]);

  // Şirket toplamları
  const companyTotals = useMemo(() => {
    const totals = { present: 0, GUNDUZ: 0, GECE: 0, IZINLI: 0, HASTA_RAPORLU: 0, MAZERETSIZ: 0, total: 0 } as any;
    Object.values(summary.byCompany || {}).forEach((stats: any) => {
      totals.present += stats.present || 0;
      totals.GUNDUZ += stats.GUNDUZ || 0;
      totals.GECE += stats.GECE || 0;
      totals.IZINLI += stats.IZINLI || 0;
      totals.HASTA_RAPORLU += stats.HASTA_RAPORLU || 0;
      totals.MAZERETSIZ += stats.MAZERETSIZ || 0;
      totals.total += stats.total || 0;
    });
    return totals;
  }, [summary.byCompany]);

  // Kaydet
  const save = async () => {
    const userStr = sessionStorage.getItem('currentUser');
    if (!userStr) return alert('Oturum bulunamadı');
    const user = JSON.parse(userStr);
    const entries = Object.entries(selection)
      .filter(([_, v]) => !!v.status)
      .map(([personnelId, v]) => ({
        personnelId,
        status: v.status!,
        location: v.location,
        note: v.note,
      }));

    if (entries.length === 0) return alert('Herhangi bir seçim yok');

    setSaving(true);
    const res = await fetch('/api/attendance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date, site, entries, userEmail: user.email }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      alert(data?.error || 'Kayıt sırasında hata');
    } else {
      alert(`Kayıt tamamlandı (${data.count})`);
      // Günün geçmişini göster
      setViewDate(date);
      await loadHistory(date);
    }
  };

  const loadHistory = async (targetDate: string) => {
    if (!site) return;
    const res = await fetch(`/api/attendance?site=${encodeURIComponent(site)}&date=${targetDate}`);
    const data = await res.json();
    setHistory(Array.isArray(data) ? data : []);
    // Özet
    const byStatus: Record<string, number> = {};
    const byCompany: Record<string, any> = {};
    let present = 0;
    (Array.isArray(data) ? data : []).forEach((r: any) => {
      byStatus[r.status] = (byStatus[r.status] || 0) + 1;
      const company = r.personnel?.company || 'Bilinmiyor';
      if (!byCompany[company]) byCompany[company] = { GUNDUZ: 0, GECE: 0, IZINLI: 0, HASTA_RAPORLU: 0, HASTA_RAPORSUZ: 0, MAZERETSIZ: 0, GOREVLI: 0, VIZE: 0, PATENT_OTURUM_BEKLIYOR: 0, HAFTA_SONU_TATILI: 0, GIRIS_CIKIS: 0, CALISMA_KARTI_BEKLIYOR: 0, present: 0, total: 0 };
      byCompany[company][r.status] = (byCompany[company][r.status] || 0) + 1;
      byCompany[company].total += 1;
      if (r.status === 'GUNDUZ' || r.status === 'GECE') {
        present += 1;
        byCompany[company].present += 1;
      }
    });
    setSummary({ total: Array.isArray(data) ? data.length : 0, byStatus, present, totalWorkers: personnel.length, byCompany });
  };

  useEffect(() => {
    if (date && site) {
      loadHistory(date);
      setViewDate(date);
    }
  }, [date, site]);

  const statusOptions = useMemo(() => Object.entries(STATUS_LABELS) as Array<[AttendanceStatus, string]>, []);

  const formatDateTR = (s: string) => {
    if (!s) return '';
    const [y, m, d] = s.split('-');
    return `${d}.${m}.${y}`;
  };

  return (
    <div className="min-h-screen bg-cover bg-center bg-fixed" style={{ backgroundImage: "url('/arkaplan.jpg')" }}>
      <div className="container mx-auto px-2 py-6">
        <div className="bg-white/90 backdrop-blur-sm rounded-lg shadow-xl p-4">
          {/* Üstte Futuristik Geçmiş Paneli (Günün Kayıt Özeti) */}
          <div className="relative overflow-hidden rounded-xl border border-gray-200 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-gray-100 p-4 mb-4">
            <div className="absolute -top-24 -right-24 w-72 h-72 bg-cyan-500/20 rounded-full blur-3xl" />
            <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-purple-500/20 rounded-full blur-3xl" />
            <div className="relative">
              <div className="flex flex-col sm:flex-row sm:items-end gap-3">
                <div>
                  <div className="text-xs text-gray-400">Geçmiş</div>
                  <h2 className="text-xl font-semibold tracking-wide">
                    Günün Kayıtları
                    {viewDate && (
                      <span className="ml-2 text-sm text-gray-300 align-middle">({formatDateTR(viewDate)})</span>
                    )}
                  </h2>
                </div>
                <div className="flex-1" />
                <div className="flex items-center gap-2">
                  <input type="date" value={viewDate} onChange={(e) => { setViewDate(e.target.value); setDate(e.target.value); setShowInputTable(false); setExpandedRowId(null); loadHistory(e.target.value); }} className="border rounded px-2 py-1 bg-gray-800 text-gray-100 border-white/10" />
                  <span className="text-xs text-gray-400">Toplam: {summary.total}</span>
                </div>
              </div>
              {/* Detaylı özet: Toplam işçi, mevcut (Gündüz+Gece), durum kırılımı ve şirket bazında tablo */}
              <div className="mt-4 grid gap-3">
                {/* Üst metrikler */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                    <div className="text-[10px] uppercase tracking-wider text-gray-300">Mevcut (Gündüz+Gece)</div>
                    <div className="mt-1 text-2xl font-semibold">{summary.present}</div>
                  </div>
                  <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                    <div className="text-[10px] uppercase tracking-wider text-gray-300">Devamsız</div>
                    <div className="mt-1 text-2xl font-semibold">{Math.max(summary.totalWorkers - summary.present, 0)}</div>
                  </div>
                  <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                    <div className="text-[10px] uppercase tracking-wider text-gray-300">Mevcut Oranı</div>
                    <div className="mt-1 text-2xl font-semibold">{summary.totalWorkers > 0 ? Math.round((summary.present / summary.totalWorkers) * 100) : 0}%</div>
                  </div>
                </div>

                {/* Durum bazlı kartlar kaldırıldı - şirket tablosu aşağıda detay veriyor */}

                {/* Şirket bazında özet */}
                {Object.keys(summary.byCompany).length > 0 && (
                  <div className="rounded-lg border border-white/10 bg-white/5 p-3 overflow-x-auto">
                    <table className="min-w-full text-xs text-gray-200">
                      <thead>
                        <tr className="text-left">
                          <th className="px-2 py-2">Şirket</th>
                          <th className="px-2 py-2">Mevcut</th>
                          <th className="px-2 py-2">Gündüz</th>
                          <th className="px-2 py-2">Gece</th>
                          <th className="px-2 py-2">İzinli</th>
                          <th className="px-2 py-2">Hasta (Raporlu)</th>
                          <th className="px-2 py-2">Mazeretsiz</th>
                          <th className="px-2 py-2">Toplam</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(summary.byCompany).map(([company, stats]: any) => (
                          <tr key={company} className="border-t border-white/10">
                            <td className="px-2 py-2 whitespace-nowrap">{company}</td>
                            <td className="px-2 py-2">{stats.present || 0}</td>
                            <td className="px-2 py-2">{stats.GUNDUZ || 0}</td>
                            <td className="px-2 py-2">{stats.GECE || 0}</td>
                            <td className="px-2 py-2">{stats.IZINLI || 0}</td>
                            <td className="px-2 py-2">{stats.HASTA_RAPORLU || 0}</td>
                            <td className="px-2 py-2">{stats.MAZERETSIZ || 0}</td>
                            <td className="px-2 py-2">{stats.total || 0}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t border-white/20 text-gray-100">
                          <td className="px-2 py-2 font-semibold">Toplam</td>
                          <td className="px-2 py-2 font-semibold">{companyTotals.present}</td>
                          <td className="px-2 py-2 font-semibold">{companyTotals.GUNDUZ}</td>
                          <td className="px-2 py-2 font-semibold">{companyTotals.GECE}</td>
                          <td className="px-2 py-2 font-semibold">{companyTotals.IZINLI}</td>
                          <td className="px-2 py-2 font-semibold">{companyTotals.HASTA_RAPORLU}</td>
                          <td className="px-2 py-2 font-semibold">{companyTotals.MAZERETSIZ}</td>
                          <td className="px-2 py-2 font-semibold">{companyTotals.total}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {summary.total === 0 && (
                  <button
                    onClick={() => { setSelection({}); setExpandedRowId(null); setShowInputTable(true); }}
                    className="px-4 py-2 rounded-md border border-white/10 bg-white/5 hover:bg-white/10 text-gray-100 text-sm"
                  >
                    Yeni Puantaj Ekle
                  </button>
                )}
                <button
                  onClick={() => {
                    // Günün detay listesi joker tabloya yansıtılsın
                    setShowInputTable(true);
                    // personel listesi yerine history bilgisi ile selection doldurulur
                    const map: Record<string, { status?: AttendanceStatus; location?: string; note?: string }> = {};
                    history.forEach((r: any) => {
                      if (r.personnel?._id) {
                        map[r.personnel._id] = { status: r.status, location: r.location, note: r.note } as any;
                      }
                    });
                    setSelection((prev) => ({ ...prev, ...map }));
                  }}
                  disabled={summary.total === 0}
                  className="px-4 py-2 rounded-md border border-white/10 bg-white/5 hover:bg-white/10 text-gray-100 disabled:opacity-50 text-sm"
                >
                  Bugünün Listesini Görüntüle/Düzenle
                </button>
                <button
                  onClick={async () => {
                    if (!confirm('Bugüne ait tüm puantaj kayıtlarını silmek istiyor musunuz?')) return;
                    const res = await fetch(`/api/attendance?site=${encodeURIComponent(site)}&date=${viewDate}`, { method: 'DELETE' });
                    const data = await res.json();
                    alert(`${data.deletedCount || 0} kayıt silindi`);
                    loadHistory(viewDate);
                  }}
                  disabled={summary.total === 0}
                  className="px-4 py-2 rounded-md border border-red-500/30 bg-red-500/20 hover:bg-red-500/30 text-red-100 disabled:opacity-50 text-sm"
                >
                  Bugünün Kayıtlarını Sil
                </button>
              </div>
            </div>
          </div>

          {/* Form alanları */}
          <div className="flex flex-col sm:flex-row sm:items-end gap-3 mb-3">
            <div className="flex-1">
              <label className="block text-xs text-gray-600 mb-1">Tarih</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full border rounded px-3 py-2" />
            </div>
            <div className="flex-1">
              <label className="block text-xs text-gray-600 mb-1">Şantiye</label>
              <input value={site} onChange={(e) => setSite(e.target.value)} className="w-full border rounded px-3 py-2" placeholder="Şantiye" />
            </div>
            <div className="flex-1">
              <label className="block text-xs text-gray-600 mb-1">Personel Ara</label>
              <input value={search} onChange={(e) => setSearch(e.target.value)} className="w-full border rounded px-3 py-2" placeholder="İsim, sicil, şirket, ülke..." />
            </div>
            <button onClick={save} disabled={saving || loading || !site} className="bg-blue-600 disabled:opacity-60 text-white px-4 py-2 rounded-md">
              {saving ? 'Kaydediliyor...' : 'Günü Kaydet'}
            </button>
          </div>

          {/* Personel listesi ve seçim */}
          {/* Joker tablo: ilk girişte gizli, butonla açılır */}
          {showInputTable && (
          <div className="overflow-x-auto">
            {loading ? (
              <div className="p-8 text-center">Yükleniyor...</div>
            ) : (
              <table className="w-full text-sm rounded-lg overflow-hidden ring-1 ring-gray-200" style={{ minWidth: '1000px' }}>
                <thead>
                  <tr className="bg-gradient-to-r from-gray-50 to-gray-100 text-gray-700">
                    <th className="px-2 py-2 text-left">Personel</th>
                    <th className="px-2 py-2 text-left">Sicil</th>
                    <th className="px-2 py-2 text-left">Ülke</th>
                    <th className="px-2 py-2 text-left">Şirket</th>
                    <th className="px-2 py-2 text-left">Durum</th>
                    <th className="px-2 py-2 text-left">Detay</th>
                  </tr>
                </thead>
                <tbody>
                  {personnel
                    .filter((p) => {
                      const q = search.trim().toLowerCase();
                      if (!q) return true;
                      return (
                        p.firstName.toLowerCase().includes(q) ||
                        p.lastName.toLowerCase().includes(q) ||
                        p.employeeId.toLowerCase().includes(q) ||
                        (p.company || '').toLowerCase().includes(q) ||
                        (p.country || '').toLowerCase().includes(q)
                      );
                    })
                    .map((p) => (
                    <>
                      <tr key={p._id} className={`border-b transition-colors duration-200 ${expandedRowId === p._id ? 'bg-gray-50' : 'bg-white'}`}>
                        <td className="px-2 py-2">{p.firstName} {p.lastName}</td>
                        <td className="px-2 py-2">{p.employeeId}</td>
                        <td className="px-2 py-2">{p.country || '-'}</td>
                        <td className="px-2 py-2">{p.company || '-'}</td>
                        <td className="px-2 py-2">
                          <select
                            value={selection[p._id]?.status || ''}
                            onChange={(e) => updateSelection(p._id, { status: e.target.value as AttendanceStatus })}
                            className="border rounded px-2 py-1"
                          >
                            <option value="">Seçiniz</option>
                            {statusOptions.map(([value, label]) => (
                              <option key={value} value={value}>{label}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-2 py-2">
                          <button
                            onClick={() => toggleExpand(p._id)}
                            className={`px-3 py-1 rounded-md text-xs bg-gray-900 text-white border border-gray-700 shadow-sm hover:shadow transition-transform ${expandedRowId === p._id ? 'scale-[0.98]' : 'scale-100'}`}
                          >
                            {expandedRowId === p._id ? 'Kapat' : 'Yer/Not'}
                          </button>
                        </td>
                      </tr>
                      {expandedRowId === p._id && (
                        <tr className="border-b bg-white/90">
                          <td colSpan={6} className="px-4 py-3">
                            <div className={`transition duration-150 ease-out ${fadeIn ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-1'} transform`}>
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div className="sm:col-span-1">
                                  <label className="block text-xs text-gray-600 mb-1">Bulunduğu Yer</label>
                                  <input
                                    className="w-full border rounded px-3 py-2"
                                    placeholder="Örn: Şantiye • A Blok"
                                    value={selection[p._id]?.location || ''}
                                    onChange={(e) => updateSelection(p._id, { location: e.target.value })}
                                  />
                                </div>
                                <div className="sm:col-span-2">
                                  <label className="block text-xs text-gray-600 mb-1">Açıklama</label>
                                  <input
                                    className="w-full border rounded px-3 py-2"
                                    placeholder="Kısa not..."
                                    value={selection[p._id]?.note || ''}
                                    onChange={(e) => updateSelection(p._id, { note: e.target.value })}
                                  />
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          )}

          {/* Inline detay satırları kullanılıyor; ayrı modal kaldırıldı */}
        </div>
      </div>
    </div>
  );
}


