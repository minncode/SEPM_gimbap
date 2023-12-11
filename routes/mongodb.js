const mongoose = require('mongoose');

mongoose.connect("mongodb+srv://admin:1234@min.bcimc0z.mongodb.net/?retryWrites=true&w=majority")
.then(() => {
    console.log("connection successful");
})
.catch((err) => {
    console.error("error");
})

const LogInSchema = new mongoose.Schema({
    year:{
        type: Date,
        required: true
    },
    major:{
        type: String,
        required: true
    },
    email:{
        type: String,
        required: true
    },
    name:{
        type: String,
        required: true
    },
    password:{
        type: String,
        required: true
    }
})


const collection = new mongoose.model("LogInCollection1", LogInSchema)

module.exports = collection;