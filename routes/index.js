const express = require('express');
const router = express.Router();
const session = require('express-session');
const bcrypt = require('bcrypt');
const collection = require('../models/user');
const CourseList = require('../models/courseList');
const CourseActivity = require('../models/courseActivity');
const CourseEnrollment = require('../models/courseEnrollment');

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
    console.error(err.stack);
    res.status(500).send('Something broke!');
});







// Course List Management Page
router.get('/courseListManagement', async (req, res) => {
    try {
        // Fetch all courses from MongoDB
        const courseList = await CourseList.find();
        res.render('courseListManagement', { courseList });
    } catch (err) {
        console.error(err);
        res.status(500).send('Internal Server Error');
    }
});

// Add Course
router.post('/courseListManagement/add', async (req, res) => {
    const { courseID, courseCode, courseName, semester, credits } = req.body;

    try {
        // Check if the course with the given ID already exists
        const existingCourse = await CourseList.findOne({ courseID });

        if (existingCourse) {
            return res.status(400).send('Course with this ID already exists');
        }

        // Create a new course using the Mongoose model
        const newCourse = new CourseList({
            courseID,
            courseCode,
            courseName,
            semester, // Added semester field
            credits, // Added credits field
        });

        // Save the new course to the database
        await newCourse.save();

        // Redirect back to the course list management page
        res.redirect('/courseListManagement');
    } catch (err) {
        console.error(err);
        res.status(500).send('Internal Server Error');
    }
});

// Edit Course
router.post('/courseListManagement/edit', async (req, res) => {
    const { courseIDEdit, newCourseID, newCourseCode, newCourseName, newSemester, newCredits } = req.body;

    try {
        // Find the course to edit
        const courseToEdit = await CourseList.findOne({ courseID: courseIDEdit });

        if (!courseToEdit) {
            return res.status(404).send('Course not found');
        }

        // Check if the new course code already exists
        const existingCourse = await CourseList.findOne({ courseID: newCourseID })
        if (existingCourse) {
            return res.status(400).send('New course ID already exists');
        }

        // Update the course information
        
        courseToEdit.courseID = newCourseID;
        courseToEdit.courseCode = newCourseCode;
        courseToEdit.courseName = newCourseName;
        courseToEdit.semester = newSemester; // Added semester field update
        courseToEdit.credits = newCredits; // Added credits field update

        // Save the updated course information to the database
        await courseToEdit.save();

        // Redirect back to the course list management page
        res.redirect('/courseListManagement');
    } catch (err) {
        console.error(err);
        res.status(500).send('Internal Server Error');
    }
});

// Delete Course
router.post('/courseListManagement/delete', async (req, res) => {
    const { courseIDDelete } = req.body;

    try {
        // Find and remove the course from the database
        await CourseList.findOneAndDelete({ courseID: courseIDDelete });

        // Delete related data from CourseActivity
        await CourseActivity.deleteMany({ courseID: courseIDDelete });

        // Delete related data from CourseEnrollment
        await CourseEnrollment.deleteMany({ courseID: courseIDDelete });

        // Redirect back to the course list management page
        res.redirect('/courseListManagement');
    } catch (err) {
        console.error(err);
        res.status(500).send('Internal Server Error');
    }
});




// Display Course Activity List
router.get('/courseActivityManagement', async (req, res) => {
    try {
      const activityList = await CourseActivity.find();
      res.render('courseActivityManagement', { activityList });
    } catch (err) {
      console.error(err);
      res.status(500).send('Internal Server Error');
    }
  });
  
// Add Course Activity
router.post('/courseActivityManagement/add', async (req, res) => {
    const { courseID, activity, lecturer, classroom, time } = req.body;
  
    try {
      // Check if the courseID exists in courseLists
      const existingCourse = await CourseList.findOne({ courseID });
  
      if (!existingCourse) {
        return res.status(400).send('The provided course ID does not exist in the course list.');
      }
  
      const newActivity = new CourseActivity({
        courseID,
        activity,
        lecturer,
        classroom,
        time: time.split(',').map((t) => t.trim()),
      });
  
      await newActivity.save();
      res.redirect('/courseActivityManagement');
    } catch (err) {
      console.error(err);
      res.status(500).send('Internal Server Error');
    }
  });
  
// Edit Course Activity
router.post('/courseActivityManagement/edit', async (req, res) => {
    const { activityIdEdit, newCourseID, newActivity, newLecturer, newClassroom, newTime } = req.body;

    try {
        const activityToEdit = await CourseActivity.findById(activityIdEdit);

        if (!activityToEdit) {
            return res.status(404).send('Activity not found');
        }

        // Check if newCourseID exists in courseList
        const courseInList = await CourseList.findOne({ courseID: newCourseID });

        if (!courseInList) {
            return res.status(400).send('The provided course ID does not exist in the course list.');
        }

        // Update activity details
        activityToEdit.courseID = newCourseID;
        activityToEdit.activity = newActivity;
        activityToEdit.lecturer = newLecturer;
        activityToEdit.classroom = newClassroom;
        activityToEdit.time = newTime.split(',').map((t) => t.trim());

        await activityToEdit.save();
        res.redirect('/courseActivityManagement');
    } catch (err) {
        console.error(err);
        res.status(500).send('Internal Server Error');
    }
});

  
  // Delete Course Activity
  router.post('/courseActivityManagement/delete', async (req, res) => {
    const { activityIdDelete } = req.body;
  
    try {
      const activityToDelete = await CourseActivity.findByIdAndDelete(activityIdDelete);
  
      if (!activityToDelete) {
        return res.status(404).send('Activity not found');
      }
  
// Delete the corresponding enrollments
await CourseEnrollment.deleteMany({ courseID: activityToDelete.courseID, activity: activityToDelete.activity });

      res.redirect('/courseActivityManagement');
    } catch (err) {
      console.error(err);
      res.status(500).send('Internal Server Error');
    }
  });
  



// Display Course Enrollment List
router.get('/courseEnrollmentManagement', async (req, res) => {
    try {
        const enrollmentList = await CourseEnrollment.find();
        res.render('courseEnrollmentManagement', { enrollmentList });
    } catch (err) {
        console.error(err);
        res.status(500).send('Internal Server Error');
    }
});

// Add Course Enrollment
router.post('/courseEnrollmentManagement/add', async (req, res) => {
    const { email, courseID, activity } = req.body;

    try {
        // Check if the user with the given email exists
        const user = await collection.findOne({ email });

        if (!user) {
            return res.status(400).send('User not found. Please make sure the email is correct.');
        }

        // Check if the course activity with the given course ID and activity exists
        const courseActivity = await CourseActivity.findOne({ courseID, activity });

        if (!courseActivity) {
            return res.status(400).send('Course activity not found. Please make sure the course ID and activity are correct.');
        }

        // Check if the enrollment already exists
        const existingEnrollment = await CourseEnrollment.findOne({ email, courseID, activity });

        if (existingEnrollment) {
            return res.status(400).send('Enrollment already exists.');
        }

        // Add the enrollment
        const newEnrollment = new CourseEnrollment({
            email,
            courseID,
            activity,
        });

        await newEnrollment.save();
        res.redirect('/courseEnrollmentManagement');
    } catch (err) {
        console.error(err);
        res.status(500).send('Internal Server Error');
    }
});

// Edit Course Enrollment
router.post('/courseEnrollmentManagement/edit', async (req, res) => {
    const { enrollmentIdEdit, newCourseID, newActivity } = req.body;

    try {
        const enrollmentToEdit = await CourseEnrollment.findById(enrollmentIdEdit);

        if (!enrollmentToEdit) {
            return res.status(404).send('Enrollment not found');
        }

        // Check if newCourseID and newActivity exist in courseActivity
        const activityInCourse = await CourseActivity.findOne({ courseID: newCourseID, activity: newActivity });

        if (!activityInCourse) {
            return res.status(400).send('Course activity not found. Please make sure the course ID and activity are correct.');
        }

        // Update enrollment details
        enrollmentToEdit.courseID = newCourseID;
        enrollmentToEdit.activity = newActivity;

        await enrollmentToEdit.save();
        res.redirect('/courseEnrollmentManagement');
    } catch (err) {
        console.error(err);
        res.status(500).send('Internal Server Error');
    }
});

// Delete Course Enrollment
router.post('/courseEnrollmentManagement/delete', async (req, res) => {
    const { enrollmentIdDelete } = req.body;

    try {
        const enrollmentToDelete = await CourseEnrollment.findByIdAndDelete(enrollmentIdDelete);

        if (!enrollmentToDelete) {
            return res.status(404).send('Enrollment not found');
        }

        res.redirect('/courseEnrollmentManagement');
    } catch (err) {
        console.error(err);
        res.status(500).send('Internal Server Error');
    }
});





  


module.exports = router;