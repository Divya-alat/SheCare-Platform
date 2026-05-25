const Safety = require('../models/Safety');
const axios  = require('axios');

// ── Helper: get or create safety doc for user ────────────────
const getSafetyDoc = async (userId) => {
  let doc = await Safety.findOne({ user: userId });
  if (!doc) doc = await Safety.create({ user: userId, contacts: [], sosLogs: [] });
  return doc;
};

// ── @GET /api/safety/contacts ────────────────────────────────
exports.getContacts = async (req, res, next) => {
  try {
    const doc = await getSafetyDoc(req.user._id);
    res.json({ success: true, contacts: doc.contacts });
  } catch (err) { next(err); }
};

// ── @POST /api/safety/contacts ───────────────────────────────
exports.addContact = async (req, res, next) => {
  try {
    const { name, phone, relation } = req.body;
    if (!name || !phone) {
      return res.status(400).json({ success: false, message: 'Name and phone are required' });
    }

    const doc = await getSafetyDoc(req.user._id);
    if (doc.contacts.length >= 5) {
      return res.status(400).json({ success: false, message: 'Maximum 5 emergency contacts allowed' });
    }

    doc.contacts.push({ name, phone, relation });
    await doc.save();
    res.status(201).json({ success: true, contacts: doc.contacts });
  } catch (err) { next(err); }
};

// ── @PUT /api/safety/contacts/:contactId ─────────────────────
exports.updateContact = async (req, res, next) => {
  try {
    const { name, phone, relation, isEnabled } = req.body;
    const doc = await getSafetyDoc(req.user._id);

    const contact = doc.contacts.id(req.params.contactId);
    if (!contact) return res.status(404).json({ success: false, message: 'Contact not found' });

    if (name      !== undefined) contact.name      = name;
    if (phone     !== undefined) contact.phone     = phone;
    if (relation  !== undefined) contact.relation  = relation;
    if (isEnabled !== undefined) contact.isEnabled = isEnabled;

    await doc.save();
    res.json({ success: true, contacts: doc.contacts });
  } catch (err) { next(err); }
};

// ── @DELETE /api/safety/contacts/:contactId ──────────────────
exports.deleteContact = async (req, res, next) => {
  try {
    const doc = await getSafetyDoc(req.user._id);
    doc.contacts = doc.contacts.filter(c => c._id.toString() !== req.params.contactId);
    await doc.save();
    res.json({ success: true, contacts: doc.contacts });
  } catch (err) { next(err); }
};

// ── @POST /api/safety/sos ────────────────────────────────────
// Triggered when user activates SOS
exports.triggerSOS = async (req, res, next) => {
  try {
    const { lat, lng, address } = req.body;
    const doc = await getSafetyDoc(req.user._id);

    const enabledContacts = doc.contacts.filter(c => c.isEnabled);
    if (enabledContacts.length === 0) {
      return res.status(400).json({ success: false, message: 'No enabled emergency contacts found' });
    }

    // ── In production: integrate SMS gateway (Twilio / MSG91) ──
    // For now we log and simulate
    const contactsNotified = enabledContacts.map(c => c.phone);
    console.log(`🚨 SOS triggered by ${req.user.name} at ${address || `${lat},${lng}`}`);
    console.log(`📱 Notifying: ${contactsNotified.join(', ')}`);

    // Log the SOS event
    doc.sosLogs.push({
      triggeredAt: new Date(),
      location: { lat, lng, address },
      contactsNotified,
    });
    await doc.save();

    res.json({
      success: true,
      message: `SOS alert sent to ${enabledContacts.length} contact(s)`,
      contactsNotified: enabledContacts.map(c => ({ name: c.name, phone: c.phone })),
    });
  } catch (err) { next(err); }
};

// ── @PUT /api/safety/sos/:logId/resolve ──────────────────────
exports.resolveSOS = async (req, res, next) => {
  try {
    const { wasFalseAlarm } = req.body;
    const doc = await getSafetyDoc(req.user._id);

    const log = doc.sosLogs.id(req.params.logId);
    if (!log) return res.status(404).json({ success: false, message: 'SOS log not found' });

    log.resolvedAt    = new Date();
    log.wasFalseAlarm = wasFalseAlarm || false;
    await doc.save();

    res.json({ success: true, message: 'SOS resolved' });
  } catch (err) { next(err); }
};

// ── @GET /api/safety/sos-logs ────────────────────────────────
exports.getSOSLogs = async (req, res, next) => {
  try {
    const doc = await getSafetyDoc(req.user._id);
    const logs = doc.sosLogs.sort((a, b) => b.triggeredAt - a.triggeredAt).slice(0, 20);
    res.json({ success: true, logs });
  } catch (err) { next(err); }
};