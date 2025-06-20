import { NextResponse } from 'next/server';
import connectDB from '@/app/lib/mongodb';
import Todo from '@/app/models/Todo';

export async function GET() {
  try {
    await connectDB();
    const todos = await Todo.find({}).sort({ createdAt: -1 });
    return NextResponse.json(todos);
  } catch (error) {
    return NextResponse.json({ error: 'Todo\'lar getirilirken bir hata oluştu' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { title } = await request.json();
    await connectDB();
    const todo = await Todo.create({ title });
    return NextResponse.json(todo);
  } catch (error) {
    return NextResponse.json({ error: 'Todo oluşturulurken bir hata oluştu' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const { id, completed } = await request.json();
    await connectDB();
    const todo = await Todo.findByIdAndUpdate(id, { completed }, { new: true });
    return NextResponse.json(todo);
  } catch (error) {
    return NextResponse.json({ error: 'Todo güncellenirken bir hata oluştu' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { id } = await request.json();
    await connectDB();
    await Todo.findByIdAndDelete(id);
    return NextResponse.json({ message: 'Todo başarıyla silindi' });
  } catch (error) {
    return NextResponse.json({ error: 'Todo silinirken bir hata oluştu' }, { status: 500 });
  }
} 