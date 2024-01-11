const collection = require('../models/user');



function checkUser(req, res, next) {
    const userEmail = req.session.email;
    if (userEmail) {
        next(); 
    } else {
        res.redirect('/'); 
    }
}



async function checkAdmin(req, res, next) {
    const userEmail = req.session.email;
    if (!userEmail) {
        return res.redirect('/');
    }
    try {
        const userInfo = await collection.findOne({ email: userEmail });
        if (userInfo && userInfo.role === "admin") {
            next();
        } else {
            res.redirect('/');
        }
    } catch (error) {
        console.error(error);
        res.redirect('/');
    }
}


module.exports = {checkUser, checkAdmin};