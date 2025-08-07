import { NextRequest, NextResponse } from 'next/server';
import connectDB from '../../lib/mongodb';
import Site from '../../models/Site';
import User from '../../models/User';

// Tüm şantiyeleri getir
export async function GET() {
  try {
    await connectDB();
    const sites = await Site.find().sort({ name: 1 });
    return NextResponse.json(sites);
  } catch (error) {
    console.error('Şantiyeler getirilirken hata:', error);
    return NextResponse.json({ error: 'Şantiyeler yüklenemedi' }, { status: 500 });
  }
}

// Yeni şantiye oluştur
export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const { name, description } = await request.json();



    // Yetki kontrolü - sadece kurucu_admin ve merkez_admin
    const userStr = request.headers.get('user');
    if (!userStr) {
      return NextResponse.json({ error: 'Yetkilendirme gerekli' }, { status: 401 });
    }
    
    const user = JSON.parse(userStr);
    if (!['kurucu_admin', 'merkez_admin'].includes(user.role)) {
      return NextResponse.json({ error: 'Bu işlem için yetkiniz yok' }, { status: 403 });
    }

    // Şantiye adı kontrolü
    if (!name || name.trim().length === 0) {
      return NextResponse.json({ error: 'Şantiye adı gerekli' }, { status: 400 });
    }

    console.log('Şantiye adı kontrolü geçti:', name.trim());

    // Aynı isimde şantiye var mı kontrol et (sadece aktif olanları)
    const existingSite = await Site.findOne({ name: name.trim() });
    console.log('Mevcut şantiye kontrolü:', existingSite);
    
    if (existingSite) {
      return NextResponse.json({ error: 'Bu isimde bir şantiye zaten mevcut' }, { status: 400 });
    }

    console.log('Şantiye oluşturuluyor...');

    const site = new Site({
      name: name.trim(),
      description: description || ''
    });

    await site.save();
    console.log('Şantiye başarıyla oluşturuldu:', site);
    return NextResponse.json(site);
  } catch (error) {
    console.error('Şantiye oluşturulurken hata:', error);
    const errorMessage = error instanceof Error ? error.message : 'Bilinmeyen hata';
    return NextResponse.json({ error: 'Şantiye oluşturulamadı: ' + errorMessage }, { status: 500 });
  }
}

// Şantiye güncelle
export async function PUT(request: NextRequest) {
  try {
    await connectDB();
    const { _id, name, description } = await request.json();

    // Yetki kontrolü
    const userStr = request.headers.get('user');
    if (!userStr) {
      return NextResponse.json({ error: 'Yetkilendirme gerekli' }, { status: 401 });
    }
    
    const user = JSON.parse(userStr);
    if (!['kurucu_admin', 'merkez_admin'].includes(user.role)) {
      return NextResponse.json({ error: 'Bu işlem için yetkiniz yok' }, { status: 403 });
    }

    const site = await Site.findById(_id);
    if (!site) {
      return NextResponse.json({ error: 'Şantiye bulunamadı' }, { status: 404 });
    }

    // Aynı isimde başka şantiye var mı kontrol et
    if (name && name !== site.name) {
      const existingSite = await Site.findOne({ name: name.trim(), _id: { $ne: _id } });
      if (existingSite) {
        return NextResponse.json({ error: 'Bu isimde bir şantiye zaten mevcut' }, { status: 400 });
      }
    }

    site.name = name || site.name;
    site.description = description !== undefined ? description : site.description;
    site.updatedAt = new Date();

    await site.save();
    return NextResponse.json(site);
  } catch (error) {
    console.error('Şantiye güncellenirken hata:', error);
    return NextResponse.json({ error: 'Şantiye güncellenemedi' }, { status: 500 });
  }
}

// Şantiye sil (hard delete)
export async function DELETE(request: NextRequest) {
  try {
    await connectDB();
    const { id } = await request.json();

    // Yetki kontrolü
    const userStr = request.headers.get('user');
    if (!userStr) {
      return NextResponse.json({ error: 'Yetkilendirme gerekli' }, { status: 401 });
    }
    
    const user = JSON.parse(userStr);
    if (!['kurucu_admin', 'merkez_admin'].includes(user.role)) {
      return NextResponse.json({ error: 'Bu işlem için yetkiniz yok' }, { status: 403 });
    }

    const site = await Site.findById(id);
    if (!site) {
      return NextResponse.json({ error: 'Şantiye bulunamadı' }, { status: 404 });
    }

    // Bu şantiyede çalışan kullanıcı var mı kontrol et
    const usersWithSite = await User.find({ site: site.name });
    if (usersWithSite.length > 0) {
      return NextResponse.json({ 
        error: 'Bu şantiyede çalışan kullanıcılar var. Önce kullanıcıları başka şantiyeye taşıyın.' 
      }, { status: 400 });
    }

    // Bu şantiyede kamp var mı kontrol et
    const Camp = (await import('@/app/models/Camp')).default;
    const campsWithSite = await Camp.find({ site: site.name });
    if (campsWithSite.length > 0) {
      return NextResponse.json({ 
        error: 'Bu şantiyede kamplar var. Önce kampları başka şantiyeye taşıyın.' 
      }, { status: 400 });
    }

    // Hard delete - şantiyeyi tamamen sil
    await Site.findByIdAndDelete(id);

    return NextResponse.json({ message: 'Şantiye başarıyla silindi' });
  } catch (error) {
    console.error('Şantiye silinirken hata:', error);
    return NextResponse.json({ error: 'Şantiye silinemedi' }, { status: 500 });
  }
} 