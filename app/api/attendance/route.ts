import { NextResponse } from 'next/server';
import connectDB from '@/app/lib/mongodb';
import Attendance from '@/app/models/Attendance';
import Personnel from '@/app/models/Personnel';
import User from '@/app/models/User';

// Yardımcı: Date'i YYYY-MM-DD olarak formatla
function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// GET /api/attendance?site=...&date=YYYY-MM-DD&personnelId=...
export async function GET(request: Request) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const site = searchParams.get('site') || undefined;
    const dateParam = searchParams.get('date') || undefined;
    const personnelId = searchParams.get('personnelId') || undefined;

    const query: any = {};
    if (site) query.site = site;
    if (dateParam) query.dateKey = dateParam;
    if (personnelId) query.personnel = personnelId;

    const records = await Attendance.find(query)
      .populate('personnel')
      .sort({ createdAt: -1 });

    return NextResponse.json(records);
  } catch (error) {
    console.error('Attendance GET error:', error);
    return NextResponse.json({ error: 'Puantaj kayıtları getirilirken hata oluştu' }, { status: 500 });
  }
}

// POST /api/attendance  { date, site, entries: [{ personnelId, status, location?, note? }], userEmail }
export async function POST(request: Request) {
  try {
    await connectDB();
    const body = await request.json();
    const { date, site, entries, userEmail } = body as {
      date: string;
      site: string;
      entries: Array<{ personnelId: string; status: string; location?: string; note?: string }>;
      userEmail: string;
    };

    if (!date || !site || !Array.isArray(entries) || !userEmail) {
      return NextResponse.json({ error: 'Zorunlu alanlar eksik' }, { status: 400 });
    }

    const user = await User.findOne({ email: userEmail });
    if (!user) {
      return NextResponse.json({ error: 'Kullanıcı bulunamadı' }, { status: 404 });
    }

    // Tarih
    const [y, m, d] = date.split('-').map((v: string) => parseInt(v, 10));
    const dateObj = new Date(y, m - 1, d);
    const dateKey = toDateKey(dateObj);

    // Girişleri doğrula: personeller aynı şantiyede mi ve mevcut mu
    const personnelIds = entries.map((e) => e.personnelId);
    const personnelList = await Personnel.find({ _id: { $in: personnelIds }, site });
    const validIds = new Set(personnelList.map((p) => p._id.toString()));

    const docs = entries
      .filter((e) => validIds.has(e.personnelId))
      .map((e) => ({
        site,
        personnel: e.personnelId,
        date: dateObj,
        dateKey,
        status: e.status,
        location: e.location || undefined,
        note: e.note || undefined,
        createdBy: user._id,
      }));

    // Upsert: aynı (site, personnel, dateKey) varsa güncelle
    const results: any[] = [];
    for (const doc of docs) {
      const updated = await Attendance.findOneAndUpdate(
        { site: doc.site, personnel: doc.personnel, dateKey: doc.dateKey },
        { $set: doc },
        { upsert: true, new: true }
      );
      results.push(updated);
    }

    return NextResponse.json({ success: true, count: results.length, records: results }, { status: 201 });
  } catch (error) {
    console.error('Attendance POST error:', error);
    return NextResponse.json({ error: 'Puantaj kaydedilirken hata oluştu' }, { status: 500 });
  }
}

// DELETE /api/attendance?site=...&date=YYYY-MM-DD  (tüm gün)
// veya /api/attendance?id=...  (tek kayıt)
export async function DELETE(request: Request) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const site = searchParams.get('site');
    const date = searchParams.get('date');

    if (id) {
      const result = await Attendance.deleteOne({ _id: id });
      return NextResponse.json({ deletedCount: result.deletedCount || 0 });
    }

    if (!site || !date) {
      return NextResponse.json({ error: 'Silme için site ve date gereklidir' }, { status: 400 });
    }

    const result = await Attendance.deleteMany({ site, dateKey: date });
    return NextResponse.json({ deletedCount: result.deletedCount || 0 });
  } catch (error) {
    console.error('Attendance DELETE error:', error);
    return NextResponse.json({ error: 'Puantaj silinirken hata oluştu' }, { status: 500 });
  }
}


