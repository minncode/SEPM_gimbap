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
    },
    major:{
        type: String,
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
    },
    role:{
        type: String,
    }
})


const collection = new mongoose.model("users", LogInSchema)

module.exports = collection;