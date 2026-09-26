const API = "/api";

let currentChatId = null;
let currentMessages = [];
let allChats = [];

const token = localStorage.getItem("edrak_token");


/* =====================================================
   HELPERS
===================================================== */

function $(id) {
    return document.getElementById(id);
}


function escapeHTML(text) {

    const div = document.createElement("div");

    div.textContent = text ?? "";

    return div.innerHTML;
}


function formatText(text) {

    return escapeHTML(text)
        .replace(/\n/g, "<br>");
}


/* =====================================================
   AUTH
===================================================== */

if (!token) {

    window.location.href = "login.html";

}


/* =====================================================
   API
===================================================== */

async function api(url, options = {}) {

    const headers = {

        "Content-Type": "application/json",

        ...(options.headers || {})

    };


    headers.Authorization =
        `Bearer ${token}`;


    const response =
        await fetch(
            API + url,
            {
                ...options,
                headers
            }
        );


    const data =
        await response
            .json()
            .catch(() => ({}));


    if (response.status === 401) {

        logout();

        throw new Error(
            "انتهت جلسة تسجيل الدخول"
        );

    }


    if (!response.ok) {

        throw new Error(
            data.error ||
            "حدث خطأ في السيرفر"
        );

    }


    return data;

}


/* =====================================================
   USER
===================================================== */

async function loadUser() {

    try {

        const data =
            await api("/me");


        const user =
            data.user;


        $("userName").textContent =
            user.name;


        $("avatar").textContent =
            user.name
                .charAt(0)
                .toUpperCase();


        $("modalUserName").textContent =
            user.name;


        $("modalUserEmail").textContent =
            user.email;


        localStorage.setItem(
            "edrak_user",
            JSON.stringify(user)
        );


    } catch (error) {

        console.error(error);

    }

}


/* =====================================================
   CHATS
===================================================== */

async function loadChats() {

    try {

        const data =
            await api("/chats");


        allChats =
            data.chats || [];


        renderChatList();


    } catch (error) {

        console.error(
            "Chats:",
            error
        );

    }

}


function renderChatList() {

    const list =
        $("chatList");


    list.innerHTML = "";


    if (!allChats.length) {

        list.innerHTML = `
            <div
                style="
                    opacity:.5;
                    text-align:center;
                    padding:20px;
                    font-size:13px;
                "
            >
                لا توجد محادثات بعد
            </div>
        `;

        return;

    }


    allChats.forEach(chat => {

        const item =
            document.createElement("div");


        item.className =
            "chat-item";


        if (
            Number(chat.id) ===
            Number(currentChatId)
        ) {

            item.classList.add("active");

        }


        item.innerHTML = `

            <span
                class="chat-title"
            >
                ${escapeHTML(chat.title)}
            </span>

            <span
                class="chat-actions"
            >

                <button
                    class="chat-edit"
                    title="تعديل"
                >
                    ✎
                </button>

                <button
                    class="chat-delete"
                    title="حذف"
                >
                    ×
                </button>

            </span>

        `;


        item.addEventListener(
            "click",
            () => openChat(chat.id)
        );


        const editBtn =
            item.querySelector(
                ".chat-edit"
            );


        const deleteBtn =
            item.querySelector(
                ".chat-delete"
            );


        editBtn.addEventListener(
            "click",
            event => {

                event.stopPropagation();

                renameChat(chat);

            }
        );


        deleteBtn.addEventListener(
            "click",
            event => {

                event.stopPropagation();

                deleteChat(chat.id);

            }
        );


        list.appendChild(item);

    });

}


/* =====================================================
   CREATE CHAT
===================================================== */

async function createChat() {

    try {

        const data =
            await api(
                "/chats",
                {
                    method: "POST",

                    body: JSON.stringify({

                        title:
                            "محادثة جديدة"

                    })
                }
            );


        currentChatId =
            data.chat.id;


        currentMessages = [];


        $("messages").innerHTML = "";


        $("welcome").style.display =
            "none";


        $("messages")
            .classList.add("active");


        await loadChats();


        closeSidebarOnMobile();


        return true;


    } catch (error) {

        alert(error.message);

        return false;

    }

}


/* =====================================================
   OPEN CHAT
===================================================== */

async function openChat(id) {

    try {

        const data =
            await api(
                `/chats/${id}`
            );


        currentChatId =
            id;


        currentMessages =
            data.messages || [];


        $("welcome").style.display =
            "none";


        const messages =
            $("messages");


        messages.innerHTML = "";


        currentMessages.forEach(
            message => {

                renderMessage(
                    message.role,
                    message.content,
                    false
                );

            }
        );


        messages.classList.add(
            "active"
        );


        renderChatList();


        scrollMessagesToBottom();


        closeSidebarOnMobile();


    } catch (error) {

        alert(error.message);

    }

}


/* =====================================================
   NEW CHAT BUTTON
===================================================== */

async function newChat() {

    currentChatId = null;

    currentMessages = [];


    $("messages").innerHTML = "";


    $("welcome").style.display =
        "";


    $("messages")
        .classList.remove(
            "active"
        );


    renderChatList();


    $("messageInput").focus();

}


/* =====================================================
   SHOW CHAT
===================================================== */

function showChat() {

    $("welcome").style.display =
        "none";


    $("messages")
        .classList.add(
            "active"
        );

}


/* =====================================================
   RENDER MESSAGE
===================================================== */

function renderMessage(
    role,
    content,
    scroll = true
) {

    const wrapper =
        document.createElement("div");


    wrapper.className =
        `message ${
            role === "user"
                ? "user"
                : "ai"
        }`;


    const avatar =
        role === "user"
            ? (
                $("avatar")?.textContent ||
                "Y"
            )
            : "E";


    const name =
        role === "user"
            ? "أنت"
            : "Edrak";


    wrapper.innerHTML = `

        <div class="message-avatar">
            ${escapeHTML(avatar)}
        </div>

        <div class="message-body">

            <div class="message-name">
                ${name}
            </div>

            <div class="message-content">
                ${formatText(content)}
            </div>

        </div>

    `;


    $("messages")
        .appendChild(wrapper);


    if (scroll) {

        scrollMessagesToBottom();

    }

}


function scrollMessagesToBottom() {

    const messages =
        $("messages");


    if (!messages) return;


    requestAnimationFrame(() => {

        messages.scrollTo({

            top:
                messages.scrollHeight,

            behavior:
                "smooth"

        });

    });

}


/* =====================================================
   SEND MESSAGE
===================================================== */

async function sendMessage() {

    const input =
        $("messageInput");


    const message =
        input.value.trim();


    if (!message) {

        return;

    }


    /* إنشاء شات تلقائي */

    if (!currentChatId) {

        const created =
            await createChat();


        if (!created) {

            return;

        }

    }


    input.value = "";

    autoResizeInput();


    showChat();


    /* رسالة المستخدم */

    renderMessage(
        "user",
        message
    );


    currentMessages.push({

        role: "user",

        content: message

    });


    try {

        /* حفظ رسالة المستخدم */

        await api(
            `/chats/${currentChatId}/messages`,
            {

                method: "POST",

                body:
                    JSON.stringify({

                        role:
                            "user",

                        content:
                            message

                    })

            }
        );


        /* Typing */

        const typing =
            document.createElement("div");


        typing.className =
            "message ai";


        typing.id =
            "typingMessage";


        typing.innerHTML = `

            <div class="message-avatar">
                E
            </div>

            <div class="message-body">

                <div class="message-name">
                    Edrak
                </div>

                <div class="typing">
                    Edrak بيكتب...
                </div>

            </div>

        `;


        $("messages")
            .appendChild(typing);


        scrollMessagesToBottom();


        /* AI */

        const data =
            await api(
                "/chat",
                {

                    method: "POST",

                    body:
                        JSON.stringify({

                            message,

                            history:
                                currentMessages

                        })

                }
            );


        typing.remove();


        const answer =
            data.answer ||
            "معرفتش أجيب رد دلوقتي.";


        renderMessage(
            "assistant",
            answer
        );


        currentMessages.push({

            role:
                "assistant",

            content:
                answer

        });


        /* حفظ رد AI */

        await api(
            `/chats/${currentChatId}/messages`,
            {

                method: "POST",

                body:
                    JSON.stringify({

                        role:
                            "assistant",

                        content:
                            answer

                    })

            }
        );


        await loadChats();


    } catch (error) {

        const typing =
            $("typingMessage");


        if (typing) {

            typing.remove();

        }


        renderMessage(
            "assistant",
            "حصلت مشكلة: " +
            error.message
        );

    }

}


/* =====================================================
   RENAME CHAT
===================================================== */

async function renameChat(chat) {

    const newTitle =
        prompt(
            "اكتب اسم المحادثة الجديد:",
            chat.title
        );


    if (
        newTitle === null ||
        !newTitle.trim()
    ) {

        return;

    }


    try {

        await api(
            `/chats/${chat.id}`,
            {

                method: "PATCH",

                body:
                    JSON.stringify({

                        title:
                            newTitle.trim()

                    })

            }
        );


        await loadChats();


    } catch (error) {

        alert(error.message);

    }

}


/* =====================================================
   DELETE CHAT
===================================================== */

async function deleteChat(id) {

    const confirmed =
        confirm(
            "هل تريد حذف هذه المحادثة؟"
        );


    if (!confirmed) {

        return;

    }


    try {

        await api(
            `/chats/${id}`,
            {
                method: "DELETE"
            }
        );


        if (
            Number(currentChatId) ===
            Number(id)
        ) {

            currentChatId = null;

            currentMessages = [];


            $("messages").innerHTML = "";


            $("welcome").style.display =
                "";


            $("messages")
                .classList.remove(
                    "active"
                );

        }


        await loadChats();


    } catch (error) {

        alert(error.message);

    }

}


/* =====================================================
   PRO
===================================================== */

function openPro() {

    $("proModal")
        .classList.remove(
            "hidden"
        );

}


function closeModal(id) {

    const modal =
        $(id);


    if (modal) {

        modal.classList.add(
            "hidden"
        );

    }

}


/* =====================================================
   PRO BUTTON
===================================================== */

$("proBtn")
    .addEventListener(
        "click",
        openPro
    );


$("proSubscribe")
    .addEventListener(
        "click",
        () => {

            alert(
                "الاشتراك في Edrak PRO سيتم تفعيله قريباً 🚀"
            );

        }
    );


/* =====================================================
   PROFILE
===================================================== */

$("profileBtn")
    .addEventListener(
        "click",
        () => {

            $("profileModal")
                .classList.remove(
                    "hidden"
                );

        }
    );


$("avatar")
    .addEventListener(
        "click",
        () => {

            $("profileModal")
                .classList.remove(
                    "hidden"
                );

        }
    );


/* =====================================================
   SETTINGS
===================================================== */

$("settingsBtn")
    .addEventListener(
        "click",
        () => {

            $("settingsModal")
                .classList.remove(
                    "hidden"
                );

        }
    );


/* =====================================================
   CLOSE MODALS
===================================================== */

document
    .querySelectorAll(
        "[data-close]"
    )
    .forEach(button => {

        button.addEventListener(
            "click",
            () => {

                closeModal(
                    button.dataset.close
                );

            }
        );

    });


/* الضغط خارج النافذة */

document
    .querySelectorAll(".modal")
    .forEach(modal => {

        modal.addEventListener(
            "click",
            event => {

                if (
                    event.target ===
                    modal
                ) {

                    modal.classList.add(
                        "hidden"
                    );

                }

            }
        );

    });


/* =====================================================
   SEARCH
===================================================== */

$("searchBtn")
    .addEventListener(
        "click",
        () => {

            $("searchModal")
                .classList.remove(
                    "hidden"
                );


            $("searchInput").value =
                "";


            $("searchResults")
                .innerHTML =
                "<div style='opacity:.6'>اكتب للبحث...</div>";


            $("searchInput")
                .focus();

        }
    );


$("searchInput")
    .addEventListener(
        "input",
        function () {

            const query =
                this.value
                    .trim()
                    .toLowerCase();


            const results =
                $("searchResults");


            if (!query) {

                results.innerHTML =
                    "<div style='opacity:.6'>اكتب للبحث...</div>";

                return;

            }


            const filtered =
                allChats.filter(
                    chat =>
                        chat.title
                            .toLowerCase()
                            .includes(query)
                );


            if (!filtered.length) {

                results.innerHTML =
                    "<div style='opacity:.6'>مفيش محادثات مطابقة.</div>";

                return;

            }


            results.innerHTML =
                "";


            filtered.forEach(chat => {

                const item =
                    document.createElement(
                        "button"
                    );


                item.style.cssText = `
                    width:100%;
                    text-align:right;
                    padding:12px;
                    margin-bottom:8px;
                    border:0;
                    border-radius:12px;
                    cursor:pointer;
                    font-family:inherit;
                `;


                item.textContent =
                    chat.title;


                item.addEventListener(
                    "click",
                    () => {

                        closeModal(
                            "searchModal"
                        );

                        openChat(
                            chat.id
                        );

                    }
                );


                results.appendChild(
                    item
                );

            });

        }
    );


/* =====================================================
   QUICK PROMPTS
===================================================== */

document
    .querySelectorAll(
        ".quick-card"
    )
    .forEach(card => {

        card.addEventListener(
            "click",
            () => {

                $("messageInput").value =
                    card.dataset.prompt;


                autoResizeInput();


                $("messageInput")
                    .focus();

            }
        );

    });


/* =====================================================
   SEND BUTTON
===================================================== */

$("sendBtn")
    .addEventListener(
        "click",
        sendMessage
    );


/* =====================================================
   ENTER TO SEND
===================================================== */

$("messageInput")
    .addEventListener(
        "keydown",
        event => {

            if (
                event.key === "Enter" &&
                !event.shiftKey
            ) {

                event.preventDefault();

                sendMessage();

            }

        }
    );


/* =====================================================
   AUTO RESIZE TEXTAREA
===================================================== */

$("messageInput")
    .addEventListener(
        "input",
        autoResizeInput
    );


function autoResizeInput() {

    const input =
        $("messageInput");


    input.style.height =
        "auto";


    input.style.height =
        Math.min(
            input.scrollHeight,
            140
        ) + "px";

}


/* =====================================================
   NEW CHAT
===================================================== */

$("newChatBtn")
    .addEventListener(
        "click",
        newChat
    );


/* =====================================================
   LOGOUT
===================================================== */

$("logoutBtn")
    .addEventListener(
        "click",
        logout
    );


function logout() {

    localStorage.removeItem(
        "edrak_token"
    );


    localStorage.removeItem(
        "edrak_user"
    );


    window.location.href =
        "login.html";

}


/* =====================================================
   MOBILE MENU
===================================================== */

$("mobileMenu")
    .addEventListener(
        "click",
        () => {

            $("sidebar")
                .classList.toggle(
                    "open"
                );

        }
    );


function closeSidebarOnMobile() {

    if (
        window.innerWidth <= 900
    ) {

        $("sidebar")
            .classList.remove(
                "open"
            );

    }

}


/* =====================================================
   ATTACHMENT
===================================================== */

$("attachBtn")
    .addEventListener(
        "click",
        () => {

            $("fileInput").click();

        }
    );


$("fileInput")
    .addEventListener(
        "change",
        event => {

            const file =
                event.target.files[0];


            if (!file) {

                return;

            }


            const allowed =
                [
                    "image/",
                    "text/"
                ];


            const isAllowed =
                allowed.some(
                    type =>
                        file.type.startsWith(
                            type
                        )
                );


            if (!isAllowed) {

                alert(
                    "نوع الملف ده مش مدعوم حالياً."
                );

                event.target.value =
                    "";

                return;

            }


            $("messageInput").value +=
                `\n[ملف مرفق: ${file.name}]`;


            $("messageInput").focus();

        }
    );


/* =====================================================
   VOICE
===================================================== */

let recognition = null;


$("voiceBtn")
    .addEventListener(
        "click",
        startVoice
    );


function startVoice() {

    const SpeechRecognition =
        window.SpeechRecognition ||
        window.webkitSpeechRecognition;


    if (!SpeechRecognition) {

        alert(
            "المتصفح بتاعك لا يدعم التعرف على الصوت."
        );

        return;

    }


    if (recognition) {

        recognition.stop();

        recognition = null;

        return;

    }


    recognition =
        new SpeechRecognition();


    recognition.lang =
        "ar-EG";


    recognition.interimResults =
        false;


    recognition.continuous =
        false;


    recognition.onstart =
        () => {

            $("voiceBtn").textContent =
                "🔴";

        };


    recognition.onresult =
        event => {

            const text =
                event
                    .results[0][0]
                    .transcript;


            $("messageInput").value +=
                text;


            autoResizeInput();

        };


    recognition.onerror =
        error => {

            console.error(
                "Voice:",
                error
            );

        };


    recognition.onend =
        () => {

            $("voiceBtn").textContent =
                "🎙";


            recognition =
                null;

        };


    recognition.start();

}


/* =====================================================
   ESC KEY
===================================================== */

document.addEventListener(
    "keydown",
    event => {

        if (
            event.key === "Escape"
        ) {

            document
                .querySelectorAll(
                    ".modal"
                )
                .forEach(modal => {

                    modal.classList.add(
                        "hidden"
                    );

                });

        }

    }
);


/* =====================================================
   INITIALIZE
===================================================== */

async function init() {

    await loadUser();

    await loadChats();

    $("messageInput").focus();

}


init();