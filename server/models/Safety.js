const mongoose = require('mongoose');

const SafetySchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  // Emergency contacts
  contacts: [{
    name:    { type: String, required: true, trim: true },
    phone:   { type: String, required: true, trim: true },
    relation:{ type: String, trim: true },   // e.g. "Mother", "Friend"
    isEnabled:{ type: Boolean, default: true },
  }],

  // SOS event logs
  sosLogs: [{
    triggeredAt: { type: Date, default: Date.now },
    location: {
      lat:     { type: Number },
      lng:     { type: Number },
      address: { type: String },
    },
    contactsNotified: [{ type: String }],  // phone numbers notified
    resolvedAt:   { type: Date },
    wasFalseAlarm:{ type: Boolean, default: false },
  }],
}, { timestamps: true });

SafetySchema.index({ user: 1 });

module.exports = mongoose.model('Safety', SafetySchema);