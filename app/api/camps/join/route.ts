import Camp from '@/app/models/Camp';
import { NextResponse } from 'next/server';
import connectDB from '@/app/lib/mongodb';

export async function POST(request: Request) {
  try {
    const { code, userEmail } = await request.json();

    if (!code || !userEmail) {
      return NextResponse.json({ error: 'Kod ve kullanıcı e-postası gerekli' }, { status: 400 });
    }

    await connectDB();

    // Kodu kullanarak kampı bul (büyük/küçük harf duyarsızlığı için kodu büyüt)
    const camp = await Camp.findOne({
      $or: [
        { 'shareCodes.read': code.toUpperCase() },
        { 'shareCodes.write': code.toUpperCase() }
      ]
    });

    if (!camp) {
      return NextResponse.json({ error: 'Geçersiz kamp kodu' }, { status: 404 });
    }

    // Kullanıcının kampın sahibi olup olmadığını kontrol et
    if (camp.userEmail === userEmail) {
        return NextResponse.json({ error: 'Zaten bu kampın sahibisiniz' }, { status: 400 });
    }

    // Kullanıcının zaten kampa ekli olup olmadığını kontrol et
    const alreadyJoined = camp.sharedWith.some((member: {email: string}) => member.email === userEmail);
    if (alreadyJoined) {
        return NextResponse.json({ error: 'Bu kampa zaten katıldınız' }, { status: 400 });
    }

    // Yetki seviyesini belirle
    const permission = camp.shareCodes.write === code ? 'write' : 'read';

    // Kullanıcıyı kampa ekle
    camp.sharedWith.push({ email: userEmail, permission });
    await camp.save();

    return NextResponse.json(camp);

  } catch (error) {
    console.error("Join camp error:", error);
    return NextResponse.json(
      { error: 'Kampa katılırken bir hata oluştu' },
      { status: 500 }
    );
  }
} 