"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var mongoose_1 = __importDefault(require("mongoose"));
var CampSchema = new mongoose_1.default.Schema({
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
            type: mongoose_1.default.Schema.Types.ObjectId,
            ref: 'Room'
        }],
    createdAt: {
        type: Date,
        default: Date.now
    },
    site: {
        type: String,
        enum: ['Slava 2-3', 'Slava 4'], // İleride arttırılabilir
        default: 'Slava 2-3',
        required: false
    }
});
// Performans için indeksler
CampSchema.index({ userEmail: 1 });
CampSchema.index({ 'sharedWith.email': 1 });
exports.default = mongoose_1.default.models.Camp || mongoose_1.default.model('Camp', CampSchema);
