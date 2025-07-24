import { NextResponse } from 'next/server';
import connectDB from '@/app/lib/mongodb';
import User from '@/app/models/User';

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    await connectDB();

    // Kullanıcıyı bul
    const user = await User.findOne({ email });
    if (!user) {
      return NextResponse.json(
        { error: 'Email veya şifre hatalı' },
        { status: 401 }
      );
    }

    console.log('Veritabanından gelen kullanıcı:', {
      email: user.email,
      role: user.role,
      site: user.site,
      isApproved: user.isApproved,
      siteAccessApproved: user.siteAccessApproved,
      sitePermissions: user.sitePermissions
    });

    // Şifre kontrolü (gerçek uygulamada hash kontrolü yapılmalı)
    if (user.password !== password) {
      return NextResponse.json(
        { error: 'Email veya şifre hatalı' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      message: 'Giriş başarılı',
      user: {
        email: user.email,
        role: user.role,
        site: user.site,
        isApproved: user.isApproved,
        siteAccessApproved: user.siteAccessApproved,
        sitePermissions: user.sitePermissions,
        camps: user.camps
      }
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Giriş yapılırken bir hata oluştu' },
      { status: 500 }
    );
  }
} 