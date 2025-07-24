"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var mongoose_1 = __importDefault(require("mongoose"));
var UserSchema = new mongoose_1.default.Schema({
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
        enum: ['kurucu_admin', 'merkez_admin', 'santiye_admin', 'user'],
        default: 'user',
        required: true
    },
    site: {
        type: String,
        enum: ['Slava 2-3', 'Slava 4'], // İleride arttırılabilir
        required: false
    },
    isApproved: {
        type: Boolean,
        default: false
    },
    camps: [{
            type: mongoose_1.default.Schema.Types.ObjectId,
            ref: 'Camp'
        }],
    createdAt: {
        type: Date,
        default: Date.now
    }
});
exports.default = mongoose_1.default.models.User || mongoose_1.default.model('User', UserSchema);
