import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/app/lib/mongodb';
import Camp from '@/app/models/Camp';

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();
    
    const { campId, userEmail } = await request.json();
    
    if (!campId || !userEmail) {
      return NextResponse.json({ error: 'Kamp ID ve kullanıcı email\'i gerekli' }, { status: 400 });
    }

    // Kampı bul
    const camp = await Camp.findById(campId);
    if (!camp) {
      return NextResponse.json({ error: 'Kamp bulunamadı' }, { status: 404 });
    }

    // Kullanıcının paylaşılan kullanıcılar listesinde olup olmadığını kontrol et
    const isSharedUser = camp.sharedWith.some((shared: { email: string; permission: 'read' | 'write' }) => shared.email === userEmail);
    if (!isSharedUser) {
      return NextResponse.json({ error: 'Bu kampa paylaşılan kullanıcı değilsiniz' }, { status: 403 });
    }

    // Kullanıcıyı sharedWith listesinden çıkar
    camp.sharedWith = camp.sharedWith.filter((shared: { email: string; permission: 'read' | 'write' }) => shared.email !== userEmail);
    
    // Kampı güncelle
    await camp.save();

    return NextResponse.json({ 
      message: 'Kamp paylaşımından başarıyla çıkarıldınız',
      camp: camp 
    });

  } catch (error) {
    console.error('Kamp paylaşımından çıkarma hatası:', error);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
} 