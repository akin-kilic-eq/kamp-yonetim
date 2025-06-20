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
    type: String
  }],
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