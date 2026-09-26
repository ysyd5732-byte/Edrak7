const API = "/api";

function $(id) {
    return document.getElementById(id);
}

/* LOGIN */

const loginForm =
    $("loginForm");

if (loginForm) {

    loginForm.addEventListener(
        "submit",
        async event => {

            event.preventDefault();

            const email =
                $("email").value.trim();

            const password =
                $("password").value;

            $("error").textContent =
                "جاري تسجيل الدخول...";

            try {

                const response =
                    await fetch(
                        API + "/login",
                        {
                            method: "POST",

                            headers: {
                                "Content-Type":
                                    "application/json"
                            },

                            body:
                                JSON.stringify({
                                    email,
                                    password
                                })
                        }
                    );

                const data =
                    await response.json();

                if (!response.ok) {
                    throw new Error(
                        data.error ||
                        "فشل تسجيل الدخول"
                    );
                }

                localStorage.setItem(
                    "edrak_token",
                    data.token
                );

                localStorage.setItem(
                    "edrak_user",
                    JSON.stringify(
                        data.user
                    )
                );

                window.location.href =
                    "index.html";

            } catch(error) {

                $("error")
                    .textContent =
                    error.message;
            }
        }
    );
}

/* REGISTER */

const registerForm =
    $("registerForm");

if (registerForm) {

    registerForm.addEventListener(
        "submit",
        async event => {

            event.preventDefault();

            const name =
                $("name").value.trim();

            const email =
                $("email").value.trim();

            const password =
                $("password").value;

            $("error").textContent =
                "جاري إنشاء الحساب...";

            try {

                const response =
                    await fetch(
                        API + "/register",
                        {
                            method: "POST",

                            headers: {
                                "Content-Type":
                                    "application/json"
                            },

                            body:
                                JSON.stringify({
                                    name,
                                    email,
                                    password
                                })
                        }
                    );

                const data =
                    await response.json();

                if (!response.ok) {
                    throw new Error(
                        data.error ||
                        "فشل إنشاء الحساب"
                    );
                }

                localStorage.setItem(
                    "edrak_token",
                    data.token
                );

                localStorage.setItem(
                    "edrak_user",
                    JSON.stringify(
                        data.user
                    )
                );

                window.location.href =
                    "index.html";

            } catch(error) {

                $("error")
                    .textContent =
                    error.message;
            }
        }
    );
}