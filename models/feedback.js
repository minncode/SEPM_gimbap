const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema({
    typeOfFeedback: {
        type: String,
        required: true,
    },
    feedbackDetails: {
        type: String,
        required: true,
    },
    submissionTime: {
        type: Date,
        default: Date.now,
    },
});

const Feedback = mongoose.model('feedbacks', feedbackSchema);

module.exports = Feedback;