const mongoose = require('mongoose');

const courseEnrollmentSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
    },
    courseCode: {
        type: String,
    },
    activity: {
        type: String,
        required: true,
    }
});

const CourseEnrollment = mongoose.model('courseEnrollments', courseEnrollmentSchema);

module.exports = CourseEnrollment;
