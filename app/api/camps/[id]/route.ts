import Camp from '@/app/models/Camp';
import User from '@/app/models/User';
import { NextResponse } from 'next/server';
import connectDB from '@/app/lib/mongodb';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: campId } = await params;
    
    await connectDB();

    const camp = await Camp.findById(campId);
    if (!camp) {
      return NextResponse.json({ error: 'Kamp bulunamadı' }, { status: 404 });
    }

    // Kamp oluşturan kullanıcının site bilgisini al
    const campOwner = await User.findOne({ email: camp.userEmail });
    
    const campWithSite = {
      ...camp.toObject(),
      site: camp.site || campOwner?.site || null
    };

    return NextResponse.json(campWithSite);
  } catch (error) {
    console.error('Kamp getirme hatası:', error);
    return NextResponse.json(
      { error: 'Kamp getirilirken hata oluştu' },
      { status: 500 }
    );
  }
} 