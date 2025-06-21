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

export default mongoose.models.Camp || mongoose.model('Camp', CampSchema); 