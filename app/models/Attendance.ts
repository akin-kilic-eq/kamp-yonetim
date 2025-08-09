import mongoose from 'mongoose';

// Günlük puantaj kaydı şeması
// Her personel için her gün (dateKey) tek bir kayıt olacak şekilde eşsiz indeks
const AttendanceSchema = new mongoose.Schema(
  {
    site: { type: String, required: true, trim: true },
    personnel: { type: mongoose.Schema.Types.ObjectId, ref: 'Personnel', required: true },
    // Tarih alanları: timezone sorunlarını azaltmak için YYYY-MM-DD formatında ayrıca dateKey tutuyoruz
    date: { type: Date, required: true },
    dateKey: { type: String, required: true }, // YYYY-MM-DD
    status: {
      type: String,
      required: true,
      enum: [
        'GUNDUZ',
        'GECE',
        'IZINLI',
        'HASTA_RAPORLU',
        'MAZERETSIZ',
        'GOREVLI',
        'VIZE',
        'PATENT_OTURUM_BEKLIYOR',
        'HAFTA_SONU_TATILI',
        'GIRIS_CIKIS',
        'HASTA_RAPORSUZ',
        'CALISMA_KARTI_BEKLIYOR',
      ],
    },
    location: { type: String, required: false, trim: true },
    note: { type: String, required: false, trim: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

AttendanceSchema.index({ site: 1, personnel: 1, dateKey: 1 }, { unique: true });

export default mongoose.models.Attendance || mongoose.model('Attendance', AttendanceSchema);


