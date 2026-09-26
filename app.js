"use strict";

/* =========================================================
   EDRAK AI - APP.JS
   Frontend: GitHub Pages / Netlify
   Backend: Render
   ========================================================= */

/*
  مهم:
  غيّر الرابط ده إلى رابط Render الخاص بـ server.js

  مثال:
  https://edrak-api.onrender.com

  لا تضع هنا:
  https://ysyd5732-byte.github.io/Edrak7/

  لأن ده رابط الواجهة فقط.
*/

const API_URL =
    window.EDRAK_API_URL ||
    "https://YOUR-RENDER-URL.onrender.com";


/* =========================================================
   STORAGE
   ========================================================= */

const TOKEN_KEY = "edrak_token";
const USER_KEY = "edrak_user";
const CHAT_KEY = "edrak_current_chat";
const API_KEY_STORAGE = "edrak_api_url";


/* =========================================================
   GLOBAL STATE
   ========================================================= */

let currentUser = null;
let chats = [];
let currentChatId = null;
let currentMessages = [];
let isSending = false;


/* =========================================================
   DOM HELPERS
   ========================================================= */

function $(...selectors) {
    for (const selector of selectors) {
        const element = document.querySelector(selector);

        if (element) {
            return element;
        }
    }

    return null;
}

function $all(...selectors) {
    for (const selector of selectors) {
        const elements =
            document.querySelectorAll(selector);

        if (elements.length) {
            return [...elements];
        }
    }

    return [];
}


/* =========================================================
   API URL
   ========================================================= */

function getApiBaseUrl() {

    const saved =
        localStorage.getItem(API_KEY_STORAGE);

    if (saved && saved.trim()) {
        return saved.trim().replace(/\/+$/, "");
    }

    return String(API_URL || "")
        .trim()
        .replace(/\/+$/, "");
}


/* =========================================================
   TOKEN
   ========================================================= */

function getToken() {
    return localStorage.getItem(TOKEN_KEY);
}

function saveToken(token) {

    if (!token) {
        return;
    }

    localStorage.setItem(
        TOKEN_KEY,
        token
    );
}

function logoutUser() {

    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(CHAT_KEY);

    currentUser = null;
    chats = [];
    currentChatId = null;
    currentMessages = [];

    location.href = "login.html";
}


/* =========================================================
   API REQUEST
   ========================================================= */

async function apiFetch(endpoint, options = {}) {

    const baseURL =
        getApiBaseUrl();

    if (
        !baseURL ||
        baseURL.includes("YOUR-RENDER-URL")
    ) {

        throw new Error(
            "ضع رابط Render الخاص بالسيرفر في بداية app.js"
        );
    }

    const token =
        getToken();

    const headers = {
        ...(options.headers || {})
    };

    if (
        options.body &&
        typeof options.body === "string" &&
        !headers["Content-Type"]
    ) {

        headers["Content-Type"] =
            "application/json";
    }

    if (token) {

        headers["Authorization"] =
            `Bearer ${token}`;
    }

    let response;

    try {

        response =
            await fetch(
                `${baseURL}${endpoint}`,
                {
                    ...options,
                    headers
                }
            );

    } catch (error) {

        console.error(
            "NETWORK ERROR:",
            error
        );

        throw new Error(
            "مش قادر أوصل للسيرفر. تأكد إن Render شغال والرابط صحيح."
        );
    }

    const rawText =
        await response.text();

    let data;

    try {

        data =
            rawText
                ? JSON.parse(rawText)
                : {};

    } catch (error) {

        console.error(
            "INVALID JSON:",
            rawText
        );

        if (
            rawText.includes("<html") ||
            rawText.includes("<HTML") ||
            rawText.includes("<!DOCTYPE")
        ) {

            throw new Error(
                "السيرفر رجّع HTML بدل JSON. تأكد إن API_URL هو رابط Render وليس رابط GitHub Pages."
            );
        }

        throw new Error(
            "رد السيرفر غير صالح."
        );
    }

    if (!response.ok) {

        if (
            response.status === 401
        ) {

            localStorage.removeItem(
                TOKEN_KEY
            );

            localStorage.removeItem(
                USER_KEY
            );

            if (
                !location.pathname.endsWith(
                    "login.html"
                ) &&
                !location.pathname.endsWith(
                    "register.html"
                )
            ) {

                location.href =
                    "login.html";
            }
        }

        throw new Error(
            data?.error ||
            `حدث خطأ من السيرفر (${response.status})`
        );
    }

    return data;
}


/* =========================================================
   USER
   ========================================================= */

async function loadCurrentUser() {

    if (!getToken()) {
        return null;
    }

    const data =
        await apiFetch(
            "/api/me"
        );

    currentUser =
        data.user || null;

    if (currentUser) {

        localStorage.setItem(
            USER_KEY,
            JSON.stringify(currentUser)
        );

        updateUserUI();
    }

    return currentUser;
}


function loadSavedUser() {

    try {

        const raw =
            localStorage.getItem(
                USER_KEY
            );

        if (!raw) {
            return null;
        }

        currentUser =
            JSON.parse(raw);

        updateUserUI();

        return currentUser;

    } catch {

        return null;
    }
}


function updateUserUI() {

    if (!currentUser) {
        return;
    }

    const name =
        currentUser.name ||
        currentUser.username ||
        "مستخدم";

    const email =
        currentUser.email ||
        "";

    $all(
        "#userName",
        "#profileName",
        ".user-name",
        ".profile-name"
    ).forEach(
        element => {
            element.textContent =
                name;
        }
    );

    $all(
        "#userEmail",
        "#profileEmail",
        ".user-email",
        ".profile-email"
    ).forEach(
        element => {
            element.textContent =
                email;
        }
    );

    const initials =
        name
            .trim()
            .split(/\s+/)
            .slice(0, 2)
            .map(
                word =>
                    word.charAt(0)
            )
            .join("")
            .toUpperCase();

    $all(
        "#userAvatar",
        ".user-avatar",
        ".profile-avatar"
    ).forEach(
        element => {

            if (
                element.tagName !== "IMG"
            ) {
                element.textContent =
                    initials || "E";
            }
        }
    );
}


/* =========================================================
   CHATS
   ========================================================= */

async function loadChats() {

    const data =
        await apiFetch(
            "/api/chats"
        );

    chats =
        Array.isArray(data.chats)
            ? data.chats
            : [];

    renderChats();

    return chats;
}


function renderChats() {

    const containers =
        $all(
            "#chatList",
            "#conversationList",
            "#conversations",
            ".chat-list",
            ".conversation-list"
        );

    if (!containers.length) {
        return;
    }

    containers.forEach(
        container => {

            container.innerHTML = "";

            if (!chats.length) {

                container.innerHTML = `
                    <div class="empty-chats">
                        <div class="empty-chat-icon">💬</div>
                        <span>مفيش محادثات لسه</span>
                    </div>
                `;

                return;
            }

            chats.forEach(
                chat => {

                    const item =
                        document.createElement(
                            "div"
                        );

                    item.className =
                        "chat-item";

                    if (
                        Number(chat.id) ===
                        Number(currentChatId)
                    ) {

                        item.classList.add(
                            "active"
                        );
                    }

                    item.dataset.chatId =
                        chat.id;

                    const title =
                        escapeHTML(
                            chat.title ||
                            "محادثة جديدة"
                        );

                    item.innerHTML = `
                        <div class="chat-item-main">
                            <span class="chat-item-icon">
                                💬
                            </span>

                            <span class="chat-item-title">
                                ${title}
                            </span>
                        </div>

                        <button
                            type="button"
                            class="chat-delete"
                            data-delete-chat="${chat.id}"
                            title="حذف"
                        >
                            ×
                        </button>
                    `;

                    item.addEventListener(
                        "click",
                        event => {

                            if (
                                event.target.closest(
                                    "[data-delete-chat]"
                                )
                            ) {
                                return;
                            }

                            openChat(
                                chat.id
                            );
                        }
                    );

                    const deleteButton =
                        item.querySelector(
                            "[data-delete-chat]"
                        );

                    if (deleteButton) {

                        deleteButton.addEventListener(
                            "click",
                            async event => {

                                event.stopPropagation();

                                await deleteChat(
                                    chat.id
                                );
                            }
                        );
                    }

                    container.appendChild(
                        item
                    );
                }
            );
        }
    );
}


/* =========================================================
   CREATE CHAT
   ========================================================= */

async function createChat(
    title = "محادثة جديدة"
) {

    const data =
        await apiFetch(
            "/api/chats",
            {
                method: "POST",
                body: JSON.stringify({
                    title
                })
            }
        );

    const chat =
        data.chat;

    chats.unshift(
        chat
    );

    currentChatId =
        Number(chat.id);

    localStorage.setItem(
        CHAT_KEY,
        String(currentChatId)
    );

    renderChats();

    return chat;
}


/* =========================================================
   OPEN CHAT
   ========================================================= */

async function openChat(
    chatId
) {

    try {

        currentChatId =
            Number(chatId);

        localStorage.setItem(
            CHAT_KEY,
            String(currentChatId)
        );

        renderChats();

        const data =
            await apiFetch(
                `/api/chats/${currentChatId}`
            );

        currentMessages =
            Array.isArray(data.messages)
                ? data.messages
                : [];

        renderMessages();

        updateChatTitle(
            data.chat?.title ||
            "محادثة جديدة"
        );

    } catch (error) {

        console.error(
            "OPEN CHAT ERROR:",
            error
        );

        showError(
            error.message
        );
    }
}


/* =========================================================
   DELETE CHAT
   ========================================================= */

async function deleteChat(
    chatId
) {

    const confirmed =
        confirm(
            "هل أنت متأكد إنك عايز تحذف المحادثة؟"
        );

    if (!confirmed) {
        return;
    }

    try {

        await apiFetch(
            `/api/chats/${chatId}`,
            {
                method: "DELETE"
            }
        );

        chats =
            chats.filter(
                chat =>
                    Number(chat.id) !==
                    Number(chatId)
            );

        if (
            Number(currentChatId) ===
            Number(chatId)
        ) {

            currentChatId =
                null;

            currentMessages =
                [];

            localStorage.removeItem(
                CHAT_KEY
            );

            renderEmptyState();
        }

        renderChats();

    } catch (error) {

        showError(
            error.message
        );
    }
}


/* =========================================================
   MESSAGES
   ========================================================= */

function renderMessages() {

    const containers =
        $all(
            "#messages",
            "#messageList",
            ".messages",
            ".chat-messages"
        );

    if (!containers.length) {
        return;
    }

    containers.forEach(
        container => {

            container.innerHTML = "";

            if (!currentMessages.length) {
                return;
            }

            currentMessages.forEach(
                message => {

                    renderMessage(
                        message.role,
                        message.content,
                        container
                    );
                }
            );

            scrollMessages(
                container
            );
        }
    );
}


function renderMessage(
    role,
    content,
    container = null
) {

    const target =
        container ||
        $(
            "#messages",
            "#messageList",
            ".messages",
            ".chat-messages"
        );

    if (!target) {
        return;
    }

    const row =
        document.createElement(
            "div"
        );

    row.className =
        `message-row ${role}`;

    const bubble =
        document.createElement(
            "div"
        );

    bubble.className =
        "message-bubble";

    bubble.innerHTML =
        formatMessage(
            content
        );

    row.appendChild(
        bubble
    );

    target.appendChild(
        row
    );
}


/* =========================================================
   EMPTY STATE
   ========================================================= */

function renderEmptyState() {

    currentMessages =
        [];

    const containers =
        $all(
            "#messages",
            "#messageList",
            ".messages",
            ".chat-messages"
        );

    containers.forEach(
        container => {

            container.innerHTML = `
                <div class="empty-chat-state">
                    <div class="empty-logo">E</div>

                    <h2>
                        أهلاً بيك في Edrak AI
                    </h2>

                    <p>
                        اكتب أي سؤال وابدأ المحادثة.
                    </p>
                </div>
            `;
        }
    );

    updateChatTitle(
        "محادثة جديدة"
    );

    renderChats();
}


/* =========================================================
   TYPING
   ========================================================= */

function showTyping() {

    const container =
        $(
            "#messages",
            "#messageList",
            ".messages",
            ".chat-messages"
        );

    if (!container) {
        return;
    }

    removeTyping();

    const row =
        document.createElement(
            "div"
        );

    row.id =
        "edrakTyping";

    row.className =
        "message-row assistant typing-row";

    row.innerHTML = `
        <div class="message-bubble typing-bubble">

            <span>
                Edrak بيكتب
            </span>

            <span class="typing-dots">
                <i></i>
                <i></i>
                <i></i>
            </span>

        </div>
    `;

    container.appendChild(
        row
    );

    scrollMessages(
        container
    );
}


function removeTyping() {

    const typing =
        document.getElementById(
            "edrakTyping"
        );

    if (typing) {
        typing.remove();
    }
}


/* =========================================================
   SAVE MESSAGE
   ========================================================= */

async function saveMessage(
    role,
    content
) {

    if (!currentChatId) {
        return null;
    }

    return apiFetch(
        `/api/chats/${currentChatId}/messages`,
        {
            method: "POST",
            body: JSON.stringify({
                role,
                content
            })
        }
    );
}


/* =========================================================
   SEND MESSAGE
   ========================================================= */

async function sendMessage(
    customMessage = null
) {

    if (isSending) {
        return;
    }

    const input =
        $(
            "#messageInput",
            "#promptInput",
            "#chatInput",
            "textarea[name='message']",
            "input[name='message']"
        );

    const sendButton =
        $(
            "#sendBtn",
            "#sendButton",
            ".send-btn",
            "[data-send]"
        );

    const message =
        customMessage !== null
            ? String(
                customMessage
            ).trim()
            : String(
                input?.value || ""
            ).trim();

    if (!message) {
        return;
    }

    isSending =
        true;

    if (input) {

        input.value =
            "";

        autoResizeTextarea(
            input
        );
    }

    if (sendButton) {

        sendButton.disabled =
            true;

        sendButton.dataset.oldText =
            sendButton.textContent;

        sendButton.textContent =
            "جارٍ الإرسال...";
    }

    try {

        /*
          إنشاء محادثة تلقائيًا
          أول مرة المستخدم يرسل.
        */

        if (!currentChatId) {

            const title =
                message.length > 45
                    ? `${message.slice(0, 45)}...`
                    : message;

            await createChat(
                title
            );
        }

        /*
          عرض رسالة المستخدم.
        */

        currentMessages.push({
            role: "user",
            content: message
        });

        renderMessages();

        /*
          حفظ رسالة المستخدم.
        */

        await saveMessage(
            "user",
            message
        );

        /*
          إظهار الكتابة.
        */

        showTyping();

        /*
          تجهيز التاريخ.
        */

        const history =
            currentMessages
                .slice(-20)
                .filter(
                    item =>
                        item &&
                        (
                            item.role ===
                                "user" ||
                            item.role ===
                                "assistant"
                        )
                )
                .map(
                    item => ({
                        role:
                            item.role,
                        content:
                            item.content
                    })
                );

        /*
          استدعاء Backend
          والـBackend هو اللي بيكلم Groq.
        */

        const data =
            await apiFetch(
                "/api/chat",
                {
                    method: "POST",

                    body:
                        JSON.stringify({
                            message,
                            history
                        })
                }
            );

        removeTyping();

        const answer =
            data.answer ||
            "معلش، مقدرتش أطلع إجابة.";

        /*
          إضافة رد المساعد.
        */

        currentMessages.push({
            role: "assistant",
            content: answer
        });

        renderMessages();

        /*
          حفظ الرد.
        */

        await saveMessage(
            "assistant",
            answer
        );

        /*
          تحديث المحادثات.
        */

        await loadChats();

    } catch (error) {

        removeTyping();

        console.error(
            "SEND MESSAGE ERROR:",
            error
        );

        showError(
            error.message
        );

        /*
          رجع الرسالة للـinput.
        */

        if (
            input &&
            !input.value
        ) {
            input.value =
                message;

            autoResizeTextarea(
                input
            );
        }

    } finally {

        isSending =
            false;

        if (sendButton) {

            sendButton.disabled =
                false;

            sendButton.textContent =
                sendButton.dataset.oldText ||
                "إرسال";
        }

        if (input) {
            input.focus();
        }
    }
}


/* =========================================================
   NEW CHAT
   ========================================================= */

function startNewChat() {

    currentChatId =
        null;

    currentMessages =
        [];

    localStorage.removeItem(
        CHAT_KEY
    );

    renderEmptyState();

    const input =
        $(
            "#messageInput",
            "#promptInput",
            "#chatInput"
        );

    if (input) {

        input.value =
            "";

        input.focus();
    }
}


/* =========================================================
   CHAT TITLE
   ========================================================= */

function updateChatTitle(
    title
) {

    const finalTitle =
        title ||
        "محادثة جديدة";

    $all(
        "#chatTitle",
        ".chat-title",
        "[data-chat-title]"
    ).forEach(
        element => {

            element.textContent =
                finalTitle;
        }
    );
}


/* =========================================================
   COMPOSER
   ========================================================= */

function setupComposer() {

    const input =
        $(
            "#messageInput",
            "#promptInput",
            "#chatInput",
            "textarea[name='message']"
        );

    const sendButton =
        $(
            "#sendBtn",
            "#sendButton",
            ".send-btn",
            "[data-send]"
        );

    if (input) {

        input.addEventListener(
            "keydown",
            event => {

                if (
                    event.key ===
                        "Enter" &&
                    !event.shiftKey
                ) {

                    event.preventDefault();

                    sendMessage();
                }
            }
        );

        input.addEventListener(
            "input",
            () => {

                autoResizeTextarea(
                    input
                );
            }
        );
    }

    if (sendButton) {

        sendButton.addEventListener(
            "click",
            event => {

                event.preventDefault();

                sendMessage();
            }
        );
    }
}


/* =========================================================
   NEW CHAT BUTTON
   ========================================================= */

function setupNewChatButton() {

    $all(
        "#newChatBtn",
        "#newChat",
        ".new-chat-btn",
        "[data-new-chat]"
    ).forEach(
        button => {

            button.addEventListener(
                "click",
                event => {

                    event.preventDefault();

                    startNewChat();
                }
            );
        }
    );
}


/* =========================================================
   LOGOUT
   ========================================================= */

function setupLogout() {

    $all(
        "#logoutBtn",
        ".logout-btn",
        "[data-logout]"
    ).forEach(
        button => {

            button.addEventListener(
                "click",
                event => {

                    event.preventDefault();

                    logoutUser();
                }
            );
        }
    );
}


/* =========================================================
   VOICE INPUT
   ========================================================= */

function setupVoice() {

    const buttons =
        $all(
            "#voiceBtn",
            ".voice-btn",
            "[data-voice]"
        );

    if (!buttons.length) {
        return;
    }

    const SpeechRecognition =
        window.SpeechRecognition ||
        window.webkitSpeechRecognition;

    buttons.forEach(
        button => {

            button.addEventListener(
                "click",
                () => {

                    if (!SpeechRecognition) {

                        alert(
                            "المتصفح ده مش بيدعم إدخال الصوت."
                        );

                        return;
                    }

                    const recognition =
                        new SpeechRecognition();

                    recognition.lang =
                        "ar-EG";

                    recognition.interimResults =
                        false;

                    recognition.maxAlternatives =
                        1;

                    recognition.onstart =
                        () => {

                            button.classList.add(
                                "recording"
                            );
                        };

                    recognition.onend =
                        () => {

                            button.classList.remove(
                                "recording"
                            );
                        };

                    recognition.onerror =
                        error => {

                            console.error(
                                "VOICE ERROR:",
                                error
                            );

                            button.classList.remove(
                                "recording"
                            );
                        };

                    recognition.onresult =
                        event => {

                            const result =
                                event.results[0];

                            const text =
                                result[0]
                                    .transcript;

                            const input =
                                $(
                                    "#messageInput",
                                    "#promptInput",
                                    "#chatInput"
                                );

                            if (input) {

                                input.value =
                                    text;

                                autoResizeTextarea(
                                    input
                                );

                                input.focus();
                            }
                        };

                    recognition.start();
                }
            );
        }
    );
}


/* =========================================================
   SPEECH OUTPUT
   ========================================================= */

function speakText(
    text
) {

    if (
        !("speechSynthesis" in window)
    ) {

        return;
    }

    if (!text) {
        return;
    }

    window.speechSynthesis.cancel();

    const utterance =
        new SpeechSynthesisUtterance(
            String(text)
        );

    utterance.lang =
        "ar-EG";

    utterance.rate =
        1;

    utterance.pitch =
        1;

    window.speechSynthesis.speak(
        utterance
    );
}


/* =========================================================
   PRO MODAL
   ========================================================= */

function openProModal() {

    const modal =
        $(
            "#proModal",
            ".pro-modal",
            "[data-pro-modal]"
        );

    if (!modal) {

        alert(
            "Edrak PRO قريبًا 🚀"
        );

        return;
    }

    modal.classList.add(
        "active"
    );

    modal.style.display =
        "flex";
}


function closeProModal() {

    const modal =
        $(
            "#proModal",
            ".pro-modal",
            "[data-pro-modal]"
        );

    if (!modal) {
        return;
    }

    modal.classList.remove(
        "active"
    );

    modal.style.display =
        "";
}


function setupProButton() {

    $all(
        "#proBtn",
        ".pro-btn",
        "[data-pro]"
    ).forEach(
        button => {

            button.addEventListener(
                "click",
                event => {

                    event.preventDefault();

                    openProModal();
                }
            );
        }
    );
}


/* =========================================================
   MODALS
   ========================================================= */

function setupModalClose() {

    $all(
        "[data-close-modal]",
        ".modal-close",
        ".close-modal"
    ).forEach(
        button => {

            button.addEventListener(
                "click",
                event => {

                    event.preventDefault();

                    closeProModal();
                }
            );
        }
    );

    document.addEventListener(
        "click",
        event => {

            const modal =
                event.target.closest(
                    "#proModal, .pro-modal"
                );

            if (
                modal &&
                event.target === modal
            ) {

                closeProModal();
            }
        }
    );
}


/* =========================================================
   QUICK PROMPTS
   ========================================================= */

function setupQuickPrompts() {

    $all(
        ".quick-prompt",
        ".prompt-card",
        "[data-prompt]"
    ).forEach(
        button => {

            button.addEventListener(
                "click",
                event => {

                    event.preventDefault();

                    const text =
                        button.dataset.prompt ||
                        button.textContent.trim();

                    if (text) {

                        sendMessage(
                            text
                        );
                    }
                }
            );
        }
    );
}


/* =========================================================
   TEXTAREA
   ========================================================= */

function autoResizeTextarea(
    textarea
) {

    if (!textarea) {
        return;
    }

    textarea.style.height =
        "auto";

    textarea.style.height =
        Math.min(
            textarea.scrollHeight,
            180
        ) + "px";
}


/* =========================================================
   SCROLL
   ========================================================= */

function scrollMessages(
    container = null
) {

    const target =
        container ||
        $(
            "#messages",
            "#messageList",
            ".messages",
            ".chat-messages"
        );

    if (!target) {
        return;
    }

    requestAnimationFrame(
        () => {

            target.scrollTop =
                target.scrollHeight;
        }
    );
}


/* =========================================================
   FORMAT MESSAGE
   ========================================================= */

function escapeHTML(
    value
) {

    return String(
        value ?? ""
    )
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );
}


function formatMessage(
    text
) {

    let result =
        escapeHTML(
            text
        );

    /*
      Markdown code blocks
    */

    result =
        result.replace(
            /```([\s\S]*?)```/g,
            "<pre><code>$1</code></pre>"
        );

    /*
      Inline code
    */

    result =
        result.replace(
            /`([^`]+)`/g,
            "<code>$1</code>"
        );

    /*
      Bold
    */

    result =
        result.replace(
            /\*\*(.*?)\*\*/g,
            "<strong>$1</strong>"
        );

    /*
      New lines
    */

    result =
        result.replace(
            /\n/g,
            "<br>"
        );

    return result;
}


/* =========================================================
   ERROR UI
   ========================================================= */

function showError(
    message
) {

    console.error(
        message
    );

    const old =
        document.querySelector(
            ".edrak-error"
        );

    if (old) {
        old.remove();
    }

    const box =
        document.createElement(
            "div"
        );

    box.className =
        "edrak-error";

    box.innerHTML = `
        <div class="edrak-error-inner">

            <strong>
                حصل خطأ
            </strong>

            <span>
                ${escapeHTML(message)}
            </span>

            <button
                type="button"
                aria-label="إغلاق"
            >
                ×
            </button>

        </div>
    `;

    document.body.appendChild(
        box
    );

    const closeButton =
        box.querySelector(
            "button"
        );

    if (closeButton) {

        closeButton.addEventListener(
            "click",
            () => {
                box.remove();
            }
        );
    }

    setTimeout(
        () => {

            if (
                document.body.contains(
                    box
                )
            ) {

                box.remove();
            }

        },
        6000
    );
}


/* =========================================================
   SERVER TEST
   ========================================================= */

async function checkServer() {

    try {

        const data =
            await apiFetch(
                "/health"
            );

        console.log(
            "EDRAK SERVER ONLINE:",
            data
        );

        return true;

    } catch (error) {

        console.error(
            "EDRAK SERVER OFFLINE:",
            error
        );

        return false;
    }
}


/* =========================================================
   AUTO OPEN SAVED CHAT
   ========================================================= */

async function openSavedChat() {

    const saved =
        localStorage.getItem(
            CHAT_KEY
        );

    if (!saved) {
        return;
    }

    const chatId =
        Number(saved);

    if (!Number.isFinite(chatId)) {
        return;
    }

    const exists =
        chats.some(
            chat =>
                Number(chat.id) ===
                chatId
        );

    if (!exists) {

        localStorage.removeItem(
            CHAT_KEY
        );

        return;
    }

    await openChat(
        chatId
    );
}


/* =========================================================
   INIT
   ========================================================= */

async function initApp() {

    const token =
        getToken();

    /*
      لو مش عامل Login
    */

    if (!token) {

        if (
            location.pathname.endsWith(
                "index.html"
            ) ||
            location.pathname.endsWith(
                "/Edrak7/"
            ) ||
            location.pathname === "/"
        ) {

            location.href =
                "login.html";
        }

        return;
    }

    /*
      تحميل المستخدم المخزن
    */

    loadSavedUser();

    /*
      تشغيل الأحداث
    */

    setupComposer();
    setupNewChatButton();
    setupLogout();
    setupVoice();
    setupProButton();
    setupModalClose();
    setupQuickPrompts();

    /*
      تحديث المستخدم من السيرفر
    */

    try {

        await loadCurrentUser();

    } catch (error) {

        console.error(
            "LOAD USER ERROR:",
            error
        );

        showError(
            error.message
        );

        return;
    }

    /*
      جلب المحادثات
    */

    try {

        await loadChats();

    } catch (error) {

        console.error(
            "LOAD CHATS ERROR:",
            error
        );

        showError(
            error.message
        );

        return;
    }

    /*
      افتح آخر محادثة
    */

    if (chats.length) {

        await openSavedChat();

        if (!currentChatId) {
            renderEmptyState();
        }

    } else {

        renderEmptyState();
    }

    console.log(
        "✅ Edrak AI جاهز"
    );
}


/* =========================================================
   START
   ========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    initApp
);


/* =========================================================
   GLOBAL API
   ========================================================= */

window.Edrak = {

    sendMessage,
    openChat,
    createChat,
    deleteChat,
    startNewChat,

    speakText,

    openProModal,
    closeProModal,

    checkServer,

    logoutUser,

    getUser: () =>
        currentUser,

    getChats: () =>
        chats,

    getCurrentChatId: () =>
        currentChatId
};