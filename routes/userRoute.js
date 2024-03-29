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
const CourseHistory = require('../models/courseHistory');
const CourseEnrollmentHistory = require('../models/courseEnrollmentHistory');
const CourseEvaluation = require('../models/courseEvaluation');
const CampusMap = require('../models/campusMap');
const QRCode = require('qrcode');
const path = require('path');
const fs = require('fs');
const upload = require('../middleware/uploadImages');
const {displayID} = require('../middleware/studentCard');
const {checkUser} = require('../middleware/authentication');


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
    try {
        let { email, password } = req.body;
        console.log('Before:', email);
        email += '@rmit.edu.vn';
        console.log('After:', email);
        const user = await collection.findOne({ email });

        if (user) {
            const passwordMatch = await bcrypt.compare(password, user.password);

            if (passwordMatch) {
                req.session.name = user.name;
                req.session.email = user.email;
                req.session.major = user.major;
                req.session.role = user.role;
                req.session.image = user.image;
                role = req.session.role;
                image = req.session.image;
                userName = req.session.name;
                if (role === 'admin') {
                    res.redirect('/admin/');
                } else {
                    res.redirect('/main');
                }
            } else {
                res.render('user/login', { error: 'Incorrect password' });
            }
        } else {
            res.render('user/login', { error: 'Email not found' });
        }
    } catch (error) {
        console.error(error);
        res.render('user/login', { error: 'Server error' });
    }
});

router.get('/register', (req, res) => {
    res.render("user/register")
});

router.post("/register", upload.single('image'), async (req, res) => {
    const { year, major, name, password } = req.body;
    const email = req.body.email + '@rmit.edu.vn';

    try {
        const existingUser = await collection.findOne({ email: email });
        if (existingUser) {
            // User already exists, render register page with an error
            return res.status(400).send('This email is already in use');
        }


        // Hashing the password
        const hashedPassword = await bcrypt.hash(password, 10);

        
        // Creating a new document using the Mongoose model
        const newUser = new collection({
            year,
            major,
            email,
            name,
            password: hashedPassword, // Assigning the hashed password to the document
            role: "student",
            image: req.file ? '/images/' + req.file.filename : '/images/studentProfile.png',
        });

        // Saving the new user to the database
        await newUser.save();

        // Creating a new PaymentBalance document for the new user
        const newPaymentBalance = new PaymentBalance({
            email: email,
            balance: 0 // Initialize the balance to 0
        });

        // Saving the new PaymentBalance document
        await newPaymentBalance.save();

        res.render("user/login");
    } catch (err) {
        console.error(err);
        res.render("user/register", { error: 'Failed to register' });
    }
});

router.get('/main', checkUser, displayID, async (req, res) => {
    const userEmail = req.session.email;
    try {
        const qrUrl = await QRCode.toDataURL(userEmail+"@rmit.edu.vn");
        res.render('user/main', {
            displayname: req.session.name,
            displayemail: req.session.email,
            displaymajor: req.session.major,
            // displayimage: req.session.image,
            qrUrl: qrUrl
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to generate QR code' });
    }
});


router.get('/profile', checkUser, displayID, async (req, res) => {
    const currentUser = req.session.email;

    
    const userInfo = await collection.findOne({ email: currentUser });

    res.render('user/profile', {
        displayname: userInfo.name,       
        displayemail: userInfo.email,
        displaymajor: userInfo.major,
        // displayimage: userInfo.image,
        userRole: userInfo.role           
    });
});


router.get('/timetable', checkUser, displayID, async (req, res, next) => {

    try {
        const userEmail = req.session.email;
        const enrollments = await CourseEnrollment.find({ email: userEmail });
        let timetableData = [];

        for (const enrollment of enrollments) {
            const activities = await CourseActivity.find({ 
                courseID: enrollment.courseID, 
                activity: enrollment.activity 
            });

            for (const activity of activities) {
                const courseInfo = await CourseList.findOne({ courseID: activity.courseID });

                timetableData.push({
                    ...activity.toObject(),
                    courseName: courseInfo.courseName,
                    courseCode: courseInfo.courseCode,
                    semester: courseInfo.semester,
                    credits: courseInfo.credits
                });
            }
        }

        console.log(timetableData); // 데이터 로그 출력
        res.render('user/timetable', { timetableData });
    } catch (error) {
        next(error);
    }
});



router.get('/course_list', checkUser, (req, res) => {
    res.render('user/course_list');
});

router.post('/course_list/enroll', checkUser, async (req, res) => {
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



// Display Course Evaluation Page with Search Results
router.get('/course_evaluation', checkUser, displayID, async (req, res) => {
    try {
        let query = req.query.q; // Get the search query from the URL
        let courseHistoryList = await CourseHistory.find(query ? {
            $or: [
                { courseName: { $regex: new RegExp(query, 'i') } },
                { lecturer: { $regex: new RegExp(query, 'i') } }
            ]
        } : {});

        // 각 과목별 평균 별점 계산
        for (let course of courseHistoryList) {
            const evaluations = await CourseEvaluation.find({ courseID: course.courseID });
            let totalStarRating = 0;
            evaluations.forEach(e => totalStarRating += e.starRating);
            course.averageStarRating = evaluations.length > 0 ? totalStarRating / evaluations.length : null;
        }

        res.render('user/course_evaluation', { courseHistoryList, searchQuery: query });
    } catch (err) {
        console.error(err);
        res.status(500).send('Internal Server Error');
    }
});



router.get('/editprofile', checkUser, (req, res) => {
    res.render('user/editprofile', {
        displayname: req.session.name,
        displayemail: req.session.email,
        displaymajor: req.session.major,
        // displayimage: req.session.image
    });
});

router.post('/editprofile', checkUser, upload.single('image'), async (req, res) => {
    const { name, email, password, major } = req.body;

    try {
        const user = await collection.findOne({ email }); // Find user by email

        if (!user) {
            return res.status(400).send('User not found');
        }

        // Update user information
        user.name = name;
        user.major = major;

        if (req.file) {
            if (user.image && user.image !== '/images/studentProfile.png') {
                const oldImagePath = path.join(__dirname, '../public', user.image);
                if (fs.existsSync(oldImagePath)) {
                    fs.unlinkSync(oldImagePath);
                }
            }
            user.image = '/images/' + req.file.filename;
        }

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
        req.session.image = user.image;
        image = req.session.image;
        userName = req.session.name;

        res.redirect('/profile');
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

router.get('/courseSelect', checkUser, displayID, async (req, res) => {
    try {
        const currentUser = req.session.email;

        const enrollmentHistoryList = await CourseEnrollmentHistory.find({ email: currentUser });
        const courseEvaluationList = await CourseEvaluation.find({ email: currentUser });

        const courseItems = await Promise.all(enrollmentHistoryList.map(async (enrollment) => {
            const courseInHistory = await CourseHistory.findOne({ courseID: enrollment.courseID });
            if (courseInHistory) {
                const evaluation = courseEvaluationList.find(e => e.courseID === enrollment.courseID);
                return {
                    courseID: courseInHistory.courseID,
                    courseName: courseInHistory.courseName,
                    lecturer: courseInHistory.lecturer,
                    starRating: evaluation ? evaluation.starRating : null,
                    hasReviewed: !!evaluation
                };
            }
        }));

        res.render('user/courseSelect', { courseItems });
    } catch (err) {
        console.error(err);
        res.status(500).send('Internal Server Error');
    }
});





router.get('/writeReview/:courseID', checkUser, displayID, async (req, res) => {
    try {
        const userEmail = req.session.email;
        const courseID = req.params.courseID;

        const course = await CourseHistory.findOne({ courseID: courseID });
        if (!course) {
            return res.status(404).send('Course not found');
        }

        res.render('user/writeReview', { course, userEmail });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('Internal Server Error');
    }
});

//api to automatically fetch form data by courseID
router.get('/courseDetails/:courseID', checkUser, async (req, res) => {
    try {
        const courseID = req.params.courseID;
        const courseDetails = await CourseHistory.findOne({ courseID: courseID });
        if(courseDetails) {
            res.json({ courseName: courseDetails.courseName, lecturer: courseDetails.lecturer });
        } else {
            res.status(404).send('Course details not found');
        }
    } catch (error) {
        console.error('Error fetching course details:', error);
        res.status(500).send('Internal Server Error');
    }
});



router.post('/writeReview', checkUser, async (req, res) => {
    try {
        const { courseID, starRating, assignmentsCount, examsCount, groupProjectsCount, difficulty, textFeedback } = req.body;
        const userEmail = req.session.email;


        // delete existing review if same courseID, email evaluation exists
        await CourseEvaluation.findOneAndDelete({ courseID, email: userEmail });

        // CourseEnrollmentHistory에서 enrollmentSemester를 조회
        const enrollmentRecord = await CourseEnrollmentHistory.findOne({ courseID, email: userEmail });
        const enrollmentSemester = enrollmentRecord ? enrollmentRecord.enrollmentSemester : 'Unknown';

        const newEvaluation = new CourseEvaluation({
            courseID,
            email: userEmail,
            status: 'Success', // 상태를 'Success'로 고정
            enrollmentSemester,
            starRating,
            assignmentsCount,
            examsCount,
            groupProjectsCount,
            difficulty,
            textFeedback,
        });

        await newEvaluation.save();
        res.redirect('/courseSelect');
    } catch (error) {
        console.error('Error on writeReview POST:', error);
        res.status(500).send('Internal Server Error');
    }
});


router.get('/reviewDetail', checkUser, (req, res) => {
    res.render('user/reviewDetail');
});

router.get('/reviewDetail/:courseID', checkUser, async (req, res) => {
    try {
        const courseID = req.params.courseID;
        const course = await CourseHistory.findOne({ courseID: courseID });
        const evaluations = await CourseEvaluation.find({ courseID: courseID });

        if (!course) {
            return res.status(404).send('Course not found');
        }

        // 평균 계산 로직
        let totalStarRating = 0, totalAssignmentsCount = 0, totalExamsCount = 0, totalGroupProjectsCount = 0, totalDifficulty = 0;
        evaluations.forEach(eval => {
            totalStarRating += eval.starRating;
            totalAssignmentsCount += eval.assignmentsCount;
            totalExamsCount += eval.examsCount;
            totalGroupProjectsCount += eval.groupProjectsCount;
            totalDifficulty += eval.difficulty;
        });

        const average = evaluations.length > 0 ? {
            starRating: totalStarRating / evaluations.length,
            assignmentsCount: totalAssignmentsCount / evaluations.length,
            examsCount: totalExamsCount / evaluations.length,
            groupProjectsCount: totalGroupProjectsCount / evaluations.length,
            difficulty: totalDifficulty / evaluations.length
        } : {};

        res.render('user/reviewDetail', { course, evaluations, average });
    } catch (error) {
        console.error('Error fetching course details:', error);
        res.status(500).send('Internal Server Error');
    }
});


router.get('/paymentMain', displayID, checkUser, async (req, res) => {
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

router.get('/charging', checkUser, (req, res) => {
    res.render('user/charging');
  });
  
  router.post('/charging', checkUser, async (req, res) => {
    const { amount } = req.body;
  
    try {
      const userEmail = req.session.email;
      let paymentBalance = await PaymentBalance.findOne({ email: userEmail });
  
      if (!paymentBalance) {
        paymentBalance = new PaymentBalance({ email: userEmail, balance: '0' });
        await paymentBalance.save();
      }
  
      const currentBalance = parseFloat(paymentBalance.balance) || 0;
      const increaseAmount = parseFloat(amount) || 0;
      const newBalance = currentBalance + increaseAmount;
  
      paymentBalance.balance = newBalance.toString();
      await paymentBalance.save();
  
      const paymentRecord = new PaymentRecord({
        email: userEmail,
        type: 'RMIT Pay charge',
        amount: amount.toString(),
        remainingBalance: paymentBalance.balance,
        paymentStatus: 'Success',
        paymentDate: new Date(),
      });
  
      await paymentRecord.save();
  
      res.json({ message: 'Charge successful' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Internal Server Error' });
    }
  });

// Route to display the barcode page
router.get('/barcode', checkUser, async (req, res) => {
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








router.get('/bankManage', checkUser, (req, res) => {
    res.render('user/bankManage');
});

router.get('/addBank', checkUser, (req, res) => {
    res.render('user/addBank');
});

// 메인 카테고리 장소 목록 불러오기
router.get('/campusMap', checkUser, displayID, async (req, res) => {
    try {
        const mainCategories = await CampusMap.find({ category: "Main" });
        res.render('user/campusMap', { mainCategories });
    } catch (err) {
        console.error(err);
        res.status(500).send('Internal Server Error');
    }
});

// 특정 장소의 상세  정보 불러오 기
router.get('/campusMap/:name', checkUser, displayID, async (req, res) => {
    try {
        const name = req.params.name;
        const relatedPlaces = await CampusMap.find({ category: name });

        if (relatedPlaces.length === 1 && relatedPlaces[0].location) {
            // 관련 장소가 하나만 있고, 위치 정보가 있는 경우 상세 페이지 렌더링
            res.render('user/campusMapDetail', { detail: relatedPlaces[0] });
        } else {
            // 여러 관련 장소가 있는 경우 그 목록 렌더링
            res.render('user/campusMap', { mainCategories: relatedPlaces });
        }
    } catch (err) {
        console.error(err);
        res.status(500).send('Internal Server Error');
    }
});



// Route to render the feedback form
router.get('/feedback', checkUser, displayID, (req, res) => {
    res.render('user/feedback');
});

// Route to handle feedback submission
router.post('/submit-feedback', checkUser, async (req, res) => {
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



router.get('/qrscanner', checkUser, (req, res) => {
    res.render('user/qrscanner'); 
});


// Render the QR Payment page
router.get('/qrpayment', checkUser, (req, res) => {
    res.render('user/QRpayment', { verificationStatus: null, recipientEmail: '' });
});

// Handle QR Payment requests
router.post('/qrpayment', checkUser, async (req, res) => {
    const { recipientEmail, verifiedRecipientEmail, amount, action } = req.body;
    const senderEmail = req.session.email; // Ensure this session variable is correctly set
    const emailToUse = verifiedRecipientEmail || recipientEmail;

    if (action === 'verify') {
        // Email verification process
        const recipientExists = await collection.findOne({ email: recipientEmail });
        req.session.recipientEmail = recipientExists ? recipientEmail : '';
        return res.render('user/QRpayment', { 
            verificationStatus: recipientExists ? 'verified' : 'not_found', 
            recipientEmail 
        });
    } else if (action === 'pay') {
        // Handle payment
        try {
            const transferAmount = parseFloat(amount);

            // Check if the amount is negative or NaN
            if (transferAmount < 0 || isNaN(transferAmount)) {
                // Handle negative or invalid amount
                return res.status(400).send('The amount entered cannot be negative or invalid.');
            }

            let senderBalance = await PaymentBalance.findOne({ email: senderEmail });
            let recipientBalance = await PaymentBalance.findOne({ email: emailToUse });

            // Check if sender has sufficient funds
            if (!senderBalance || parseFloat(senderBalance.balance) < transferAmount) {
                // Handle insufficient funds
                return res.status(400).send('You do not have enough funds to complete this transaction.');
            }

            // Convert balance to number for calculation and update balances
            const updatedSenderBalance = parseFloat(senderBalance.balance) - transferAmount;
            const updatedRecipientBalance = (recipientBalance ? parseFloat(recipientBalance.balance) : 0) + transferAmount;

            senderBalance.balance = updatedSenderBalance.toString();
            if (recipientBalance) {
                recipientBalance.balance = updatedRecipientBalance.toString();
            } else {
                // Create new balance record for recipient if not exists
                recipientBalance = new PaymentBalance({ email: emailToUse, balance: updatedRecipientBalance.toString() });
            }

            await senderBalance.save();
            await recipientBalance.save();

            // Create Payment Records for both sender and recipient
            const senderRecord = new PaymentRecord({
                email: senderEmail,
                type: `QR Pay to ${emailToUse}`,
                amount: -transferAmount,
                remainingBalance: senderBalance.balance,
                paymentStatus: 'Success',
                paymentDate: new Date(),
            });

            const recipientRecord = new PaymentRecord({
                email: emailToUse,
                type: `QR Pay from ${senderEmail}`,
                amount: transferAmount,
                remainingBalance: recipientBalance.balance,
                paymentStatus: 'Success',
                paymentDate: new Date(),
            });

            await senderRecord.save();
            await recipientRecord.save();

            req.session.recipientEmail = ''; // Clear the session email after payment
            res.redirect('/paymentMain'); // Redirect to the main payment page after successful payment
        } catch (error) {
            console.error(error);
            res.status(500).send('Internal Server Error');
        }
    }
});













module.exports = router;