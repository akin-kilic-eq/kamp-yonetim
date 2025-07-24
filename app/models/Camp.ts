import mongoose from 'mongoose';

const CampSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Kamp adı zorunludur'],
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  userEmail: {
    type: String,
    required: [true, 'Kullanıcı emaili zorunludur']
  },
  site: {
    type: String,
    trim: true
  },
  isPublic: {
    type: Boolean,
    default: false
  },
  sharedWithSites: [{
    type: String,
    trim: true
  }],
  sharedWith: [{
    email: { type: String, required: true },
    permission: { type: String, enum: ['read', 'write'], required: true }
  }],
  shareCodes: {
    read: { type: String, unique: true, sparse: true },
    write: { type: String, unique: true, sparse: true }
  },
  rooms: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room'
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Performans için indeksler
CampSchema.index({ userEmail: 1 });
CampSchema.index({ 'sharedWith.email': 1 });

export default mongoose.models.Camp || mongoose.model('Camp', CampSchema); 