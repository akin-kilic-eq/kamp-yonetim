import { NextResponse } from 'next/server';
import connectDB from '@/app/lib/mongodb';
import User from '@/app/models/User';

export async function POST(request: Request) {
  try {
    const { email, password, site } = await request.json();

    await connectDB();

    // Email kontrolü
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return NextResponse.json(
        { error: 'Bu email adresi zaten kayıtlı' },
        { status: 400 }
      );
    }

    // Yeni kullanıcı oluştur
    const user = await User.create({
      email,
      password, // Gerçek uygulamada şifre hash'lenmelidir
      site,
      role: 'user',
      isApproved: false,
      camps: []
    });

    return NextResponse.json({
      message: 'Kullanıcı başarıyla oluşturuldu',
      user: {
        email: user.email,
        site: user.site,
        role: user.role,
        isApproved: user.isApproved,
        camps: user.camps
      }
    });
  } catch (error) {
    console.error('REGISTER API ERROR:', error);
    return NextResponse.json(
      { error: 'Kullanıcı oluşturulurken bir hata oluştu' },
      { status: 500 }
    );
  }
} 