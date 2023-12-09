const UserStorage = require("./UserStorage");

class User {
    constructor(body) {
        this.body = body;
    }

    login() {
        const body = this.body;
        const { id, password } = UserStorage.getUserInfo(body.id);

        if (id) {
        if (id === body.id && password === body.password) {
            return { success: true };
        }
        return { success: false, msg: "로그인에 실패하셨습니다." };
    }
    return { success: false, msg: "존재하지 않는 아이디입니다." };
    }
}



module.exports = User;