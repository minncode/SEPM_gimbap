const mongoose = require('mongoose');

const campusMapSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    category: {
        type: String,
        required: true,
    },
    location: {
        type: String,
    },
    contact: {
        type: String,
    },
    image:{
        type: String,
    }
});

const CampusMap = mongoose.model('campusMaps', campusMapSchema);

module.exports = CampusMap;
