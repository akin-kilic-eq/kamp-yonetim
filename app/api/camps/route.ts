import Camp from '@/app/models/Camp';
import { NextResponse } from 'next/server';
import connectDB from '@/app/lib/mongodb';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userEmail = searchParams.get('userEmail');

    await connectDB();

    const query = {
      $or: [
        { userEmail },
        { sharedWith: userEmail }
      ]
    };

    const camps = await Camp.find(query);
    return NextResponse.json(camps);
  } catch (error) {
    return NextResponse.json(
      { error: 'Kamplar getirilirken bir hata oluştu' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { name, description, userEmail } = await request.json();

    await connectDB();

    const camp = await Camp.create({
      name,
      description,
      userEmail,
      sharedWith: [],
      rooms: []
    });

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
    const { id, name, description, sharedWith } = await request.json();

    await connectDB();

    const camp = await Camp.findByIdAndUpdate(
      id,
      { name, description, sharedWith },
      { new: true }
    );

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
    const { id } = await request.json();

    await connectDB();

    await Camp.findByIdAndDelete(id);

    return NextResponse.json({ message: 'Kamp başarıyla silindi' });
  } catch (error) {
    return NextResponse.json(
      { error: 'Kamp silinirken bir hata oluştu' },
      { status: 500 }
    );
  }
} 