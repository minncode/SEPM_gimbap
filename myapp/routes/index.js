const express = require('express');
const router = express.Router();

const ctrl = require('./home.ctrl');

/* GET home page. */
router.get('/', ctrl.output.login);
router.post('/', ctrl.process.login);

router.get('/register', ctrl.output.register);

router.get('/main', ctrl.output.main);

router.get('/profile', ctrl.output.profile);



module.exports = router;