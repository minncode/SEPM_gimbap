const mongoose = require('mongoose');

const courseEvaluationSchema = new mongoose.Schema({
    courseID: {
        type: String,
    },
    email: {
        type: String,
    },
    status: {
        type: String,
    },
    enrollmentSemester: {
        type: String,
    },
    starRating: {
        type: Number,
        min: 1,
        max: 5,
    },
    assignmentsCount: {
        type: Number,
        min: 0,
        max: 4,
    },
    examsCount: {
        type: Number,
        min: 0,
        max: 4,
    },
    groupProjectsCount: {
        type: Number,
        min: 0,
        max: 4,
    },
    difficulty: {
        type: Number,
        min: 1,
        max: 5,
    },
    textFeedback: {
        type: String,
    },
});

const CourseEvaluation = mongoose.model('CourseEvaluation', courseEvaluationSchema);

module.exports = CourseEvaluation;
