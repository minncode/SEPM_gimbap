const mongoose = require('mongoose');

const courseEvaluationSchema = new mongoose.Schema({
    courseID: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
    },
    status: {
        type: String,
        //enum: ['Enrolled', 'Completed', 'Dropped'], 
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
    },
    examsCount: {
        type: Number,
    },
    groupProjectsCount: {
        type: Number,
    },
    difficulty: {
        type: String,
        //enum: ['Easy', 'Moderate', 'Difficult'], 
        required: true,
    },
    textFeedback: {
        type: String,
    },
});

const CourseEvaluation = mongoose.model('CourseEvaluation', courseEvaluationSchema);

module.exports = CourseEvaluation;
