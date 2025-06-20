import mongoose, { Schema, models, model } from 'mongoose';

const WorkerSchema = new Schema({
  name: {
    type: String,
    required: [true, 'İsim zorunludur'],
    trim: true
  },
  surname: {
    type: String,
    required: [true, 'Soyisim zorunludur'],
    trim: true
  },
  registrationNumber: {
    type: String,
    required: [true, 'Kayıt numarası zorunludur'],
    trim: true
  },
  project: {
    type: String,
    required: [true, 'Proje adı zorunludur'],
    trim: true
  },
  entryDate: {
    type: Date,
    default: Date.now
  },
  roomId: {
    type: Schema.Types.ObjectId,
    ref: 'Room'
  },
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

export default models.Worker || model('Worker', WorkerSchema); 