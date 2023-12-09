

const id = document.querySelector("#id");
const password = document.querySelector("#password");
const btn = document.querySelector("#btn");

btn.addEventListener('click', login);

function login() {
    const req = {
        id: id.value,
        password: password.value,
    };

    fetch('/', {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(req),
    })
    .then((res) => (res.json()))
    .then((res) => {
        if(res.success){
            location.href = "/main";
        } else {
            alert(res.msg);
        }
    })
    .catch((err) => {
        console.error("로그인 중 에러 발생");
    });
};