const mongoose = require('mongoose');

const courseHistorySchema = new mongoose.Schema({
    courseID: {
        type: String,
        required: true,
        unique: true,
    },
    courseName: {
        type: String,
        required: true,
    },
    lecturer: {
        type: String,
        required: true,
    },
});

const CourseHistory = mongoose.model('CourseHistory', courseHistorySchema);

module.exports = CourseHistory;