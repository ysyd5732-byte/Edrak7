const ADMIN_API = "/api/admin";

let adminEmail = "";
let adminPassword = "";


/* =========================
   HELPERS
========================= */

function escapeHTML(value) {

    if (value === null || value === undefined) {
        return "";
    }

    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


function adminHeaders() {

    return {
        "Content-Type": "application/json",

        "x-admin-email": adminEmail,

        "x-admin-password": adminPassword
    };
}


/* =========================
   LOGIN
========================= */

document
    .getElementById("adminLoginForm")
    .addEventListener("submit", async function (event) {

        event.preventDefault();

        const email =
            document.getElementById("adminEmail").value.trim();

        const password =
            document.getElementById("adminPassword").value;

        const error =
            document.getElementById("loginError");

        error.textContent = "";

        try {

            const response = await fetch(
                `${ADMIN_API}/stats`,
                {
                    headers: {
                        "x-admin-email": email,
                        "x-admin-password": password
                    }
                }
            );

            const data = await response.json();

            if (!response.ok) {

                throw new Error(
                    data.error || "بيانات الدخول غير صحيحة"
                );

            }

            adminEmail = email;

            adminPassword = password;

            sessionStorage.setItem(
                "edrak_admin_email",
                email
            );

            sessionStorage.setItem(
                "edrak_admin_password",
                password
            );

            showAdmin();

            loadEverything();

        } catch (err) {

            error.textContent =
                "❌ " + err.message;

        }

    });


/* =========================
   SHOW ADMIN
========================= */

function showAdmin() {

    document
        .getElementById("loginScreen")
        .classList.add("hidden");

    document
        .getElementById("adminApp")
        .classList.remove("hidden");

}


/* =========================
   AUTO LOGIN
========================= */

window.addEventListener("DOMContentLoaded", () => {

    const savedEmail =
        sessionStorage.getItem(
            "edrak_admin_email"
        );

    const savedPassword =
        sessionStorage.getItem(
            "edrak_admin_password"
        );

    if (savedEmail && savedPassword) {

        adminEmail = savedEmail;

        adminPassword = savedPassword;

        checkAdmin();

    }

});


async function checkAdmin() {

    try {

        const response = await fetch(
            `${ADMIN_API}/stats`,
            {
                headers: adminHeaders()
            }
        );

        if (!response.ok) {

            logoutAdmin();

            return;

        }

        showAdmin();

        loadEverything();

    } catch {

        logoutAdmin();

    }

}


/* =========================
   LOAD EVERYTHING
========================= */

async function loadEverything() {

    await Promise.all([
        loadStats(),
        loadUsers(),
        loadChats()
    ]);

}


/* =========================
   STATS
========================= */

async function loadStats() {

    try {

        const response = await fetch(
            `${ADMIN_API}/stats`,
            {
                headers: adminHeaders()
            }
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error);
        }

        document.getElementById("usersCount")
            .textContent =
            data.users ?? 0;

        document.getElementById("chatsCount")
            .textContent =
            data.chats ?? 0;

        document.getElementById("messagesCount")
            .textContent =
            data.messages ?? 0;

    } catch (error) {

        console.error(error);

    }

}


/* =========================
   USERS
========================= */

async function loadUsers() {

    const table =
        document.getElementById("usersTable");

    table.innerHTML = `
        <tr>
            <td colspan="5" class="loading">
                جاري تحميل المستخدمين...
            </td>
        </tr>
    `;

    try {

        const response = await fetch(
            `${ADMIN_API}/users`,
            {
                headers: adminHeaders()
            }
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error);
        }

        const users = data.users || [];

        if (!users.length) {

            table.innerHTML = `
                <tr>
                    <td colspan="5" class="empty">
                        لا يوجد مستخدمين.
                    </td>
                </tr>
            `;

            return;

        }

        table.innerHTML = users.map(user => {

            const name =
                user.name ||
                user.username ||
                "مستخدم";

            const email =
                user.email ||
                "بدون بريد";

            const date =
                user.created_at ||
                user.createdAt ||
                "غير معروف";

            return `
                <tr>

                    <td>
                        #${user.id}
                    </td>

                    <td>
                        ${escapeHTML(name)}
                    </td>

                    <td>
                        ${escapeHTML(email)}
                    </td>

                    <td>
                        ${escapeHTML(date)}
                    </td>

                    <td>

                        <button
                            class="delete-btn"
                            onclick="deleteUser(${user.id})"
                        >
                            🗑️ حذف الحساب
                        </button>

                    </td>

                </tr>
            `;

        }).join("");

        renderRecentUsers(users);

    } catch (error) {

        table.innerHTML = `
            <tr>
                <td colspan="5" class="empty">
                    ❌ ${escapeHTML(error.message)}
                </td>
            </tr>
        `;

    }

}


/* =========================
   DELETE USER
========================= */

async function deleteUser(userId) {

    const confirmed = confirm(
        "⚠️ هل أنت متأكد من حذف هذا الحساب؟\n\n" +
        "سيتم حذف الحساب وكل المحادثات والرسائل الخاصة به."
    );

    if (!confirmed) {
        return;
    }

    try {

        const response = await fetch(
            `${ADMIN_API}/users/${userId}`,
            {
                method: "DELETE",
                headers: adminHeaders()
            }
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error);
        }

        alert("✅ تم حذف الحساب بنجاح");

        loadEverything();

    } catch (error) {

        alert(
            "❌ فشل حذف الحساب\n\n" +
            error.message
        );

    }

}


/* =========================
   CHATS
========================= */

async function loadChats() {

    const container =
        document.getElementById(
            "chatsContainer"
        );

    container.innerHTML = `
        <div class="loading">
            جاري تحميل المحادثات...
        </div>
    `;

    try {

        const response = await fetch(
            `${ADMIN_API}/chats`,
            {
                headers: adminHeaders()
            }
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error);
        }

        const chats = data.chats || [];

        if (!chats.length) {

            container.innerHTML = `
                <div class="empty">
                    لا توجد محادثات.
                </div>
            `;

            return;

        }

        container.innerHTML =
            chats.map(chat => {

                const title =
                    chat.title ||
                    "محادثة جديدة";

                const email =
                    chat.user_email ||
                    chat.email ||
                    "مستخدم غير معروف";

                const date =
                    chat.created_at ||
                    chat.createdAt ||
                    "";

                return `
                    <div class="chat-card">

                        <div class="chat-info">

                            <div class="chat-icon">
                                💬
                            </div>

                            <div>

                                <h3>
                                    ${escapeHTML(title)}
                                </h3>

                                <p>
                                    👤
                                    ${escapeHTML(email)}
                                </p>

                                ${
                                    date
                                    ? `
                                    <p>
                                        🕒
                                        ${escapeHTML(date)}
                                    </p>
                                    `
                                    : ""
                                }

                            </div>

                        </div>


                        <div class="chat-actions">

                            <button
                                class="view-btn"
                                onclick="viewChat(${chat.id})"
                            >
                                👁️ عرض الرسائل
                            </button>

                            <button
                                class="delete-btn"
                                onclick="deleteChat(${chat.id})"
                            >
                                🗑️ حذف
                            </button>

                        </div>

                    </div>
                `;

            }).join("");

        renderRecentChats(chats);

    } catch (error) {

        container.innerHTML = `
            <div class="empty">
                ❌ ${escapeHTML(error.message)}
            </div>
        `;

    }

}


/* =========================
   VIEW CHAT
========================= */

async function viewChat(chatId) {

    const modal =
        document.getElementById(
            "messagesModal"
        );

    const messages =
        document.getElementById(
            "modalMessages"
        );

    modal.classList.add("show");

    messages.innerHTML = `
        <div class="loading">
            جاري تحميل الرسائل...
        </div>
    `;

    try {

        const response = await fetch(
            `${ADMIN_API}/chats/${chatId}/messages`,
            {
                headers: adminHeaders()
            }
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error);
        }

        const chat =
            data.chat || {};

        document.getElementById(
            "modalTitle"
        ).textContent =
            chat.title || "المحادثة";

        document.getElementById(
            "modalUser"
        ).textContent =
            chat.user_email ||
            chat.email ||
            "مستخدم غير معروف";


        const list =
            data.messages || [];


        if (!list.length) {

            messages.innerHTML = `
                <div class="empty">
                    لا توجد رسائل.
                </div>
            `;

            return;

        }


        messages.innerHTML =
            list.map(message => {

                const role =
                    message.role === "user"
                        ? "user"
                        : "assistant";

                const roleName =
                    role === "user"
                        ? "👤 المستخدم"
                        : "🤖 Edrak AI";

                return `
                    <div
                        class="message ${role}"
                    >

                        <div class="message-role">
                            ${roleName}
                        </div>

                        <div class="message-content">
                            ${escapeHTML(
                                message.content ||
                                message.message ||
                                ""
                            )}
                        </div>

                        ${
                            message.created_at
                            ? `
                            <div class="message-date">
                                ${escapeHTML(
                                    message.created_at
                                )}
                            </div>
                            `
                            : ""
                        }

                    </div>
                `;

            }).join("");


        messages.scrollTop =
            messages.scrollHeight;

    } catch (error) {

        messages.innerHTML = `
            <div class="empty">
                ❌ ${escapeHTML(error.message)}
            </div>
        `;

    }

}


/* =========================
   DELETE CHAT
========================= */

async function deleteChat(chatId) {

    if (
        !confirm(
            "هل أنت متأكد من حذف المحادثة؟"
        )
    ) {

        return;

    }

    try {

        const response = await fetch(
            `${ADMIN_API}/chats/${chatId}`,
            {
                method: "DELETE",
                headers: adminHeaders()
            }
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error);
        }

        alert(
            "✅ تم حذف المحادثة"
        );

        loadStats();

        loadChats();

    } catch (error) {

        alert(
            "❌ " +
            error.message
        );

    }

}


/* =========================
   RECENT USERS
========================= */

function renderRecentUsers(users) {

    const container =
        document.getElementById(
            "recentUsers"
        );

    const recent =
        users.slice(0, 5);

    if (!recent.length) {

        container.innerHTML =
            "لا يوجد مستخدمين.";

        return;

    }

    container.innerHTML =
        recent.map(user => {

            return `
                <div class="chat-card">

                    <div class="chat-info">

                        <div class="chat-icon">
                            👤
                        </div>

                        <div>

                            <h3>
                                ${escapeHTML(
                                    user.name ||
                                    user.username ||
                                    "مستخدم"
                                )}
                            </h3>

                            <p>
                                ${escapeHTML(
                                    user.email ||
                                    ""
                                )}
                            </p>

                        </div>

                    </div>

                </div>
            `;

        }).join("");

}


/* =========================
   RECENT CHATS
========================= */

function renderRecentChats(chats) {

    const container =
        document.getElementById(
            "recentChats"
        );

    const recent =
        chats.slice(0, 5);

    if (!recent.length) {

        container.innerHTML =
            "لا توجد محادثات.";

        return;

    }

    container.innerHTML =
        recent.map(chat => {

            return `
                <div class="chat-card">

                    <div class="chat-info">

                        <div class="chat-icon">
                            💬
                        </div>

                        <div>

                            <h3>
                                ${escapeHTML(
                                    chat.title ||
                                    "محادثة"
                                )}
                            </h3>

                            <p>
                                ${escapeHTML(
                                    chat.user_email ||
                                    "مستخدم"
                                )}
                            </p>

                        </div>

                    </div>

                    <button
                        class="view-btn"
                        onclick="viewChat(${chat.id})"
                    >
                        👁️ مشاهدة
                    </button>

                </div>
            `;

        }).join("");

}


/* =========================
   NAVIGATION
========================= */

document
    .querySelectorAll(".nav-item")
    .forEach(button => {

        button.addEventListener(
            "click",
            () => {

                showSection(
                    button.dataset.section
                );

            }
        );

    });


function showSection(section) {

    document
        .querySelectorAll(".section")
        .forEach(item => {

            item.classList.remove(
                "active"
            );

        });


    document
        .querySelectorAll(".nav-item")
        .forEach(item => {

            item.classList.remove(
                "active"
            );

        });


    const sectionElement =
        document.getElementById(
            section + "Section"
        );

    if (sectionElement) {

        sectionElement.classList.add(
            "active"
        );

    }


    const button =
        document.querySelector(
            `[data-section="${section}"]`
        );

    if (button) {

        button.classList.add(
            "active"
        );

    }


    const titles = {

        dashboard:
            "لوحة التحكم",

        users:
            "المستخدمين",

        chats:
            "المحادثات"

    };


    document.getElementById(
        "pageTitle"
    ).textContent =
        titles[section] ||
        "لوحة التحكم";

}


/* =========================
   REFRESH
========================= */

document
    .getElementById("refreshBtn")
    .addEventListener(
        "click",
        loadEverything
    );


/* =========================
   LOGOUT
========================= */

document
    .getElementById("logoutBtn")
    .addEventListener(
        "click",
        logoutAdmin
    );


function logoutAdmin() {

    adminEmail = "";

    adminPassword = "";

    sessionStorage.removeItem(
        "edrak_admin_email"
    );

    sessionStorage.removeItem(
        "edrak_admin_password"
    );

    document
        .getElementById("adminApp")
        .classList.add("hidden");

    document
        .getElementById("loginScreen")
        .classList.remove("hidden");

}


/* =========================
   CLOSE MODAL
========================= */

document
    .getElementById("closeModal")
    .addEventListener(
        "click",
        closeModal
    );


document
    .getElementById("messagesModal")
    .addEventListener(
        "click",
        function(event) {

            if (
                event.target ===
                this
            ) {

                closeModal();

            }

        }
    );


function closeModal() {

    document
        .getElementById(
            "messagesModal"
        )
        .classList.remove(
            "show"
        );

}