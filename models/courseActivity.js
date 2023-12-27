const mongoose = require('mongoose');

const courseActivitySchema = new mongoose.Schema({
    courseID: {
        type: String,
    },
    activity: {
        type: String,
        required: true,
    },
    lecturer: {
        type: String,
    },
    classroom: {
        type: String,
    },
    time: {
        type: [String], // array
    }
});

const CourseActivity = mongoose.model('courseActivities', courseActivitySchema);

module.exports = CourseActivity;
