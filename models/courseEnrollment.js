const mongoose = require('mongoose');

const courseEnrollmentSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
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
    time:{
        type:String, 
    },
    semester: {
        type: String,
    },
    credits: {
        type: String,
    }
});


const courseEnrollment = mongoose.model('courseEnrollments', courseEnrollmentSchema);

module.exports = courseEnrollment;