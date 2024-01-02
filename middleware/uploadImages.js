const express = require('express');
const multer  = require('multer');
const path = require('path');

const app = express();

// Set storage engine
const storage = multer.diskStorage({
    destination: './public/uploads/',
    filename: function(req, file, cb){
        cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
    }
});

// Init upload
const upload = multer({
    storage: storage,
    limits:{fileSize: 1000000},
}).single('profilePic');

app.post('/editprofile', (req, res) => {
    upload(req, res, (err) => {
        if(err){
            res.render('editprofile', {
                msg: err
            });
        } else {
            if(req.file == undefined){
                res.render('editprofile', {
                    msg: 'Error: No File Selected!'
                });
            } else {
                res.render('editprofile', {
                    msg: 'File Uploaded!',
                    file: `uploads/${req.file.filename}`
                });
            }
        }
    });
});

module.exports = router;
