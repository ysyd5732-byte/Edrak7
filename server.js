require("dotenv").config();

const express = require("express");
const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const app = express();

const PORT = process.env.PORT || 3000;
const JWT_SECRET =
    process.env.JWT_SECRET ||
    "edrak-super-secret-key-2026";

const GROQ_API_KEY =
    process.env.GROQ_API_KEY || "";

const GROQ_MODEL =
    process.env.GROQ_MODEL ||
    "openai/gpt-oss-20b";

const ADMIN_EMAIL =
    process.env.ADMIN_EMAIL ||
    "admin@edrak.local";

const ADMIN_PASSWORD =
    process.env.ADMIN_PASSWORD ||
    "Edrak@123";


/* =========================================================
   EXPRESS
========================================================= */

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));


/* =========================================================
   DATABASE JSON
========================================================= */

const DB_FILE =
    path.join(__dirname, "edrak-data.json");


const EMPTY_DB = {
    users: [],
    chats: [],
    messages: [],

    nextIds: {
        user: 1,
        chat: 1,
        message: 1
    }
};


function createDB() {

    if (!fs.existsSync(DB_FILE)) {

        fs.writeFileSync(
            DB_FILE,
            JSON.stringify(
                EMPTY_DB,
                null,
                2
            ),
            "utf8"
        );

        return JSON.parse(
            JSON.stringify(EMPTY_DB)
        );
    }


    try {

        const raw =
            fs.readFileSync(
                DB_FILE,
                "utf8"
            );

        const data =
            JSON.parse(raw);


        if (!data.users) {
            data.users = [];
        }

        if (!data.chats) {
            data.chats = [];
        }

        if (!data.messages) {
            data.messages = [];
        }

        if (!data.nextIds) {

            data.nextIds = {
                user: 1,
                chat: 1,
                message: 1
            };

        }


        return data;

    } catch (error) {

        console.error(
            "خطأ في قراءة قاعدة البيانات:",
            error
        );

        return JSON.parse(
            JSON.stringify(EMPTY_DB)
        );

    }

}


let db = createDB();


function saveDB() {

    const tempFile =
        DB_FILE + ".tmp";

    fs.writeFileSync(
        tempFile,
        JSON.stringify(
            db,
            null,
            2
        ),
        "utf8"
    );

    fs.renameSync(
        tempFile,
        DB_FILE
    );

}


/* =========================================================
   HELPERS
========================================================= */

function cleanEmail(email) {

    return String(email || "")
        .trim()
        .toLowerCase();

}


function cleanText(text) {

    return String(text || "")
        .trim();

}


function findUserByEmail(email) {

    const clean =
        cleanEmail(email);

    return db.users.find(
        user =>
            cleanEmail(user.email) === clean
    );

}


function findUserById(id) {

    return db.users.find(
        user =>
            Number(user.id) === Number(id)
    );

}


function findChatById(id) {

    return db.chats.find(
        chat =>
            Number(chat.id) === Number(id)
    );

}


function getUserChats(userId) {

    return db.chats.filter(
        chat =>
            Number(chat.user_id) ===
            Number(userId)
    );

}


function getChatMessages(chatId) {

    return db.messages
        .filter(
            message =>
                Number(message.chat_id) ===
                Number(chatId)
        )
        .sort(
            (a, b) =>
                Number(a.id) -
                Number(b.id)
        );

}


function publicUser(user) {

    if (!user) {
        return null;
    }

    return {
        id: user.id,
        name: user.name,
        username: user.username,
        email: user.email,
        created_at: user.created_at
    };

}


function generateId(type) {

    const id =
        db.nextIds[type];

    db.nextIds[type]++;

    return id;

}


/* =========================================================
   AUTH MIDDLEWARE
========================================================= */

function auth(req, res, next) {

    const header =
        req.headers.authorization || "";

    if (!header.startsWith("Bearer ")) {

        return res.status(401).json({
            error: "يجب تسجيل الدخول أولاً"
        });

    }


    const token =
        header.substring(7);


    try {

        const decoded =
            jwt.verify(
                token,
                JWT_SECRET
            );


        const user =
            findUserById(decoded.id);


        if (!user) {

            return res.status(401).json({
                error: "الحساب غير موجود"
            });

        }


        req.user = user;

        next();

    } catch {

        return res.status(401).json({
            error: "جلسة الدخول غير صالحة"
        });

    }

}


/* =========================================================
   ADMIN AUTH
========================================================= */

function adminAuth(req, res, next) {

    const email =
        req.headers["x-admin-email"];

    const password =
        req.headers["x-admin-password"];


    if (
        email !== ADMIN_EMAIL ||
        password !== ADMIN_PASSWORD
    ) {

        return res.status(401).json({
            error: "غير مصرح لك بالدخول"
        });

    }


    next();

}


/* =========================================================
   HEALTH
========================================================= */

app.get("/health", (req, res) => {

    res.json({
        success: true,
        service: "Edrak AI",
        status: "online"
    });

});


/* =========================================================
   REGISTER
========================================================= */

app.post(
    "/api/register",
    async (req, res) => {

        try {

            const name =
                cleanText(req.body.name);

            const email =
                cleanEmail(req.body.email);

            const password =
                String(
                    req.body.password || ""
                );


            if (!name) {

                return res.status(400).json({
                    error: "اكتب اسمك"
                });

            }


            if (!email) {

                return res.status(400).json({
                    error: "اكتب البريد الإلكتروني"
                });

            }


            if (password.length < 6) {

                return res.status(400).json({
                    error:
                        "كلمة المرور يجب أن تكون 6 أحرف على الأقل"
                });

            }


            const existing =
                findUserByEmail(email);


            if (existing) {

                return res.status(409).json({
                    error:
                        "البريد الإلكتروني مستخدم بالفعل"
                });

            }


            const passwordHash =
                await bcrypt.hash(
                    password,
                    10
                );


            const user = {

                id: generateId("user"),

                name,

                username:
                    name,

                email,

                password: passwordHash,

                created_at:
                    new Date().toISOString()

            };


            db.users.push(user);

            saveDB();


            const token =
                jwt.sign(
                    {
                        id: user.id,
                        email: user.email
                    },
                    JWT_SECRET,
                    {
                        expiresIn: "30d"
                    }
                );


            res.status(201).json({

                success: true,

                token,

                user:
                    publicUser(user)

            });

        } catch (error) {

            console.error(error);

            res.status(500).json({
                error:
                    "حدث خطأ أثناء إنشاء الحساب"
            });

        }

    }
);


/* =========================================================
   LOGIN
========================================================= */

app.post(
    "/api/login",
    async (req, res) => {

        try {

            const email =
                cleanEmail(req.body.email);

            const password =
                String(
                    req.body.password || ""
                );


            const user =
                findUserByEmail(email);


            if (!user) {

                return res.status(401).json({
                    error:
                        "البريد الإلكتروني أو كلمة المرور غير صحيحة"
                });

            }


            const valid =
                await bcrypt.compare(
                    password,
                    user.password
                );


            if (!valid) {

                return res.status(401).json({
                    error:
                        "البريد الإلكتروني أو كلمة المرور غير صحيحة"
                });

            }


            const token =
                jwt.sign(
                    {
                        id: user.id,
                        email: user.email
                    },
                    JWT_SECRET,
                    {
                        expiresIn: "30d"
                    }
                );


            res.json({

                success: true,

                token,

                user:
                    publicUser(user)

            });

        } catch (error) {

            console.error(error);

            res.status(500).json({
                error:
                    "حدث خطأ أثناء تسجيل الدخول"
            });

        }

    }
);


/* =========================================================
   CURRENT USER
========================================================= */

app.get(
    "/api/me",
    auth,
    (req, res) => {

        res.json({

            user:
                publicUser(req.user)

        });

    }
);


/* =========================================================
   CREATE CHAT
========================================================= */

app.post(
    "/api/chats",
    auth,
    (req, res) => {

        const title =
            cleanText(
                req.body.title
            ) ||
            "محادثة جديدة";


        const chat = {

            id:
                generateId("chat"),

            user_id:
                req.user.id,

            title,

            created_at:
                new Date().toISOString(),

            updated_at:
                new Date().toISOString()

        };


        db.chats.push(chat);

        saveDB();


        res.status(201).json({
            chat
        });

    }
);


/* =========================================================
   GET USER CHATS
========================================================= */

app.get(
    "/api/chats",
    auth,
    (req, res) => {

        const chats =
            getUserChats(
                req.user.id
            )
            .sort(
                (a, b) =>
                    new Date(
                        b.updated_at ||
                        b.created_at
                    ) -
                    new Date(
                        a.updated_at ||
                        a.created_at
                    )
            );


        res.json({
            chats
        });

    }
);


/* =========================================================
   GET SINGLE CHAT
========================================================= */

app.get(
    "/api/chats/:id",
    auth,
    (req, res) => {

        const chat =
            findChatById(
                req.params.id
            );


        if (!chat) {

            return res.status(404).json({
                error:
                    "المحادثة غير موجودة"
            });

        }


        if (
            Number(chat.user_id) !==
            Number(req.user.id)
        ) {

            return res.status(403).json({
                error:
                    "غير مصرح لك بهذه المحادثة"
            });

        }


        const messages =
            getChatMessages(
                chat.id
            );


        res.json({

            chat,

            messages

        });

    }
);


/* =========================================================
   UPDATE CHAT
========================================================= */

app.patch(
    "/api/chats/:id",
    auth,
    (req, res) => {

        const chat =
            findChatById(
                req.params.id
            );


        if (!chat) {

            return res.status(404).json({
                error:
                    "المحادثة غير موجودة"
            });

        }


        if (
            Number(chat.user_id) !==
            Number(req.user.id)
        ) {

            return res.status(403).json({
                error:
                    "غير مصرح لك"
            });

        }


        if (req.body.title) {

            chat.title =
                cleanText(
                    req.body.title
                );

        }


        chat.updated_at =
            new Date().toISOString();


        saveDB();


        res.json({
            success: true,
            chat
        });

    }
);


/* =========================================================
   DELETE USER CHAT
========================================================= */

app.delete(
    "/api/chats/:id",
    auth,
    (req, res) => {

        const chat =
            findChatById(
                req.params.id
            );


        if (!chat) {

            return res.status(404).json({
                error:
                    "المحادثة غير موجودة"
            });

        }


        if (
            Number(chat.user_id) !==
            Number(req.user.id)
        ) {

            return res.status(403).json({
                error:
                    "غير مصرح لك"
            });

        }


        const chatId =
            Number(chat.id);


        db.messages =
            db.messages.filter(
                message =>
                    Number(message.chat_id) !==
                    chatId
            );


        db.chats =
            db.chats.filter(
                item =>
                    Number(item.id) !==
                    chatId
            );


        saveDB();


        res.json({
            success: true
        });

    }
);


/* =========================================================
   FIXED CREATOR ANSWER
========================================================= */

function isCreatorQuestion(text) {

    const normalized =
        cleanText(text)
            .toLowerCase();


    const questions = [

        "مين صنعك",
        "مين عملك",
        "مين طورك",
        "مين المطور",
        "مين صاحبك",
        "مين صاحب edrak",
        "مين صاحب إدراك",
        "مين عمل edrak",
        "مين عمل إدراك",
        "مين مطور edrak",
        "مين مطور إدراك",
        "مين اللي صنعك",
        "من صنعك",
        "من طورك"

    ];


    return questions.some(
        q =>
            normalized.includes(
                q.toLowerCase()
            )
    );

}


const CREATOR_ANSWER =
    "أنا Edrak AI، وتم تطويري بواسطة ياسين من دولة مصر 🇪🇬.";


/* =========================================================
   GROQ
========================================================= */

async function askGroq(messages) {

    if (!GROQ_API_KEY) {

        throw new Error(
            "GROQ_API_KEY غير موجود في ملف .env"
        );

    }


    const systemMessage = {

        role: "system",

        content: `
أنت Edrak AI.

أنت مساعد ذكاء اصطناعي عربي مفيد وودود.

أجب باللغة التي يستخدمها المستخدم، ويفضل أسلوبًا عربيًا بسيطًا ومفهومًا.

لا تدّعي امتلاك معلومات غير مؤكدة.

إذا سألك المستخدم "مين صنعك" أو "مين طورك" أو أي سؤال مشابه عن مطورك، فالإجابة الصحيحة هي:

أنا Edrak AI، وتم تطويري بواسطة ياسين من دولة مصر 🇪🇬.

لا تغيّر هذه المعلومة.
        `.trim()

    };


    const response =
        await fetch(
            "https://api.groq.com/openai/v1/chat/completions",
            {

                method: "POST",

                headers: {

                    "Content-Type":
                        "application/json",

                    "Authorization":
                        `Bearer ${GROQ_API_KEY}`

                },

                body: JSON.stringify({

                    model:
                        GROQ_MODEL,

                    messages:
                        [
                            systemMessage,
                            ...messages
                        ],

                    temperature: 0.7,

                    max_tokens: 2048

                })

            }
        );


    const data =
        await response.json();


    if (!response.ok) {

        console.error(
            "Groq error:",
            data
        );

        throw new Error(
            data?.error?.message ||
            "فشل الاتصال بخدمة الذكاء الاصطناعي"
        );

    }


    return (
        data?.choices?.[0]?.message?.content ||
        "لم أستطع إنشاء إجابة."
    );

}


/* =========================================================
   AI CHAT
========================================================= */

app.post(
    "/api/chat",
    auth,
    async (req, res) => {

        try {

            const message =
                cleanText(
                    req.body.message
                );


            if (!message) {

                return res.status(400).json({
                    error:
                        "الرسالة فارغة"
                });

            }


            if (
                isCreatorQuestion(
                    message
                )
            ) {

                return res.json({

                    answer:
                        CREATOR_ANSWER

                });

            }


            const history =
                Array.isArray(
                    req.body.history
                )
                    ? req.body.history
                    : [];


            const safeHistory =
                history
                    .slice(-20)
                    .map(item => {

                        const role =
                            item.role ===
                            "assistant"
                                ? "assistant"
                                : "user";


                        return {

                            role,

                            content:
                                cleanText(
                                    item.content
                                )

                        };

                    })
                    .filter(
                        item =>
                            item.content
                    );


            safeHistory.push({

                role: "user",

                content: message

            });


            const answer =
                await askGroq(
                    safeHistory
                );


            res.json({

                success: true,

                answer

            });

        } catch (error) {

            console.error(
                "AI ERROR:",
                error
            );


            res.status(500).json({

                error:
                    error.message ||
                    "حدث خطأ في الذكاء الاصطناعي"

            });

        }

    }
);


/* =========================================================
   SAVE USER MESSAGE
========================================================= */

app.post(
    "/api/chats/:id/messages",
    auth,
    (req, res) => {

        const chat =
            findChatById(
                req.params.id
            );


        if (!chat) {

            return res.status(404).json({
                error:
                    "المحادثة غير موجودة"
            });

        }


        if (
            Number(chat.user_id) !==
            Number(req.user.id)
        ) {

            return res.status(403).json({
                error:
                    "غير مصرح لك"
            });

        }


        const role =
            req.body.role ===
            "assistant"
                ? "assistant"
                : "user";


        const content =
            cleanText(
                req.body.content
            );


        if (!content) {

            return res.status(400).json({
                error:
                    "محتوى الرسالة فارغ"
            });

        }


        const message = {

            id:
                generateId("message"),

            chat_id:
                chat.id,

            role,

            content,

            created_at:
                new Date().toISOString()

        };


        db.messages.push(
            message
        );


        chat.updated_at =
            new Date().toISOString();


        saveDB();


        res.status(201).json({

            success: true,

            messageId:
                message.id,

            message

        });

    }
);


/* =========================================================
   ADMIN STATS
========================================================= */

app.get(
    "/api/admin/stats",
    adminAuth,
    (req, res) => {

        res.json({

            users:
                db.users.length,

            chats:
                db.chats.length,

            messages:
                db.messages.length

        });

    }
);


/* =========================================================
   ADMIN USERS
========================================================= */

app.get(
    "/api/admin/users",
    adminAuth,
    (req, res) => {

        const users =
            db.users
                .slice()
                .reverse()
                .map(
                    user =>
                        publicUser(user)
                );


        res.json({
            users
        });

    }
);


/* =========================================================
   ADMIN DELETE USER
========================================================= */

app.delete(
    "/api/admin/users/:id",
    adminAuth,
    (req, res) => {

        const userId =
            Number(req.params.id);


        const user =
            findUserById(
                userId
            );


        if (!user) {

            return res.status(404).json({
                error:
                    "المستخدم غير موجود"
            });

        }


        const userChats =
            db.chats.filter(
                chat =>
                    Number(chat.user_id) ===
                    userId
            );


        const chatIds =
            new Set(
                userChats.map(
                    chat =>
                        Number(chat.id)
                )
            );


        db.messages =
            db.messages.filter(
                message =>
                    !chatIds.has(
                        Number(
                            message.chat_id
                        )
                    )
            );


        db.chats =
            db.chats.filter(
                chat =>
                    Number(chat.user_id) !==
                    userId
            );


        db.users =
            db.users.filter(
                item =>
                    Number(item.id) !==
                    userId
            );


        saveDB();


        res.json({

            success: true,

            message:
                "تم حذف الحساب وكل بياناته"

        });

    }
);


/* =========================================================
   ADMIN CHATS
========================================================= */

app.get(
    "/api/admin/chats",
    adminAuth,
    (req, res) => {

        const chats =
            db.chats
                .slice()
                .reverse()
                .map(chat => {

                    const user =
                        findUserById(
                            chat.user_id
                        );


                    return {

                        ...chat,

                        user_email:
                            user?.email ||
                            "غير معروف",

                        user_name:
                            user?.name ||
                            user?.username ||
                            "مستخدم"

                    };

                });


        res.json({
            chats
        });

    }
);


/* =========================================================
   ADMIN CHAT MESSAGES
========================================================= */

app.get(
    "/api/admin/chats/:id/messages",
    adminAuth,
    (req, res) => {

        const chatId =
            Number(req.params.id);


        const chat =
            findChatById(
                chatId
            );


        if (!chat) {

            return res.status(404).json({
                error:
                    "المحادثة غير موجودة"
            });

        }


        const user =
            findUserById(
                chat.user_id
            );


        const messages =
            getChatMessages(
                chatId
            );


        res.json({

            chat: {

                ...chat,

                user_email:
                    user?.email ||
                    "غير معروف",

                user_name:
                    user?.name ||
                    user?.username ||
                    "مستخدم"

            },

            messages

        });

    }
);


/* =========================================================
   ADMIN DELETE CHAT
========================================================= */

app.delete(
    "/api/admin/chats/:id",
    adminAuth,
    (req, res) => {

        const chatId =
            Number(req.params.id);


        const chat =
            findChatById(
                chatId
            );


        if (!chat) {

            return res.status(404).json({
                error:
                    "المحادثة غير موجودة"
            });

        }


        db.messages =
            db.messages.filter(
                message =>
                    Number(
                        message.chat_id
                    ) !== chatId
            );


        db.chats =
            db.chats.filter(
                item =>
                    Number(item.id) !==
                    chatId
            );


        saveDB();


        res.json({

            success: true,

            message:
                "تم حذف المحادثة"

        });

    }
);


/* =========================================================
   ADMIN RESET
========================================================= */

app.post(
    "/api/admin/reset",
    adminAuth,
    (req, res) => {

        db = JSON.parse(
            JSON.stringify(
                EMPTY_DB
            )
        );


        saveDB();


        res.json({

            success: true,

            message:
                "تم مسح جميع بيانات Edrak"

        });

    }
);


/* =========================================================
   STATIC FILES
========================================================= */

app.use(
    express.static(
        __dirname
    )
);


/* =========================================================
   HOME
========================================================= */

app.get("/", (req, res) => {

    res.sendFile(
        path.join(
            __dirname,
            "index.html"
        )
    );

});


/* =========================================================
   404 API
========================================================= */

app.use(
    "/api",
    (req, res) => {

        res.status(404).json({

            error:
                "API endpoint غير موجود"

        });

    }
);


/* =========================================================
   ERROR HANDLER
========================================================= */

app.use(
    (error, req, res, next) => {

        console.error(
            "SERVER ERROR:",
            error
        );


        res.status(500).json({

            error:
                "حدث خطأ داخلي في السيرفر"

        });

    }
);


/* =========================================================
   START SERVER
========================================================= */

app.listen(
    PORT,
    () => {

        console.log("");
        console.log(
            "================================="
        );

        console.log(
            "        EDRAK AI SERVER"
        );

        console.log(
            "================================="
        );

        console.log(
            `🌐 http://localhost:${PORT}`
        );

        console.log(
            `👑 Admin: http://localhost:${PORT}/admin.html`
        );

        console.log(
            `📁 Database: ${DB_FILE}`
        );

        console.log(
            `🤖 Groq Model: ${GROQ_MODEL}`
        );

        console.log(
            "================================="
        );

    }
);