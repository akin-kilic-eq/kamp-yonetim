import Camp from '@/app/models/Camp';
import User from '@/app/models/User';
import { NextResponse } from 'next/server';
import connectDB from '@/app/lib/mongodb';

// Şantiye admini yetki kontrolü için yardımcı fonksiyon
async function checkCampPermission(campId: string, userEmail: string): Promise<boolean> {
  const camp = await Camp.findById(campId);
  if (!camp) return false;

  // Kamp sahibi mi?
  if (camp.userEmail === userEmail) {
    return true;
  }

    // Kurucu admin ve merkez admin için tam yetki
  const user = await User.findOne({ email: userEmail });
  if (user && (user.role === 'kurucu_admin' || user.role === 'merkez_admin')) {
    return true;
  }

  // Şantiye admini için tam yetki - tüm kamplara erişebilir
  if (user && user.role === 'santiye_admin') {
    return true;
  }

  // User rolündeki kullanıcılar için şantiye erişim yetkisi ve düzenleme izni kontrolü
  if (user && user.role === 'user') {
    if (camp.userEmail === userEmail) {
      return true; // Kendi kampında tam yetki
    } else if (user.siteAccessApproved && user.sitePermissions?.canEditCamps && user.site) {
      const campOwner = await User.findOne({ email: camp.userEmail });
      if (campOwner && campOwner.site === user.site) {
        return true; // Şantiye erişim yetkisi ve düzenleme izni varsa
      }
    }
    return false; // Diğer durumlarda sadece görüntüleme
  }

  return false;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userEmail = searchParams.get('userEmail');
    const role = (searchParams.get('role') || '').toLowerCase();
    const activeSite = searchParams.get('activeSite');



    await connectDB();

    // Kurucu admin ve merkez admin için tüm kampları göster
    let query = {};
    if (role === 'kurucu_admin' || role === 'merkez_admin' || userEmail === 'kurucu_admin@antteq.com') {
      query = {}; // Tüm kampları getir

    } else if (role === 'santiye_admin') {
      // Şantiye admini için aktif şantiyesindeki kampları getir
      const adminUser = await User.findOne({ email: userEmail });
      
      // Frontend'den gelen activeSite parametresini öncelikli olarak kullan
      const currentActiveSite = activeSite || adminUser?.activeSite || adminUser?.site;
      
      if (adminUser && currentActiveSite) {
        
        // Aktif şantiyedeki kampları getir
        // 1. Aktif şantiyede oluşturulan kamplar (creatorSite veya site alanına göre)
        // 2. Kullanıcının kendi oluşturduğu kamplar (eğer aktif şantiyede oluşturulmuşsa)
        // 3. Kullanıcıya paylaşılan kamplar
        query = {
          $or: [
            { creatorSite: currentActiveSite },
            { site: currentActiveSite },
            { 
              $and: [
                { userEmail: userEmail },
                { 
                  $or: [
                    { creatorSite: currentActiveSite },
                    { site: currentActiveSite }
                  ]
                }
              ]
            },
            { "sharedWith.email": userEmail }
          ]
        };
        

      } else {

        // Şantiye bilgisi yoksa sadece kendi kamplarını göster
        query = {
          $or: [
            { userEmail },
            { "sharedWith.email": userEmail }
          ]
        };
      }
    } else if (role === 'user') {
      // User rolündeki kullanıcılar için şantiye erişim yetkisi ve kamp izinlerini kontrol et
      const user = await User.findOne({ email: userEmail });
      

      
      // Şantiye erişim yetkisi kontrolü
      if (!user || !user.siteAccessApproved) {
        // Şantiye erişim yetkisi yoksa sadece kendi kamplarını göster
        query = {
          $or: [
            { userEmail },
            { "sharedWith.email": userEmail }
          ]
        };
      } else if (user.site) {
        // Şantiye erişim yetkisi varsa ve şantiye bilgisi varsa
        if (user.sitePermissions?.canViewCamps) {
          // Kamp görüntüleme izni varsa kullanıcı sitesindeki kampları göster.
          // Eski kayıtlarda site/creatorSite alanı olmayan kamplar için, sadece alanı olmayanları
          // aynı sitedeki kullanıcıların e-postasına göre dahil et.
          const siteUsers = await User.find({ site: user.site });
          const siteUserEmails = siteUsers.map(u => u.email);

          query = {
            $or: [
              // Kampın kendi site bilgisinden eşleşme
              { site: user.site },
              { creatorSite: user.site },
              // Geriye dönük veriler: site/creatorSite yoksa ve kamp sahibi aynı sitedense
              {
                $and: [
                  { userEmail: { $in: siteUserEmails } },
                  {
                    $and: [
                      { $or: [ { site: { $exists: false } }, { site: null }, { site: '' } ] },
                      { $or: [ { creatorSite: { $exists: false } }, { creatorSite: null }, { creatorSite: '' } ] }
                    ]
                  }
                ]
              },
              // Kullanıcıya paylaşılan kamplar
              { "sharedWith.email": userEmail },
              // Kullanıcının kendi kampları
              { userEmail }
            ]
          };
        } else {
          // Kamp görüntüleme izni yoksa sadece kendi kamplarını göster
          query = {
            $or: [
              { userEmail },
              { "sharedWith.email": userEmail }
            ]
          };
        }
      } else {
        // Şantiye bilgisi yoksa sadece kendi kamplarını göster
        query = {
          $or: [
            { userEmail },
            { "sharedWith.email": userEmail }
          ]
        };
      }
    } else {
      // Diğer roller için sadece kendi kamplarını göster

      query = {
        $or: [
          { userEmail },
          { "sharedWith.email": userEmail }
        ]
      };
    }

    const camps = await Camp.find(query);
    

    
    // Kamp oluşturan kişilerin şantiye bilgilerini al
    const campCreators = [...new Set(camps.map(camp => camp.userEmail))];
    const users = await User.find({ email: { $in: campCreators } });
    const userSiteMap = users.reduce((map, user) => {
      map[user.email] = user.site || 'Şantiye Belirtilmemiş';
      return map;
    }, {} as Record<string, string>);

    // Kamplara şantiye bilgisini ekle
    const campsWithSites = camps.map(camp => ({
      ...camp.toObject(),
      // Kampın kendi creatorSite alanı varsa onu kullan, yoksa kullanıcının site bilgisini kullan
      creatorSite: camp.creatorSite || userSiteMap[camp.userEmail] || 'Şantiye Belirtilmemiş'
    }));
    


    return NextResponse.json(campsWithSites);
  } catch (error) {
    return NextResponse.json(
      { error: 'Kamplar getirilirken bir hata oluştu' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { name, description, userEmail, currentSite } = await request.json();
    


    await connectDB();

    // Kamp oluşturan kullanıcının site bilgisini al
    const user = await User.findOne({ email: userEmail });

    
    let userSite = user?.site || 'Şantiye Belirtilmemiş';

    // Şantiye admini için aktif şantiyeyi kullan
    if (user?.role === 'santiye_admin' && currentSite) {
      userSite = currentSite;
    }

    const campData = {
      name,
      description,
      userEmail,
      site: userSite, // Kullanıcının site bilgisini kampa kaydet
      creatorSite: userSite, // Şantiye admini için ek alan
      sharedWith: [],
      rooms: []
    };
    
    const camp = await Camp.create(campData);
    return NextResponse.json(camp);
  } catch (error) {
    return NextResponse.json(
      { error: 'Kamp oluşturulurken bir hata oluştu' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const { _id, name, description, sharedWith, userEmail, isPublic, sharedWithSites } = await request.json();

    if (!userEmail) {
      return NextResponse.json({ error: 'Yetkilendirme gerekli' }, { status: 401 });
    }

    await connectDB();

    // Yetki kontrolü
    const hasPermission = await checkCampPermission(_id, userEmail);
    if (!hasPermission) {
      return NextResponse.json({ error: 'Bu işlem için yetkiniz yok' }, { status: 403 });
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (sharedWith !== undefined) updateData.sharedWith = sharedWith;
    if (isPublic !== undefined) updateData.isPublic = isPublic;
    if (sharedWithSites !== undefined) updateData.sharedWithSites = sharedWithSites;

    const camp = await Camp.findByIdAndUpdate(
      _id,
      updateData,
      { new: true }
    );

    if (!camp) {
      return NextResponse.json({ error: 'Kamp bulunamadı' }, { status: 404 });
    }

    return NextResponse.json(camp);
  } catch (error) {
    return NextResponse.json(
      { error: 'Kamp güncellenirken bir hata oluştu' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { id, userEmail } = await request.json();

    if (!userEmail) {
      return NextResponse.json({ error: 'Yetkilendirme gerekli' }, { status: 401 });
    }

    await connectDB();

    // Yetki kontrolü
    const hasPermission = await checkCampPermission(id, userEmail);
    if (!hasPermission) {
      return NextResponse.json({ error: 'Bu işlem için yetkiniz yok' }, { status: 403 });
    }

    await Camp.findByIdAndDelete(id);

    return NextResponse.json({ message: 'Kamp başarıyla silindi' });
  } catch (error) {
    return NextResponse.json(
      { error: 'Kamp silinirken bir hata oluştu' },
      { status: 500 }
    );
  }
} 