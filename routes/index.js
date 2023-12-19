const express = require('express');
const router = express.Router();
const session = require('express-session');
const bcrypt = require('bcrypt');
const collection = require('./mongodb');
const courseEnrollment = require('../models/courseEnrollment');

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

router.get('/timetable', async (req, res) => {
    try {
        const userEmail = req.session.email; // 현재 로그인한 유저의 이메일

        // MongoDB에서 해당 유저의 수업 시간 정보를 불러오는 쿼리
        const userCourses = await courseEnrollment.find({ email: userEmail });

        // 유저의 수업 정보를 기반으로 timetable.ejs를 렌더링
        res.render('timetable', { userCourses });
    } catch (err) {
        console.error(err);
        res.status(500).send('Internal Server Error');
    }
});


router.get('/course_list', (req, res) => {
    res.render('course_list');
});

router.post('/course_list/enroll', async (req, res) => {
    const { courseCode, activity } = req.body;
    const userEmail = req.session.email;

    try {
        const courseName = req.body.courseName;
        const lecturer = req.body.lecturer;
        const classroom = req.body.classroom;
        const time = req.body.time;
        const semester = req.body.semester;
        const credits = req.body.credits;

        if (!userEmail) {
            // 세션에 이메일 정보가 없으면 로그인 페이지로 리다이렉트 또는 에러 처리
            return res.status(401).send('Unauthorized');
        }

        const newEnrollment = new courseEnrollment({
            email: userEmail,
            courseName,
            activity,
            courseCode,
            lecturer,
            classroom,
            time,
            semester,
            credits,
        });

        await newEnrollment.save();


        res.redirect('/timetable');
    } catch (err) {
        console.error(err);
        res.status(500).send('Internal Server Error');
    }
});



router.get('/course_evaluation', (req, res) => {
    res.render('course_evaluation');
});


router.get('/editprofile', (req, res) => {
    res.render('editprofile', {
        displayname: req.session.name,
        displayemail: req.session.email,
        displaymajor: req.session.major
    });
});

router.post('/editprofile', async (req, res) => {
    const { name, email, password, major } = req.body;

    try {
        const user = await collection.findOne({ email }); // Find user by email

        if (!user) {
            return res.status(400).send('User not found');
        }

        // Update user information
        user.name = name;
        user.major = major;

        // Only update password if a new one is provided
        if (password) {
            const salt = await bcrypt.genSalt(10); // Generate a salt
            user.password = await bcrypt.hash(password, salt); // Hash the new password
        }

        await user.save(); // Save updated user information

        // Update session information
        req.session.name = user.name;
        req.session.email = user.email;
        req.session.major = user.major;

        res.redirect('/profile');
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
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