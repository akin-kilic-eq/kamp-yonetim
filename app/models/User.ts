import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Email zorunludur'],
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: [true, 'Şifre zorunludur']
  },
  role: {
    type: String,
    enum: ['kurucu_admin', 'merkez_admin', 'santiye_admin', 'personel_admin', 'personel_user', 'user'],
    default: 'user',
    required: true
  },
  site: {
    type: String,
    required: false
  },
  // Şantiye admini için birden fazla şantiye atanabilmesi
  sites: [{
    type: String,
    required: false
  }],
  // Aktif şantiye seçimi için
  activeSite: {
    type: String,
    required: false
  },
  siteAccessApproved: {
    type: Boolean,
    default: false
  },
  sitePermissions: {
    type: Object,
    default: {
      canViewCamps: false,
      canEditCamps: false,
      canCreateCamps: false
    }
  },
  isApproved: {
    type: Boolean,
    default: false
  },
  camps: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Camp'
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.models.User || mongoose.model('User', UserSchema); 