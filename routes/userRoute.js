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
const QRCode = require('qrcode');
const upload = require('../middleware/uploadImages');


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
            req.session.image = user.image;
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

router.get('/main', async (req, res) => {
    const userEmail = req.session.email;
    try {
        const qrUrl = await QRCode.toDataURL(userEmail);
        res.render('user/main', {
            displayname: req.session.name,
            displayemail: req.session.email,
            displaymajor: req.session.major,
            displayimage: req.session.image,
            qrUrl: qrUrl
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to generate QR code' });
    }
});


router.get('/profile', async (req, res) => {
    res.render('user/profile', {
        displayname: req.session.name,
        displayemail: req.session.email,
        displaymajor: req.session.major,
        displayimage: req.session.image
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



// Display Course Evaluation Page with Search Results
router.get('/course_evaluation', async (req, res) => {
    try {
        let query = req.query.q; // Get the search query from the URL
        let courseHistoryList;

        if (query) {
            // If there's a search query, filter the courseHistoryList based on the query
            courseHistoryList = await CourseHistory.find({
                $or: [
                    { courseName: { $regex: new RegExp(query, 'i') } }, // Case-insensitive search for courseName
                    { lecturer: { $regex: new RegExp(query, 'i') } } // Case-insensitive search for lecturer
                ]
            });
        } else {
            // If there's no search query, get all courseHistory
            courseHistoryList = await CourseHistory.find();
        }

        res.render('user/course_evaluation', { courseHistoryList, searchQuery: query });
    } catch (err) {
        console.error(err);
        res.status(500).send('Internal Server Error');
    }
});



router.get('/editprofile', (req, res) => {
    res.render('user/editprofile', {
        displayname: req.session.name,
        displayemail: req.session.email,
        displaymajor: req.session.major,
        displayimage: req.session.image
    });
});

router.post('/editprofile', upload.single('image'), async (req, res) => {
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
            user.image = '/images/' + req.file.filename; // Update image path with the uploaded file
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

        res.redirect('/profile');
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

router.get('/courseSelect', async (req, res) => {
    try {
        const currentUser = req.session.email;

        // Retrieve course enrollment history for the current user
        const enrollmentHistoryList = await CourseEnrollmentHistory.find({ email: currentUser });

        // Retrieve course evaluations for the current user
        const courseEvaluationList = await CourseEvaluation.find({ email: currentUser });

        // Create an array to store course items
        const courseItems = [];

        // Iterate through enrollment history
        for (let i = 0; i < enrollmentHistoryList.length; i++) {
            const courseId = enrollmentHistoryList[i].courseID;

            // Retrieve course from CourseHistory
            const courseInHistory = await CourseHistory.findOne({ courseID: courseId });

            if (courseInHistory) {
                const hasReviewed = courseEvaluationList.some(review => review.courseID === courseId && review.email === currentUser);
                const courseItem = {
                    courseID: courseInHistory.courseID,
                    courseName: courseInHistory.courseName,
                    lecturer: courseInHistory.lecturer,
                    hasReviewed: hasReviewed
                };
                courseItems.push(courseItem);
            }
        }

        // Render the view with the course items
        res.render('user/courseSelect', { courseItems });
    } catch (err) {
        console.error(err);
        res.status(500).send('Internal Server Error');
    }
});

// router.get('/courseSelect/:action', async (req, res) => {
//     try {
//         const currentUser = req.session.email;
//         const { action } = req.params;
//         const { courseID } = req.query;
    
//         const courseInHistory = await CourseHistory.findOne({ courseID });
    
//         if (!courseInHistory) {
//             return res.status(400).send('Course not found in course history');
//         }
    
//         const existingReview = await CourseEvaluation.findOne({ email: currentUser, courseID });
    
//         if (action === 'add' && existingReview) {
//             return res.status(400).send('User has already reviewed the course');
//         }
    
//         if (action === 'edit' && !existingReview) {
//             return res.status(400).send('User has not reviewed the course yet');
//         }
    
//         // Check if courseInHistory is not null or undefined before spreading
//         const courseInfoForReview = courseInHistory ? { ...courseInHistory } : {};
    
//         res.render('user/writeReview', { currentUser, courseID, action, existingReview, userEmail: currentUser, ...courseInfoForReview });
//     } catch (err) {
//         console.error(err);
//         res.status(500).send('Internal Server Error');
//     }
// });

// router.post('/courseReviewForm/:action', async (req, res) => {
//     try {
//         const { courseID, email, enrollmentSemester, starRating, assignmentsCount, examsCount, groupProjectsCount, difficulty, textFeedback } = req.body;
//         const { action } = req.params;

//         const newReview = new CourseEvaluation({
//             courseID,
//             email,
//             status: 'Pending',
//             enrollmentSemester,
//             starRating,
//             assignmentsCount,
//             examsCount,
//             groupProjectsCount,
//             difficulty,
//             textFeedback,
//         });

//         if (action === 'add') {
//             await newReview.save();
//         } else if (action === 'edit') {
//             // Update existing review logic (if needed)
//         }

//         res.redirect('/user/courseSelect');
//     } catch (err) {
//         console.error(err);
//         res.status(500).send('Internal Server Error');
//     }
// });











router.get('/writeReview', async (req, res) => {
    try {
        const userEmail = req.session.email;

        // 유저의 이메일을 사용하여 courseEnrollmentHistory에서 해당 유저의 courseID를 조회
        const userEnrollments = await CourseEnrollmentHistory.find({ email: userEmail });

        // 해당 유저의 courseID 목록
        const userCourseIDs = userEnrollments.map(enrollment => enrollment.courseID);

        // CourseHistory에서 해당 courseIDs에 해당하는 데이터 조회
        const courses = await CourseHistory.find({ courseID: { $in: userCourseIDs } });

        res.render('user/writeReview', { courses, userEmail });
    } catch (error) {
        console.error('Error rendering writeReview:', error);
        res.status(500).send('Internal Server Error');
    }
});

router.get('/courseDetails/:courseID', async (req, res) => {
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



router.post('/writeReview', async (req, res) => {
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


router.get('/reviewDetail', (req, res) => {
    res.render('user/reviewDetail');
});

router.get('/reviewDetail/:courseID', async (req, res) => {
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

router.get('/charging', (req, res) => {
    res.render('user/charging');
  });
  
  router.post('/charging', async (req, res) => {
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


router.get('/qrscanner', (req, res) => {
    res.render('user/qrscanner'); 
});


// Render the QR Payment page
router.get('/qrpayment', (req, res) => {
    res.render('user/QRpayment', { verificationStatus: null, recipientEmail: '' });
});

// Handle QR Payment requests
router.post('/qrpayment', async (req, res) => {
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