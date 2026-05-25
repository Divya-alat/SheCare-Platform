const express = require('express');
const router  = express.Router();
const {
  getContacts, addContact, updateContact, deleteContact,
  triggerSOS, resolveSOS, getSOSLogs,
} = require('../controllers/safetyController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.get   ('/contacts',              getContacts);
router.post  ('/contacts',              addContact);
router.put   ('/contacts/:contactId',   updateContact);
router.delete('/contacts/:contactId',   deleteContact);

router.post  ('/sos',                   triggerSOS);
router.put   ('/sos/:logId/resolve',    resolveSOS);
router.get   ('/sos-logs',              getSOSLogs);

module.exports = router;