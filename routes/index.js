const express = require('express');
const router = express.Router();
const session = require('express-session');

const collection = require('./mongodb');

router.use(session({
    secret: 'your secret key',
    resave: false,
    saveUninitialized: true
}));

/* GET home page. */
router.get('/', (req, res) => {
    res.render("login")
});

router.post('/', async (req, res) => {
    const { name, password } = req.body;
    const Entername = await collection.findOne({ name, password });
    if (Entername) {
        req.session.name = Entername.name;
        req.session.email = Entername.email;
        req.session.major = Entername.major;
        res.redirect('/main');
    } else {
        res.render('login', { error: 'Failed to login' });
    }
});
    
router.get('/register', (req, res) => {
    res.render("register")
});

router.post("/register", async(req, res) => {

    const data = {
        year: req.body.year,
        major: req.body.major,
        email: req.body.email,
        name: req.body.name,
        password: req.body.password
    }

    await collection.insertMany(data);

    res.render("login")

});

router.get('/main', async (req, res) => {
    res.render('main', {
        displayname: req.session.name,
        displayemail: req.session.email,
        displaymajor: req.session.major
    });
});

router.get('/profile', async (req, res) => {
    res.render('profile', {
        displayname: req.session.name,
        displayemail: req.session.email,
        displaymajor: req.session.major
    });
});

router.get('/timetable', (req, res) => {
    res.render('timetable');
});

router.get('/course_list', (req, res) => {
    res.render('course_list');
});









router.use(function(err, req, res, next) {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});



module.exports = router;