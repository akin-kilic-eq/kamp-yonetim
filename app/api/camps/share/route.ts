import Camp from '@/app/models/Camp';
import { NextResponse } from 'next/server';
import connectDB from '@/app/lib/mongodb';
import { randomBytes } from 'crypto';

// Benzersiz ve kısa kod üretme fonksiyonu
const generateUniqueCode = async (): Promise<string> => {
  let code: string;
  let isUnique = false;
  
  while (!isUnique) {
    // 6 byte'lık rastgele veri üretip bunu 8 karakterlik hex string'e çeviriyoruz
    code = randomBytes(4).toString('hex').toUpperCase();
    
    // Kodun veritabanında zaten var olup olmadığını kontrol et
    const existingCamp = await Camp.findOne({
      $or: [
        { 'shareCodes.read': code },
        { 'shareCodes.write': code }
      ]
    });
    
    if (!existingCamp) {
      isUnique = true;
    }
  }
  return code!;
};

export async function POST(request: Request) {
  try {
    const { campId } = await request.json();

    if (!campId) {
      return NextResponse.json({ error: 'Kamp kimliği gerekli' }, { status: 400 });
    }

    await connectDB();

    const readCode = await generateUniqueCode();
    const writeCode = await generateUniqueCode();
    
    const updatedCamp = await Camp.findByIdAndUpdate(
      campId,
      {
        $set: {
          'shareCodes.read': readCode,
          'shareCodes.write': writeCode,
        },
      },
      { new: true }
    );

    if (!updatedCamp) {
      return NextResponse.json({ error: 'Kamp bulunamadı' }, { status: 404 });
    }

    return NextResponse.json({ read: readCode, write: writeCode });
  } catch (error) {
    console.error("Share code generation error:", error);
    return NextResponse.json(
      { error: 'Paylaşım kodları üretilirken bir hata oluştu' },
      { status: 500 }
    );
  }
} 