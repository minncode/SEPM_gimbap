const mongoose = require('mongoose');

const courseListSchema = new mongoose.Schema({
    courseID: {
        type: String,
    },
    courseCode: {
        type: String,
    },
    courseName: {
        type: String,
    },
    semester: {
        type: String,
    },
    credits: {
        type: String,
    }
});

const CourseList = mongoose.model('courseLists', courseListSchema);

module.exports = CourseList;
