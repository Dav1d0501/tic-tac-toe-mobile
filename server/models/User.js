const mongoose = require('mongoose');

// User account schema
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
    required: false, // Optional so Google users can sign in without a password
  },
  googleId: {
    type: String, // Identifies Google users
  },
  avatar: {
    type: String,
    default: ""
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
    default: false // Defaults to offline
  }
}, {
  timestamps: true
});

const User = mongoose.model('User', userSchema);

module.exports = User;
