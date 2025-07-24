import mongoose from 'mongoose';

const SiteSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Şantiye adı zorunludur'],
    unique: true,
    trim: true
  },
  description: {
    type: String,
    required: false,
    default: ''
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

// Güncelleme zamanını otomatik ayarla
SiteSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

export default mongoose.models.Site || mongoose.model('Site', SiteSchema); 