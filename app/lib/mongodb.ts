import mongoose from 'mongoose';
import User from '@/app/models/User';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error('MongoDB URI bulunamadı');
}

async function ensureFounderAdmin() {
  const founderEmail = 'kurucu_admin@antteq.com';
  const founderPassword = 'CaZa636.';
  const existing = await User.findOne({ email: founderEmail });
  if (!existing) {
    await User.create({
      email: founderEmail,
      password: founderPassword,
      role: 'kurucu_admin',
      site: 'Slava 2-3',
      isApproved: true,
      camps: []
    });
    console.log('Kurucu admin otomatik olarak eklendi.');
  } else if (existing.role !== 'kurucu_admin') {
    existing.role = 'kurucu_admin';
    await existing.save();
    console.log('Kurucu admin rolü otomatik olarak güncellendi.');
  }
}

let isConnected = false;

export default async function connectDB() {
  if (isConnected) return;

  try {
    await mongoose.connect(process.env.MONGODB_URI || '', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    } as any);
    
    isConnected = true;
    console.log('MongoDB bağlantısı başarılı!');
    await ensureFounderAdmin();
  } catch (error) {
    console.error('MongoDB bağlantı hatası:', error);
    throw error;
  }
} 