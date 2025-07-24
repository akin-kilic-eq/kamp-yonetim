import { NextResponse } from 'next/server';
import connectDB from '@/app/lib/mongodb';
import User from '@/app/models/User';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  
  // Şantiye admini için bekleyen kullanıcı sayısı endpoint'i
  const pendingCount = searchParams.get('pendingCount');
  if (pendingCount === 'true') {
    const userEmail = searchParams.get('email');
    if (!userEmail) {
      return NextResponse.json({ error: 'Kullanıcı email gerekli' }, { status: 400 });
    }
    await connectDB();
    const adminUser = await User.findOne({ email: userEmail });
    if (!adminUser || adminUser.role !== 'santiye_admin' || !adminUser.site) {
      return NextResponse.json({ error: 'Erişim reddedildi' }, { status: 403 });
    }
    const count = await User.countDocuments({
      site: adminUser.site,
      role: 'user',
      siteAccessApproved: false
    });
    return NextResponse.json({ count });
  }
  try {
    // Kimlik doğrulama için email parametresi alınacak (gerçek uygulamada JWT ile yapılmalı)
    const { searchParams } = new URL(request.url);
    const requesterEmail = searchParams.get('email');
    if (!requesterEmail) {
      return NextResponse.json({ error: 'Erişim reddedildi' }, { status: 401 });
    }

    await connectDB();
    const requester = await User.findOne({ email: requesterEmail });
    if (!requester) {
      return NextResponse.json({ error: 'Erişim reddedildi' }, { status: 403 });
    }

    // Eğer user rolündeyse sadece kendi bilgisi dönsün
    if (requester.role === 'user') {
      return NextResponse.json([
        {
          email: requester.email,
          password: requester.password || '',
          role: requester.role || '',
          site: requester.site || '',
          isApproved: typeof requester.isApproved === 'boolean' ? requester.isApproved : false,
          siteAccessApproved: typeof requester.siteAccessApproved === 'boolean' ? requester.siteAccessApproved : false,
          sitePermissions: requester.sitePermissions || { canViewCamps: false, canEditCamps: false, canCreateCamps: false },
          createdAt: requester.createdAt || ''
        }
      ]);
    }

    let users = [];
    if (requester.role === 'santiye_admin') {
      users = await User.find({ site: requester.site });
    } else {
      users = await User.find({});
    }
    // Eksik alanları boş string olarak tamamla ve şifreyi de döndür
    const usersWithPassword = users.map(u => ({
      email: u.email,
      password: u.password || '',
      role: u.role || '',
      site: u.site || '',
      isApproved: typeof u.isApproved === 'boolean' ? u.isApproved : false,
      siteAccessApproved: typeof u.siteAccessApproved === 'boolean' ? u.siteAccessApproved : false,
      sitePermissions: u.sitePermissions || { canViewCamps: false, canEditCamps: false, canCreateCamps: false },
      createdAt: u.createdAt || ''
    }));
    return NextResponse.json(usersWithPassword);
  } catch (error) {
    return NextResponse.json({ error: 'Kullanıcılar getirilirken hata oluştu' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { email, password, site, role, requesterEmail } = await request.json();
    if (!requesterEmail) {
      return NextResponse.json({ error: 'Erişim reddedildi' }, { status: 401 });
    }
    await connectDB();
    const requester = await User.findOne({ email: requesterEmail });
    if (!requester || (requester.role !== 'kurucu_admin' && requester.role !== 'merkez_admin')) {
      return NextResponse.json({ error: 'Erişim reddedildi' }, { status: 403 });
    }
    // Email kontrolü
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return NextResponse.json({ error: 'Bu email adresi zaten kayıtlı' }, { status: 400 });
    }
    const user = await User.create({
      email,
      password,
      site,
      role: role || 'user',
      isApproved: false,
      camps: []
    });
    return NextResponse.json({ message: 'Kullanıcı başarıyla oluşturuldu', user });
  } catch (error) {
    return NextResponse.json({ error: 'Kullanıcı oluşturulurken hata oluştu' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const { email, isApproved, role, site, password, requesterEmail, siteAccessApproved, sitePermissions } = await request.json();
    if (!requesterEmail) {
      return NextResponse.json({ error: 'Erişim reddedildi' }, { status: 401 });
    }
    await connectDB();
    const requester = await User.findOne({ email: requesterEmail });
    if (!requester) {
      return NextResponse.json({ error: 'Erişim reddedildi' }, { status: 403 });
    }

    // Şantiye admini sadece kendi şantiyesindeki user'ların siteAccessApproved ve sitePermissions alanlarını güncelleyebilir
    if (requester.role === 'santiye_admin') {
      const targetUser = await User.findOne({ email });
      if (!targetUser || targetUser.site !== requester.site || targetUser.role !== 'user') {
        return NextResponse.json({ error: 'Erişim reddedildi' }, { status: 403 });
      }
      const updateData: any = {};
      if (typeof siteAccessApproved === 'boolean') updateData.siteAccessApproved = siteAccessApproved;
      if (sitePermissions) updateData.sitePermissions = sitePermissions;
      const updatedUser = await User.findOneAndUpdate(
        { email },
        { $set: updateData },
        { new: true, projection: '-password' }
      );
      if (!updatedUser) {
        return NextResponse.json({ error: 'Kullanıcı bulunamadı' }, { status: 404 });
      }
      return NextResponse.json(updatedUser);
    }

    // Kurucu ve merkez adminler için mevcut davranış
    if (requester.role === 'kurucu_admin' || requester.role === 'merkez_admin') {
      const updateData: any = {};
      if (typeof isApproved === 'boolean') updateData.isApproved = isApproved;
      if (role) updateData.role = role;
      if (site !== undefined) updateData.site = site;
      if (password && password.trim() !== '') updateData.password = password;
      if (typeof siteAccessApproved === 'boolean') updateData.siteAccessApproved = siteAccessApproved;
      if (sitePermissions) updateData.sitePermissions = sitePermissions;
      const updatedUser = await User.findOneAndUpdate(
        { email },
        { $set: updateData },
        { new: true, projection: '-password' }
      );
      if (!updatedUser) {
        return NextResponse.json({ error: 'Kullanıcı bulunamadı' }, { status: 404 });
      }
      return NextResponse.json(updatedUser);
    }

    // Diğer roller erişemez
    return NextResponse.json({ error: 'Erişim reddedildi' }, { status: 403 });
  } catch (error) {
    return NextResponse.json({ error: 'Kullanıcı güncellenirken hata oluştu' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { email, requesterEmail } = await request.json();
    if (!requesterEmail) {
      return NextResponse.json({ error: 'Erişim reddedildi' }, { status: 401 });
    }
    await connectDB();
    const requester = await User.findOne({ email: requesterEmail });
    if (!requester || (requester.role !== 'kurucu_admin' && requester.role !== 'merkez_admin')) {
      return NextResponse.json({ error: 'Erişim reddedildi' }, { status: 403 });
    }

    // Silinecek kullanıcıyı bul
    const userToDelete = await User.findOne({ email });
    if (!userToDelete) {
      return NextResponse.json({ error: 'Kullanıcı bulunamadı' }, { status: 404 });
    }

    // Kullanıcının oluşturduğu kampları bul
    const Camp = (await import('@/app/models/Camp')).default;
    const userCamps = await Camp.find({ userEmail: email });

    let transferredCamps = 0;
    let errors = [];

    // Her kamp için şantiye adminini bul ve kampa aktar
    for (const camp of userCamps) {
      try {
        if (camp.site) {
          // Şantiyenin adminini bul
          const siteAdmin = await User.findOne({ 
            role: 'santiye_admin', 
            site: camp.site 
          });

          if (siteAdmin) {
            // Kampı şantiye adminine aktar
            await Camp.findByIdAndUpdate(camp._id, {
              userEmail: siteAdmin.email
            });
            transferredCamps++;
          } else {
            errors.push(`Kamp: ${camp.name} - Şantiye admini bulunamadı: ${camp.site}`);
          }
        } else {
          errors.push(`Kamp: ${camp.name} - Şantiye bilgisi yok`);
        }
      } catch (error) {
        errors.push(`Kamp: ${camp.name} - Aktarım hatası: ${error}`);
      }
    }

    // Kullanıcıyı sil
    const deletedUser = await User.findOneAndDelete({ email });
    
    return NextResponse.json({ 
      message: 'Kullanıcı silindi',
      transferredCamps,
      totalCamps: userCamps.length,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    return NextResponse.json({ error: 'Kullanıcı silinirken hata oluştu' }, { status: 500 });
  }
} 