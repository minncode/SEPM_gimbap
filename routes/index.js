const express = require('express');
const router = express.Router();
const session = require('express-session');
const bcrypt = require('bcrypt');
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
    const user = await collection.findOne({ name });

    if (user) {
        const passwordMatch = await bcrypt.compare(password, user.password);

        if (passwordMatch) {
            req.session.name = user.name;
            req.session.email = user.email;
            req.session.major = user.major;
            res.redirect('/main');
        } else {
            res.render('login', { error: 'Failed to login' });
        }
    } else {
        res.render('login', { error: 'Failed to login' });
    }
});

router.get('/register', (req, res) => {
    res.render("register")
});

router.post("/register", async (req, res) => {
    const { year, major, email, name, password } = req.body;

    try {
        // Hashing the password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Creating a new document using the Mongoose model
        const newUser = new collection({
            year,
            major,
            email,
            name,
            password: hashedPassword // Assigning the hashed password to the document
        });

        // Saving the new user to the database
        await newUser.save();

        res.render("login");
    } catch (err) {
        console.error(err);
        res.render("register", { error: 'Failed to register' });
    }
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

router.get('/course_evaluation', (req, res) => {
    res.render('course_evaluation');
});


router.get('/editprofile', (req, res) => {
    res.render('editprofile');
});

router.get('/courseSelect', (req, res) => {
    res.render('courseSelect');
});

router.get('/writeReview', (req, res) => {
    res.render('writeReview');
});

router.get('/reviewDetail', (req, res) => {
    res.render('reviewDetail');
});

router.get('/paymentMain', (req, res) => {
    res.render('paymentMain');
});

router.get('/charging', (req, res) => {
    res.render('charging');
});

router.get('/barcode', (req, res) => {
    res.render('barcode');
});

router.get('/bankManage', (req, res) => {
    res.render('bankManage');
});

router.get('/addBank', (req, res) => {
    res.render('addBank');
});

router.get('/campusMap', (req, res) => {
    res.render('campusMap');
});

router.get('/campusMapCategory', (req, res) => {
    res.render('campusMapCategory');
});

router.get('/beanlandBuilding', (req, res) => {
    res.render('beanlandBuilding');
});

router.get('/foodCourt', (req, res) => {
    res.render('foodCourt');
});

router.get('/foodPavillion', (req, res) => {
    res.render('foodPavillion');
});

router.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if(err) {
            return console.log(err);
        }
        res.redirect('/'); // 로그아웃 후 리다이렉트할 경로
    });
});

router.use(function (err, req, res, next) {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});



module.exports = router;