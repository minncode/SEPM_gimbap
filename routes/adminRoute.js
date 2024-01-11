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
const upload = require('../middleware/uploadImages');
const path = require('path');
const fs = require('fs');
const {checkAdmin} = require('../middleware/authentication');

router.use(session({
    secret: 'your secret key',
    resave: false,
    saveUninitialized: true
}));


// Admin Page
router.get('/', checkAdmin, async (req, res) => {
    try {
        res.render('admin/adminMain');
    } catch (err) {
        console.error(err);
        res.status(500).send('Internal Server Error');
    }
});


// Course List Management Page
router.get('/courseListManagement', checkAdmin, async (req, res) => {
    try {
        let searchQuery = {};
        if (req.query.search) {
            const search = req.query.search;
            searchQuery = {
                $or: [
                    { courseID: new RegExp(search, 'i') },
                    { courseCode: new RegExp(search, 'i') },
                    { courseName: new RegExp(search, 'i') },
                    { semester: new RegExp(search, 'i') },
                    { credits: new RegExp(search, 'i') }
                ]
            };
        }

        const courseList = await CourseList.find(searchQuery);
        res.render('admin/courseListManagement', { courseList });
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
        res.redirect('/admin/courseListManagement');
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

        // Check if the new course ID already exists by excluding the current course being edited
        const existingCourse = await CourseList.findOne({ courseID: newCourseID, _id: { $ne: courseToEdit._id } });
        if (existingCourse) {
            return res.status(400).send('The new course ID already exists');
        }
        // Update the course information
        
        courseToEdit.courseID = newCourseID;
        courseToEdit.courseCode = newCourseCode;
        courseToEdit.courseName = newCourseName;
        courseToEdit.semester = newSemester; // Added semester field update
        courseToEdit.credits = newCredits; // Added credits field update

        // Save the updated course information to the database
        await courseToEdit.save();

        // Update CourseActivity records with the new courseID
        await CourseActivity.updateMany({ courseID: courseIDEdit }, { $set: { courseID: newCourseID } });

        // Update CourseEnrollment records with the new courseID
        await CourseEnrollment.updateMany({ courseID: courseIDEdit }, { $set: { courseID: newCourseID } });

        // Redirect back to the course list management page
        res.redirect('/admin/courseListManagement');
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
        res.redirect('/admin/courseListManagement');
    } catch (err) {
        console.error(err);
        res.status(500).send('Internal Server Error');
    }
});




// Display Course Activity List
router.get('/courseActivityManagement', checkAdmin, async (req, res) => {
    try {
        let searchQuery = {};
        if (req.query.search) {
            const search = req.query.search;
            searchQuery = {
                $or: [
                    { courseID: new RegExp(search, 'i') },
                    { activity: new RegExp(search, 'i') },
                    { lecturer: new RegExp(search, 'i') },
                    { classroom: new RegExp(search, 'i') },
                    { time: new RegExp(search, 'i') }
                ]
            };
        }

        const activityList = await CourseActivity.find(searchQuery);
        res.render('admin/courseActivityManagement', { activityList });
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

      // Check if the activity
      const existingActivity = await CourseActivity.findOne({ courseID, activity })
      if (existingActivity) {
          return res.status(400).send('Same activity already exists.');
      }
  
      const newActivity = new CourseActivity({
        courseID,
        activity,
        lecturer,
        classroom,
        time: time.split(',').map((t) => t.trim()),
      });
  
      await newActivity.save();
      res.redirect('/admin/courseActivityManagement');
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

        // Check if the new activity already exists for the given courseID, excluding the current activity being edited
        const existingActivity = await CourseActivity.findOne({
            courseID: newCourseID,
            activity: newActivity,
            _id: { $ne: activityToEdit._id }
        });

        if (existingActivity) {
            return res.status(400).send('The new activity already exists.');
        }

        const oldId = activityToEdit.courseID;
        const oldActivity = activityToEdit.activity;

        // Update activity details
        activityToEdit.courseID = newCourseID;
        activityToEdit.activity = newActivity;
        activityToEdit.lecturer = newLecturer;
        activityToEdit.classroom = newClassroom;
        activityToEdit.time = newTime.split(',').map((t) => t.trim());

        await activityToEdit.save();

        // Update CourseEnrollment records with the new courseID and activity
        await CourseEnrollment.updateMany(
            { courseID: oldId, activity: oldActivity }, { $set: { courseID: newCourseID, activity: newActivity } }
        );

        res.redirect('/admin/courseActivityManagement');
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

      res.redirect('/admin/courseActivityManagement');
    } catch (err) {
      console.error(err);
      res.status(500).send('Internal Server Error');
    }
  });
  



// Display Course Enrollment List
router.get('/courseEnrollmentManagement', checkAdmin, async (req, res) => {
    try {
        let searchQuery = {};
        if (req.query.search) {
            const search = req.query.search;
            searchQuery = {
                $or: [
                    { email: new RegExp(search, 'i') },
                    { courseID: new RegExp(search, 'i') },
                    { activity: new RegExp(search, 'i') }
                ]
            };
        }

        const enrollmentList = await CourseEnrollment.find(searchQuery);
        res.render('admin/courseEnrollmentManagement', { enrollmentList });
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
        res.redirect('/admin/courseEnrollmentManagement');
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

        // Check if the enrollment already exists
        const existingEnrollment = await CourseEnrollment.findOne({ email: enrollmentToEdit.email, courseID: newCourseID, activity: newActivity })
        if (existingEnrollment) {
            return res.status(400).send('Enrollment already exists.');
        }

        // Update enrollment details
        enrollmentToEdit.courseID = newCourseID;
        enrollmentToEdit.activity = newActivity;

        await enrollmentToEdit.save();
        res.redirect('/admin/courseEnrollmentManagement');
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

        res.redirect('/admin/courseEnrollmentManagement');
    } catch (err) {
        console.error(err);
        res.status(500).send('Internal Server Error');
    }
});








// Render User Management page
router.get('/userManagement', checkAdmin, async (req, res) => {
    try {
        let query = req.query.search; 

       
        let searchQuery = query ? {
            $or: [
                { email: new RegExp(query, 'i') },
                { name: new RegExp(query, 'i') },
                { major: new RegExp(query, 'i') },
                { role: new RegExp(query, 'i') }
            ]
        } : {};

        const userList = await collection.find(searchQuery).select('-password'); // 검색 쿼리에 맞는 사용자 찾기
        res.render('admin/userManagement', { userList }); // 결과와 함께 템플릿 렌더링
    } catch (err) {
        console.error(err);
        res.status(500).send('Internal Server Error');
    }
});
// Add User
router.post('/userManagement/add', upload.single('image'), async (req, res) => {
    try {
        const { major, email, name, password, year, role } = req.body;

                // Hashing the password
                const hashedPassword = await bcrypt.hash(password, 10);
        
        // Check if the email already exists
        const existingUser = await collection.findOne({ email });

        if (existingUser) {
            return res.status(400).send('User with this email already exists');
        }



        const imagePath = req.file ? '/images/' + req.file.filename : '/images/default.png';
        const newUser = new collection({ major, email, name, password: hashedPassword, year, role, image: imagePath });
        await newUser.save();

        // Creating a new PaymentBalance document for the new user
        const newPaymentBalance = new PaymentBalance({
            email: email,
            balance: 0 // Initialize the balance to 0
        });

        // Saving the new PaymentBalance document
        await newPaymentBalance.save();

        res.redirect('/admin/userManagement'); // Redirect to user list or wherever you want
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});


// Edit user
router.post('/userManagement/edit', upload.single('newImage'), async (req, res) => {
    const { userIdEdit, newMajor, newEmail, newName, newRole, yearEdit } = req.body;
    let editMe = 0;

    try {
        const userToEdit = await collection.findById(userIdEdit).select('-password');

        if (!userToEdit) {
            return res.status(404).send('User not found');
        }

        // Get the existing user email
        const oldEmail = userToEdit.email;
        if (req.session.email == oldEmail) {
            editMe = 1;
        }

        // Check if the new email is already in use by another user (excluding the current user)
        const existingUserWithEmail = await collection.findOne({ email: newEmail, _id: { $ne: userIdEdit } });
        if (existingUserWithEmail) {
            // Another user is already using the new email
            return res.status(400).send('The new email is already in use by another user.');
        }
        
        if (req.file) {
            if (userToEdit.image && userToEdit.image !== '/images/default.png') {
                const oldImagePath = path.join(__dirname, '../public', userToEdit.image);
                if (fs.existsSync(oldImagePath)) {
                    fs.unlinkSync(oldImagePath);
                }
            }
            userToEdit.image = '/images/' + req.file.filename;
        }


        // Update user details
        userToEdit.major = newMajor;
        userToEdit.email = newEmail;
        userToEdit.name = newName;
        userToEdit.role = newRole;
        userToEdit.year = yearEdit;

        if (editMe == 1) {
        role = userToEdit.role;
        image = userToEdit.image;
        userName = userToEdit.name;
        };

        await userToEdit.save();

        // Update CourseEnrollment records with the new email
        await CourseEnrollment.updateMany({ email: oldEmail }, { $set: { email: newEmail } });
        // Update PaymentBalance records with the new email
        await PaymentBalance.updateMany({ email: oldEmail }, { $set: { email: newEmail } })
        // Update PaymentRecord records with the new email
        await PaymentRecord.updateMany({ email: oldEmail }, { $set: { email: newEmail } });
        // Update CourseEnrollmentHistory records with the new email
        await CourseEnrollmentHistory.updateMany({ email: oldEmail }, { $set: { email: newEmail } });
        // Update CourseEvaluation records with the new email
        await CourseEvaluation.updateMany({ email: oldEmail }, { $set: { email: newEmail } });


        res.redirect('/admin/userManagement');
    } catch (err) {
        console.error(err);
        res.status(500).send('Internal Server Error');
    }
});

// Delete user
router.post('/userManagement/delete', async (req, res) => {
    const { userIdDelete } = req.body;

    try {
        const userToDelete = await collection.findByIdAndDelete(userIdDelete);

        if (!userToDelete) {
            return res.status(404).send('User not found');
        }

        // Delete corresponding records in paymentBalance for the user's email
        await PaymentBalance.deleteMany({ email: userToDelete.email });
        // Delete corresponding records in courseEnrollment for the user's email
        await CourseEnrollment.deleteMany({ email: userToDelete.email });
        // Delete corresponding records in CourseEnrollmentHistory for the user's email
        await CourseEnrollmentHistory.deleteMany({ email: userToDelete.email });
        // Delete corresponding records in CourseEvaluation for the user's email
        await CourseEvaluation.deleteMany({ email: userToDelete.email });

        res.redirect('/admin/userManagement');
    } catch (err) {
        console.error(err);
        res.status(500).send('Internal Server Error');
    }
});



  




// Payment Balance Management Page
router.get('/paymentBalanceManagement', checkAdmin, async (req, res) => {
    try {
        let searchQuery = {};
        if (req.query.search) {
            const search = req.query.search;
            searchQuery = {
                $or: [
                    { email: new RegExp(search, 'i') },
                    { balance: { $regex: new RegExp(search, 'i') } }
                ]
            };
        }

        const sortField = req.query.sort || 'email'; // Default sort field
        const sortOrder = req.query.order === 'desc' ? -1 : 1; // Default sort order

        const balanceList = await PaymentBalance.find(searchQuery).sort({ [sortField]: sortOrder });
        res.render('admin/paymentBalanceManagement', { balanceList });
    } catch (err) {
        console.error(err);
        res.status(500).send('Internal Server Error');
    }
});

// Add Payment Balance
router.post('/paymentBalanceManagement/add', async (req, res) => {
    const { email, balance, adminNote } = req.body;

    try {
        const existingUser = await collection.findOne({ email });

        if (!existingUser) {
            return res.status(400).send('User with this email does not exist');
        }

        const existingBalance = await PaymentBalance.findOne({ email });

        if (existingBalance) {
            return res.status(400).send('Payment balance for this email already exists');
        }

        // Create a new payment record using the Mongoose model
        const newRecord = new PaymentRecord({
            email,
            type: 'Admin Adjustment',
            amount: balance,
            remainingBalance: balance,
            paymentStatus: 'Success',
            paymentDate: new Date(),
            adminNote,
        });

        // Save the new payment record to the database
        await newRecord.save();

        // Save the payment balance to the database
        const newBalance = new PaymentBalance({ email, balance });
        await newBalance.save();

        res.redirect('/admin/paymentBalanceManagement');
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});

// Edit Payment Balance
router.post('/paymentBalanceManagement/edit', async (req, res) => {
    const { balanceIdEdit, newBalance, adminNoteEdit } = req.body;

    try {
        const balanceToEdit = await PaymentBalance.findById(balanceIdEdit);

        if (!balanceToEdit) {
            return res.status(404).send('Balance not found');
        }

        // Create a new payment record using the Mongoose model
        const newRecord = new PaymentRecord({
            email: balanceToEdit.email,
            type: 'Admin Adjustment',
            amount: newBalance - balanceToEdit.balance,
            remainingBalance: newBalance,
            paymentStatus: 'Success',
            paymentDate: new Date(),
            adminNote: adminNoteEdit,
        });

        // Save the new payment record to the database
        await newRecord.save();

        // Update the payment balance
        balanceToEdit.balance = newBalance;
        await balanceToEdit.save();

        res.redirect('/admin/paymentBalanceManagement');
    } catch (err) {
        console.error(err);
        res.status(500).send('Internal Server Error');
    }
});
// Delete Payment Balance
router.post('/paymentBalanceManagement/delete', async (req, res) => {
    const { balanceIdDelete, adminNoteDelete } = req.body;

    try {
        const balanceToDelete = await PaymentBalance.findByIdAndDelete(balanceIdDelete);

        if (!balanceToDelete) {
            return res.status(404).send('Balance not found');
        }

        // Create Payment Record for account deletion
        const paymentRecord = new PaymentRecord({
            email: balanceToDelete.email,
            type: 'Delete Account',
            amount: 0,
            remainingBalance: 0,
            paymentStatus: 'Success',
            paymentDate: new Date(),
            adminNote: adminNoteDelete,
        });

        await paymentRecord.save();

        res.redirect('/admin/paymentBalanceManagement');
    } catch (err) {
        console.error(err);
        res.status(500).send('Internal Server Error');
    }
});


// Render Payment Record Management page
router.get('/paymentRecordManagement', checkAdmin, async (req, res) => {
    try {
        let searchQuery = {};
        if (req.query.search) {
            const search = req.query.search;
            searchQuery = {
                $or: [
                    { email: new RegExp(search, 'i') },
                    { type: new RegExp(search, 'i') },
                    { amount: new RegExp(search, 'i') },
                    { remainingBalance: new RegExp(search, 'i') },
                    { paymentStatus: new RegExp(search, 'i') },
                    { adminNote: new RegExp(search, 'i') }
                ]
            };
        }

        const sortField = req.query.sort || 'email'; // Default sort field
        const sortOrder = req.query.order === 'desc' ? -1 : 1; // Default sort order

        const paymentRecordList = await PaymentRecord.find(searchQuery).sort({ [sortField]: sortOrder });
        res.render('admin/paymentRecordManagement', { paymentRecordList });
    } catch (err) {
        console.error(err);
        res.status(500).send('Internal Server Error');
    }
});

// Feedback Management
router.get('/feedbackManagement', checkAdmin, async (req, res) => {
    try {
        let searchQuery = {};
        if (req.query.search) {
            const search = req.query.search;
            searchQuery = {
                $or: [
                    { typeOfFeedback: new RegExp(search, 'i') },
                    { feedbackDetails: new RegExp(search, 'i') }
                ]
            };
        }


const sortField = req.query.sort || 'submissionTime'; // Default sort field
        const sortOrder = req.query.order === 'desc' ? -1 : 1; // Default sort order

        const feedbackList = await Feedback.find(searchQuery).sort({ [sortField]: sortOrder });
        res.render('admin/feedbackManagement', { feedbackList });
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});


// Display Course History List
router.get('/courseHistoryManagement', checkAdmin, async (req, res) => {
    try {
        let searchQuery = {};
        if (req.query.search) {
            const search = req.query.search;
            searchQuery = {
                $or: [
                    { courseID: new RegExp(search, 'i') },
                    { courseName: new RegExp(search, 'i') },
                    { lecturer: new RegExp(search, 'i') }
                ]
            };
        }

        const courseHistoryList = await CourseHistory.find(searchQuery);
        res.render('admin/courseHistoryManagement', { courseHistoryList });
    } catch (err) {
        console.error(err);
        res.status(500).send('Internal Server Error');
    }
});

// Add Course History
router.post('/courseHistoryManagement/add', async (req, res) => {
    const { courseID, courseName, lecturer } = req.body;

    try {
        // Check if the courseID already exists in courseHistory
        const existingCourse = await CourseHistory.findOne({ courseID });

        if (existingCourse) {
            return res.status(400).send('The provided course ID already exists in the course history.');
        }

        const newCourse = new CourseHistory({
            courseID,
            courseName,
            lecturer,
        });

        await newCourse.save();
        res.redirect('/admin/courseHistoryManagement');
    } catch (err) {
        console.error(err);
        res.status(500).send('Internal Server Error');
    }
});

// Edit Course History
router.post('/courseHistoryManagement/edit', async (req, res) => {
    const { courseIdEdit, newCourseID, newCourseName, newLecturer } = req.body;

    try {
        const courseToEdit = await CourseHistory.findById(courseIdEdit);

        if (!courseToEdit) {
            return res.status(404).send('Course not found');
        }

        // Check if the new courseID already exists in courseHistory, excluding the current course being edited
        const existingCourse = await CourseHistory.findOne({
            courseID: newCourseID,
            _id: { $ne: courseToEdit._id },
        });

        if (existingCourse) {
            return res.status(400).send('The new course ID already exists in the course history.');
        }

        const oldCourseID = courseToEdit.courseID;

        // Update course details
        courseToEdit.courseID = newCourseID;
        courseToEdit.courseName = newCourseName;
        courseToEdit.lecturer = newLecturer;

        await courseToEdit.save();

        // Update courseID in CourseEnrollmentHistory and CourseEvaluation using the old course ID
        await CourseEnrollmentHistory.updateMany({ courseID: oldCourseID }, { $set: { courseID: newCourseID } });
        await CourseEvaluation.updateMany({ courseID: oldCourseID }, { $set: { courseID: newCourseID } });

        res.redirect('/admin/courseHistoryManagement');
    } catch (err) {
        console.error(err);
        res.status(500).send('Internal Server Error');
    }
});

// Delete Course History
router.post('/courseHistoryManagement/delete', async (req, res) => {
    const { courseIdDelete } = req.body;

    try {
        const courseToDelete = await CourseHistory.findById(courseIdDelete);

        if (!courseToDelete) {
            return res.status(404).send('Course not found');
        }

        // Store the course ID before deleting
        const courseID = courseToDelete.courseID;

        // Delete the course from CourseHistory
        await CourseHistory.findByIdAndDelete(courseIdDelete);

        // Delete related records in CourseEnrollmentHistory and CourseEvaluation
        await CourseEnrollmentHistory.deleteMany({ courseID: courseID });
        await CourseEvaluation.deleteMany({ courseID: courseID });

        res.redirect('/admin/courseHistoryManagement');
    } catch (err) {
        console.error(err);
        res.status(500).send('Internal Server Error');
    }
});





// Display Course Enrollment History List
router.get('/courseEnrollmentHistoryManagement', checkAdmin, async (req, res) => {
    try {
        let searchQuery = {};
        if (req.query.search) {
            const search = req.query.search;
            searchQuery = {
                $or: [
                    { email: new RegExp(search, 'i') },
                    { courseID: new RegExp(search, 'i') },
                    { enrollmentSemester: new RegExp(search, 'i') }
                ]
            };
        }

        const enrollmentHistoryList = await CourseEnrollmentHistory.find(searchQuery);
        res.render('admin/courseEnrollmentHistoryManagement', { enrollmentHistoryList });
    } catch (err) {
        console.error(err);
        res.status(500).send('Internal Server Error');
    }
});

router.post('/courseEnrollmentHistoryManagement/add', async (req, res) => {
    const { email, courseID, enrollmentSemester } = req.body;

    try {
        // Check if the email exists in the 'collection' collection
        const existingUser = await collection.findOne({ email });

        if (!existingUser) {
            return res.status(400).send('User with the provided email does not exist.');
        }

        // Check if the courseID exists in the 'CourseHistory' collection
        const existingCourse = await CourseHistory.findOne({ courseID });

        if (!existingCourse) {
            return res.status(400).send('Course with the provided courseID does not exist.');
        }

        // Check if the enrollment history already exists for the given email, courseID, and enrollmentSemester
        const existingEnrollment = await CourseEnrollmentHistory.findOne({ email, courseID, enrollmentSemester });

        if (existingEnrollment) {
            return res.status(400).send('Enrollment history already exists for the given email, courseID, and enrollmentSemester.');
        }

        // Create a new enrollment history
        const newEnrollmentHistory = new CourseEnrollmentHistory({
            email,
            courseID,
            enrollmentSemester,
        });

        await newEnrollmentHistory.save();
        res.redirect('/admin/courseEnrollmentHistoryManagement');
    } catch (err) {
        console.error(err);
        res.status(500).send('Internal Server Error');
    }
});

// Edit Course Enrollment History
router.post('/courseEnrollmentHistoryManagement/edit', async (req, res) => {
    const { enrollmentIdEdit, newEmail, newCourseID, newEnrollmentSemester } = req.body;
    try {
        const enrollmentToEdit = await CourseEnrollmentHistory.findById(enrollmentIdEdit);
        if (!enrollmentToEdit) {
            return res.status(404).send('Enrollment history to edit not found');
        }

        // Check if the new email exists in the 'collection' collection
        if (newEmail && newEmail !== enrollmentToEdit.email) {
            const existingUser = await collection.findOne({ email: newEmail });
            if (!existingUser) {
                return res.status(400).send('User with the provided newEmail does not exist.');
            }

            // Update email in CourseEvaluation
            await CourseEvaluation.updateMany({ email: enrollmentToEdit.email, courseID: enrollmentToEdit.courseID }, { $set: { email: newEmail } });
        }


        
               // Check if the newCourseID exists in the 'CourseHistory' collection
               if (newCourseID && newCourseID !== enrollmentToEdit.courseID) {
                const existingCourse = await CourseHistory.findOne({ courseID: newCourseID });
                if (!existingCourse) {
                    return res.status(400).send('Course with the provided newCourseID does not exist.');
                }



        // Check if the edited enrollment history already exists for the new email, new courseID, and new enrollmentSemester
        const existingEnrollment = await CourseEnrollmentHistory.findOne({
            email: newEmail,
            courseID: newCourseID,
            enrollmentSemester: newEnrollmentSemester,
            _id: { $ne: enrollmentIdEdit } // Exclude the current enrollment being edited
        });

        if (existingEnrollment) {
            return res.status(400).send('Enrollment history already exists for the given new email, new courseID, and new enrollmentSemester.');
        }

        // Update courseID in CourseEvaluation
        await CourseEvaluation.updateMany({ email: enrollmentToEdit.email, courseID: enrollmentToEdit.courseID }, { $set: { courseID: newCourseID } });
    }

        // Update enrollment history details
        enrollmentToEdit.email = newEmail;
        enrollmentToEdit.courseID = newCourseID;
        enrollmentToEdit.enrollmentSemester = newEnrollmentSemester;

        await enrollmentToEdit.save();
        res.redirect('/admin/courseEnrollmentHistoryManagement');
    } catch (err) {
        console.error(err);
        res.status(500).send('Internal Server Error');
    }
});

// Delete Course Enrollment History
router.post('/courseEnrollmentHistoryManagement/delete', async (req, res) => {
    const { enrollmentIdDelete } = req.body;

    try {
        const enrollmentToDelete = await CourseEnrollmentHistory.findById(enrollmentIdDelete);

        if (!enrollmentToDelete) {
            return res.status(404).send('Enrollment history not found');
        }

        // Delete corresponding CourseEvaluation records
        await CourseEvaluation.deleteMany({
            email: enrollmentToDelete.email, 
            courseID: enrollmentToDelete.courseID
        });

        // Now delete the enrollment history record
        await CourseEnrollmentHistory.findByIdAndDelete(enrollmentIdDelete);

        res.redirect('/admin/courseEnrollmentHistoryManagement');
    } catch (err) {
        console.error(err);
        res.status(500).send('Internal Server Error');
    }
});









// Display Course Evaluation List
router.get('/courseEvaluationManagement', checkAdmin, async (req, res) => {
    try {
        let searchQuery = {};
        if (req.query.search) {
            const search = req.query.search;
            searchQuery = {
                $or: [
                    { courseID: new RegExp(search, 'i') },
                    { email: new RegExp(search, 'i') },
                    { status: new RegExp(search, 'i') },
                    { enrollmentSemester: new RegExp(search, 'i') },
                    { textFeedback: new RegExp(search, 'i') }
                ]
            };
        }

        const courseEvaluationList = await CourseEvaluation.find(searchQuery);
        res.render('admin/courseEvaluationManagement', { courseEvaluationList });
    } catch (err) {
        console.error(err);
        res.status(500).send('Internal Server Error');
    }
});

// Add Course Evaluation - I think this is not needed for the Administrators
// router.post('/courseEvaluationManagement/add', async (req, res) => {
//     const {
//         courseID,
//         email,
//         status,
//         enrollmentSemester,
//         starRating,
//         assignmentsCount,
//         examsCount,
//         groupProjectsCount,
//         difficulty,
//         textFeedback,
//     } = req.body;

//     try {
//         const newEvaluation = new CourseEvaluation({
//             courseID,
//             email,
//             status,
//             enrollmentSemester,
//             starRating,
//             assignmentsCount,
//             examsCount,
//             groupProjectsCount,
//             difficulty,
//             textFeedback,
//         });

//         await newEvaluation.save();
//         res.redirect('/admin/courseEvaluationManagement');
//     } catch (err) {
//         console.error(err);
//         res.status(500).send('Internal Server Error');
//     }
// });

// Edit Course Evaluation
router.post('/courseEvaluationManagement/edit', async (req, res) => {
    const {
        evaluationIdEdit,
        newCourseID,
        newEmail,
        newStatus,
        newEnrollmentSemester,
        newStarRating,
        newAssignmentsCount,
        newExamsCount,
        newGroupProjectsCount,
        newDifficulty,
        newTextFeedback,
    } = req.body;

    try {
        const evaluationToEdit = await CourseEvaluation.findById(evaluationIdEdit);

        if (!evaluationToEdit) {
            return res.status(404).send('Course evaluation to edit not found');
        }

                // Check if a corresponding CourseEnrollmentHistory exists
                const matchingEnrollmentHistory = await CourseEnrollmentHistory.findOne({
                    email: newEmail,
                    courseID: newCourseID
                });
        
                if (!matchingEnrollmentHistory) {
                    return res.status(400).send('No matching course enrollment history found for the given email and course ID.');
                }

        // Update evaluation details
        evaluationToEdit.courseID = newCourseID;
        evaluationToEdit.email = newEmail;
        evaluationToEdit.status = newStatus;
        evaluationToEdit.enrollmentSemester = newEnrollmentSemester;
        evaluationToEdit.starRating = newStarRating;
        evaluationToEdit.assignmentsCount = newAssignmentsCount;
        evaluationToEdit.examsCount = newExamsCount;
        evaluationToEdit.groupProjectsCount = newGroupProjectsCount;
        evaluationToEdit.difficulty = newDifficulty;
        evaluationToEdit.textFeedback = newTextFeedback;

        await evaluationToEdit.save();
        res.redirect('/admin/courseEvaluationManagement');
    } catch (err) {
        console.error(err);
        res.status(500).send('Internal Server Error');
    }
});

// Delete Course Evaluation
router.post('/courseEvaluationManagement/delete', async (req, res) => {
    const { evaluationIdDelete } = req.body;

    try {
        const evaluationToDelete = await CourseEvaluation.findByIdAndDelete(evaluationIdDelete);

        if (!evaluationToDelete) {
            return res.status(404).send('Course evaluation not found');
        }

        // Perform additional cleanup or related actions if needed

        res.redirect('/admin/courseEvaluationManagement');
    } catch (err) {
        console.error(err);
        res.status(500).send('Internal Server Error');
    }
});

module.exports = router;







// Display Campus Map Management Page
router.get('/campusMapManagement', checkAdmin, async (req, res) => {
    const sortField = req.query.sort || 'name'; // Default sort field
    const sortOrder = req.query.order === 'desc' ? -1 : 1; // Default sort order

    try {
        let searchQuery = {};
        if (req.query.search) {
            const search = req.query.search;
            searchQuery = {
                $or: [
                    { name: new RegExp(search, 'i') },
                    { category: new RegExp(search, 'i') },
                    { location: new RegExp(search, 'i') },
                    { contact: new RegExp(search, 'i') },
                    { text: new RegExp(search, 'i') }
                ]
            };
        }

        let campusMaps = await CampusMap.find(searchQuery).sort({ [sortField]: sortOrder });
        res.render('admin/campusMapManagement', { campusMaps });
    } catch (err) {
        console.error(err);
        res.status(500).send('Internal Server Error');
    }
});

// Add Campus Map
router.post('/campusMapManagement/add', upload.single('image'), async (req, res) => {
    const { name, category, location, contact, text } = req.body;
    const imagePath = req.file ? '/images/' + req.file.filename : '/images/default.png';
    
    const newMap = new CampusMap({ name, category, location, contact, image: imagePath, text });
    await newMap.save();
    res.redirect('/admin/campusMapManagement');
});

// Edit Campus Map
router.post('/campusMapManagement/edit', upload.single('newImage'), async (req, res) => {
    const { mapIdEdit, newName, newCategory, newLocation, newContact, newText } = req.body;
    const map = await CampusMap.findById(mapIdEdit);
    
    if (!map) {
        return res.status(404).send('Campus map not found');
    }

    // 새 이미지가 업로드된 경우
    if (req.file) {
        // 기존 이미지가 있으면 삭제
        if (map.image) {
            const oldImagePath = path.join(__dirname, '../public', map.image);
            if (fs.existsSync(oldImagePath)) {
                fs.unlinkSync(oldImagePath);
            }
        }
        // 새 이미지 경로 업데이트
        map.image = '/images/' + req.file.filename;
    }

    map.name = newName;
    map.category = newCategory;
    map.location = newLocation;
    map.contact = newContact;
    map.text = newText;

    await map.save();
    res.redirect('/admin/campusMapManagement');
});

// Delete Campus Map
router.post('/campusMapManagement/delete', async (req, res) => {
    const { mapIdDelete } = req.body;

    try {
        const mapToDelete = await CampusMap.findById(mapIdDelete);

        if (mapToDelete && mapToDelete.image) {
            // 이미지 파일 경로
            const imagePath = path.join(__dirname, '../public', mapToDelete.image);

            // 이미지 파일이 존재하면 삭제
            if (fs.existsSync(imagePath)) {
                fs.unlinkSync(imagePath);
            }
        }

        await CampusMap.findByIdAndDelete(mapIdDelete);
    res.redirect('/admin/campusMapManagement');
} catch (err) {
    console.error(err);
    res.status(500).send('Internal Server Error');
}
});














module.exports = router;