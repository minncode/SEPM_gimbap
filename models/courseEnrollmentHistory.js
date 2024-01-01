const mongoose = require('mongoose');

const courseEnrollmentHistorySchema = new mongoose.Schema({
    courseID: {
        type: String,
        ref: 'CourseHistory',
        required: true,
    },
    email: {
        type: String,
        ref: 'collection',
        required: true,
    },
    enrollmentSemester: {
        type: String,
    },
});

const CourseEnrollmentHistory = mongoose.model('CourseEnrollmentHistory', courseEnrollmentHistorySchema);

module.exports = CourseEnrollmentHistory;
