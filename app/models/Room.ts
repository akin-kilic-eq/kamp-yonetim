import mongoose, { Schema, models, model } from 'mongoose';

const RoomSchema = new Schema({
  number: {
    type: String,
    required: [true, 'Oda numarası zorunludur'],
    trim: true
  },
  capacity: {
    type: Number,
    required: [true, 'Kapasite zorunludur'],
    min: [1, 'Kapasite en az 1 olmalıdır']
  },
  company: {
    type: String,
    required: [true, 'Şirket adı zorunludur'],
    trim: true
  },
  project: {
    type: String,
    required: [true, 'Proje adı zorunludur'],
    trim: true
  },
  availableBeds: {
    type: Number,
    required: [true, 'Boş yatak sayısı zorunludur']
  },
  workers: [{
    type: String,
    trim: true
  }],
  campId: {
    type: Schema.Types.ObjectId,
    ref: 'Camp',
    required: [true, 'Kamp ID zorunludur']
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Performans için indeksler
RoomSchema.index({ campId: 1 });
RoomSchema.index({ campId: 1, number: 1 }, { unique: true });
RoomSchema.index({ project: 1 });

export default models.Room || model('Room', RoomSchema); 