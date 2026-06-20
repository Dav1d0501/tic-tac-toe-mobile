const mongoose = require('mongoose');

const userSchema = mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: false, // חייב להיות false כדי לאפשר התחברות עם גוגל
  },
  googleId: {
    type: String, // שדה לזיהוי משתמשי גוגל
  },
  wins: {
    type: Number,
    default: 0
  },
  losses: {
    type: Number,
    default: 0
  },
  friends: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  isOnline: {
    type: Boolean,
    default: false // ברירת מחדל: לא מחובר
  }
}, {
  timestamps: true
});

const User = mongoose.model('User', userSchema);

module.exports = User;
