import mongoose from 'mongoose';

const PersonnelSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: [true, 'İsim zorunludur'],
    trim: true
  },
  lastName: {
    type: String,
    required: [true, 'Soyisim zorunludur'],
    trim: true
  },
  employeeId: {
    type: String,
    required: [true, 'Sicil numarası zorunludur'],
    trim: true
  },
  passportNumber: {
    type: String,
    required: [true, 'Pasaport numarası zorunludur'],
    trim: true
  },
  country: {
    type: String,
    required: [true, 'Ülke zorunludur'],
    trim: true
  },
  hireDate: {
    type: Date,
    required: [true, 'İşe giriş tarihi zorunludur']
  },
  jobTitle: {
    type: String,
    required: [true, 'Görev tanımı zorunludur'],
    trim: true
  },
  company: {
    type: String,
    required: [true, 'Şirket bilgisi zorunludur'],
    trim: true
  },
  site: {
    type: String,
    required: [true, 'Şantiye bilgisi zorunludur'],
    trim: true
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'terminated'],
    default: 'active'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Güncelleme tarihini otomatik olarak güncelle
PersonnelSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Şantiye bazında composite unique index'ler
PersonnelSchema.index({ site: 1, employeeId: 1 }, { unique: true });
PersonnelSchema.index({ site: 1, passportNumber: 1 }, { unique: true });

export default mongoose.models.Personnel || mongoose.model('Personnel', PersonnelSchema);
