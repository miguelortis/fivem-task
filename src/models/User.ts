import mongoose, { Schema, models } from 'mongoose';

const UserSchema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { 
      type: String, 
      enum: ['admin', 'user'], 
      default: 'user' 
    },
    status: { 
      type: String, 
      enum: ['pending', 'approved'], 
      default: 'pending' // Nadie entra al sistema hasta que un admin lo apruebe
    },
  },
  { timestamps: true }
);

const User = models.User || mongoose.model('User', UserSchema);
export default User;