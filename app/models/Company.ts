import mongoose from 'mongoose';

const CompanySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Şirket adı zorunludur'],
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

CompanySchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

export default mongoose.models.Company || mongoose.model('Company', CompanySchema);
