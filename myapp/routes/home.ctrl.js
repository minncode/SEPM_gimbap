
const UserStorage = require("../public/javascripts/UserStorage");

const output = {
    login: (req, res) => {
        res.render("login");
    },
    register: (req, res) => {
        res.render("register");
    },
    main: (req, res) => {
        res.render("main");
    },
    profile: (req, res) => {
        res.render("profile");
    },
};

const process = {
    login: (req, res) => {
        const user = new User(req.body);
        const response = user.login();

        return res.json(response);
    },
};


module.exports = {
    output,
    process,
};