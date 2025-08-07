import mongoose from 'mongoose';

const JobTitleSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Görev tanımı zorunludur'],
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  site: {
    type: String,
    required: [true, 'Şantiye bilgisi zorunludur'],
    trim: true
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

JobTitleSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

export default mongoose.models.JobTitle || mongoose.model('JobTitle', JobTitleSchema);
