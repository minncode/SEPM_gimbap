const express = require('express');
const router = express.Router();
const session = require('express-session');
const bcrypt = require('bcrypt');
const collection = require('../models/user');
const CourseList = require('../models/courseList');
const CourseActivity = require('../models/courseActivity');
const CourseEnrollment = require('../models/courseEnrollment');
const PaymentBalance = require('../models/paymentBalance');
const PaymentRecord = require('../models/paymentRecord');
const Feedback = require('../models/feedback');


router.use(session({
    secret: 'your secret key',
    resave: false,
    saveUninitialized: true
}));

/* GET home page. */
router.get('/', (req, res) => {
    res.render("user/login")
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
            res.render('user/login', { error: 'Failed to login' });
        }
    } else {
        res.render('user/login', { error: 'Failed to login' });
    }
});

router.get('/register', (req, res) => {
    res.render("user/register")
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
            password: hashedPassword, // Assigning the hashed password to the document
            role: "student"
        });

        // Saving the new user to the database
        await newUser.save();

        res.render("user/login");
    } catch (err) {
        console.error(err);
        res.render("user/register", { error: 'Failed to register' });
    }
});

router.get('/main', async (req, res) => {
    res.render('user/main', {
        displayname: req.session.name,
        displayemail: req.session.email,
        displaymajor: req.session.major
    });
});

router.get('/profile', async (req, res) => {
    res.render('user/profile', {
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
        res.render('user/timetable', { userCourses });
    } catch (err) {
        console.error(err);
        res.status(500).send('Internal Server Error');
    }
});


router.get('/course_list', (req, res) => {
    res.render('user/course_list');
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
    res.render('user/course_evaluation');
});


router.get('/editprofile', (req, res) => {
    res.render('user/editprofile', {
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
    res.render('user/courseSelect');
});

router.get('/writeReview', (req, res) => {
    res.render('user/writeReview');
});

router.get('/reviewDetail', (req, res) => {
    res.render('user/reviewDetail');
});

router.get('/paymentMain', async (req, res) => {
    try {
        const userEmail = req.session.email;

        if (!userEmail) {
            return res.redirect('/');
        }


        const paymentBalance = await PaymentBalance.findOne({ email: userEmail });


        const balanceAmount = paymentBalance ? paymentBalance.balance : 0;

        const paymentRecords = await PaymentRecord.find({ email: userEmail }).sort({ paymentDate: 'desc' }).lean();

        res.render('user/paymentMain', { userEmail, balanceAmount, paymentRecords });
    } catch (err) {
        console.error(err);
        res.status(500).send('Internal Server Error');
    }
});

// charging route
router.get('/charging', (req, res) => {
    res.render('user/charging');
  });
  
  router.post('/charging', async (req, res) => {
    const { amount } = req.body;
  
    try {
      // Retrieve the current user's email from the session
      const userEmail = req.session.email;
  
      // Fetch the payment balance for the user
      let paymentBalance = await PaymentBalance.findOne({ email: userEmail });
  
      // If the balance doesn't exist, create a new one
      if (!paymentBalance) {
        paymentBalance = new PaymentBalance({ email: userEmail, balance: '0' });
        await paymentBalance.save();
      }
  
      // Get the current balance
      const currentBalance = parseFloat(paymentBalance.balance) || 0;
  
      // Get the amount to increase
      const increaseAmount = parseFloat(amount) || 0;
  
      // Calculate the new balance
      const newBalance = currentBalance + increaseAmount;
  
      // Convert the balance to a string and save
      paymentBalance.balance = newBalance.toString();
      await paymentBalance.save();
  
      // Add a record to the Payment Record
      const paymentRecord = new PaymentRecord({
        email: userEmail,
        type: 'RMIT Pay charge',
        amount: amount.toString(), // Save the button amount as a string
        remainingBalance: paymentBalance.balance,
        paymentStatus: 'Success',
        paymentDate: new Date(),
      });
  
      await paymentRecord.save();
  
      // Redirect to the payment main page
      res.redirect('/paymentMain');
    } catch (error) {
      console.error(error);
      res.status(500).send('Internal Server Error');
    }
  });

// Route to display the barcode page
router.get('/barcode', async (req, res) => {
    try {
        const userEmail = req.session.email;

        if (!userEmail) {
            return res.redirect('/');
        }

        const paymentBalance = await PaymentBalance.findOne({ email: userEmail });

        res.render('user/barcode', { userEmail, paymentBalance });
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});








router.get('/bankManage', (req, res) => {
    res.render('user/bankManage');
});

router.get('/addBank', (req, res) => {
    res.render('user/addBank');
});

router.get('/campusMap', (req, res) => {
    res.render('user/campusMap');
});

router.get('/campusMapCategory', (req, res) => {
    res.render('user/campusMapCategory');
});

router.get('/beanlandBuilding', (req, res) => {
    res.render('user/beanlandBuilding');
});

router.get('/foodCourt', (req, res) => {
    res.render('user/foodCourt');
});

router.get('/foodPavillion', (req, res) => {
    res.render('user/foodPavillion');
});

router.get('/foodPavillion', (req, res) => {
    res.render('user/foodPavillion');
});

router.get('/campusMapdetail', (req, res) => {
    res.render('user/campusMapdetail');
});

// Route to render the feedback form
router.get('/feedback', (req, res) => {
    res.render('user/feedback');
});

// Route to handle feedback submission
router.post('/submit-feedback', async (req, res) => {
    try {
        const { feedbackType, feedbackDetails } = req.body;

        // Create a new feedback document
        const newFeedback = new Feedback({
            typeOfFeedback: feedbackType,
            feedbackDetails: feedbackDetails,
        });

        // Save the feedback to the database
        const savedFeedback = await newFeedback.save();

        res.status(201).json({ success: true, feedback: savedFeedback });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
});


router.get('/deleteaccount', async (req, res) => {
    try {
        await collection.deleteOne({ email: req.session.email });

        req.session.destroy();

        res.redirect('/');
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
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
    console.error('Error in :', error);
    res.status(500).send('Something broke!');
});




module.exports = router;