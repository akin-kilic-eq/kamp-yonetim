import Personnel from '@/app/models/Personnel';
import { NextResponse } from 'next/server';
import connectDB from '@/app/lib/mongodb';

// Tek bir personeli getir
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    await connectDB();

    const personnel = await Personnel.findById(id).populate('createdBy', 'email');
    if (!personnel) {
      return NextResponse.json({ error: 'Personel bulunamadı' }, { status: 404 });
    }

    return NextResponse.json(personnel);
  } catch (error) {
    console.error('Personel getirme hatası:', error);
    return NextResponse.json(
      { error: 'Personel getirilirken hata oluştu' },
      { status: 500 }
    );
  }
}

// Personel bilgilerini güncelle
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    await connectDB();
    
    const body = await request.json();

    
    const {
      firstName,
      lastName,
      employeeId,
      passportNumber,
      country,
      hireDate,
      jobTitle,
      company,
      status
    } = body;
    
    // Personel var mı kontrol et
    const existingPersonnel = await Personnel.findById(id);
    if (!existingPersonnel) {
      return NextResponse.json({ error: 'Personel bulunamadı' }, { status: 404 });
    }
    
    // Sicil numarası ve pasaport numarası benzersizlik kontrolü (kendisi hariç, şantiye bazında)
    if (employeeId || passportNumber) {
      const duplicateCheck = await Personnel.findOne({
        _id: { $ne: id },
        site: existingPersonnel.site, // Aynı şantiye içinde kontrol
        $or: [
          ...(employeeId ? [{ employeeId }] : []),
          ...(passportNumber ? [{ passportNumber }] : [])
        ]
      });
      
      if (duplicateCheck) {
        return NextResponse.json(
          { error: 'Bu sicil numarası veya pasaport numarası bu şantiyede zaten kullanılıyor' },
          { status: 400 }
        );
      }
    }
    
    // Güncelleme verilerini hazırla
    const updateData: any = {};
    if (firstName) updateData.firstName = firstName;
    if (lastName) updateData.lastName = lastName;
    if (employeeId) updateData.employeeId = employeeId;
    if (passportNumber) updateData.passportNumber = passportNumber;
    if (country) updateData.country = country;
    if (hireDate) updateData.hireDate = new Date(hireDate);
    if (jobTitle) updateData.jobTitle = jobTitle;
    if (company) updateData.company = company;
    if (status) updateData.status = status;
    

    
    const updatedPersonnel = await Personnel.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).populate('createdBy', 'email');
    

    
    if (!updatedPersonnel) {
      return NextResponse.json({ error: 'Personel güncellenirken hata oluştu' }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      message: 'Personel başarıyla güncellendi',
      personnel: updatedPersonnel
    });
  } catch (error) {
    console.error('Personel güncelleme hatası:', error);
    return NextResponse.json(
      { error: 'Personel güncellenirken hata oluştu' },
      { status: 500 }
    );
  }
}

// Personel sil
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    await connectDB();

    const personnel = await Personnel.findByIdAndDelete(id);
    if (!personnel) {
      return NextResponse.json({ error: 'Personel bulunamadı' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Personel başarıyla silindi' });
  } catch (error) {
    console.error('Personel silme hatası:', error);
    return NextResponse.json(
      { error: 'Personel silinirken hata oluştu' },
      { status: 500 }
    );
  }
}
