const API_USERS = `${AUTH_URL}/users`
const API_AUTH = `${AUTH_URL}/auth`
const API_REGISTER = `${AUTH_URL}/register`
const API_LOGS = `${BASE_URL}/logs`

function getSession() {
    try {
        const raw = localStorage.getItem("session")
        if (raw === null) {
            return null
        }
        return JSON.parse(raw)
    } catch (error) {
        console.log("Ошибка: ", error);
        return null
    }
}

function getToken() {
    const session = getSession()
    if (session === null || !session.token) {
        return ""
    }
    return session.token
}

function saveSession(user, token) {
    const data = {
        token: token || "",
        user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role
        }
    }
    localStorage.setItem("session", JSON.stringify(data))
}

function clearSession() {
    localStorage.removeItem("session")
}

function getRole(user) {
    const email = String(user.email || "").trim().toLowerCase()
    if (ADMIN_EMAILS.map(e => e.toLowerCase()).includes(email)) {
        return "admin"
    }
    return "user"
}

function isAdmin(user) {
    return getRole(user) === "admin"
}

function makeUser(data) {
    return {
        id: data.id,
        name: data.fullName || data.name || data.email,
        email: data.email,
        role: data.role || "user",
        blocked: isBannedRecord(data)
    }
}

async function fetchFreshUser(id, token) {
    try {
        const headers = {}
        if (token) {
            headers.Authorization = `Bearer ${token}`
        }
        const response = await axios.get(`${API_USERS}/${id}`, { headers: headers })
        return response.data
    } catch (error) {
        console.log("Не удалось обновить данные пользователя: ", error);
        return null
    }
}

async function isUserBlocked(id) {
    const fresh = await fetchFreshUser(id, getToken())
    return fresh !== null && fresh.blocked === true
}

async function writeLog(action, target, details) {
    const session = getSession()
    let user = { id: null, name: "Гость", role: "user", email: "" }
    if (session !== null) {
        user = session.user
    }

    try {
        const response = await axios.post(API_LOGS, {
            at: new Date().toISOString(),
            userId: user.id,
            userName: user.name,
            role: getRole(user),
            action: action,
            target: target,
            details: details
        })
        return response.data
    } catch (error) {
        console.log("Журнал не записан: ", error);
        return null
    }
}

const BLOCKED_TEXT = "Ваш аккаунт заблокирован. Обратитесь в поддержку"

function activeUntil(value) {
    if (!value) {
        return false
    }
    if (value === "forever") {
        return true
    }
    return new Date(value) > new Date()
}

function formatUntil(value) {
    if (value === "forever") {
        return "навсегда"
    }
    return new Date(value).toLocaleString("ru-RU", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })
}

function isBannedRecord(record) {
    return record.blocked === true || activeUntil(record.blockedUntil)
}

function banMessage(record) {
    let text = "Ваш аккаунт заблокирован"
    if (record.blocked !== true && record.blockedUntil) {
        text += ` до ${formatUntil(record.blockedUntil)}`
    }
    if (record.blockReason) {
        text += `. Причина: ${record.blockReason}`
    }
    return `${text}. Если это ошибка, обратитесь в поддержку`
}

async function getAccountState(id) {
    const record = await fetchFreshUser(id, getToken())
    const state = { record: record, banned: false, noOrders: false, noPromo: false, banText: "", noOrdersText: "", noPromoText: "" }
    if (record === null) {
        return state
    }

    state.banned = isBannedRecord(record)
    state.banText = banMessage(record)

    state.noOrders = activeUntil(record.noOrdersUntil)
    state.noOrdersText = `Вам временно запрещено оформлять заказы (${formatUntil(record.noOrdersUntil)})`
    if (record.noOrdersReason) {
        state.noOrdersText += `. Причина: ${record.noOrdersReason}`
    }

    state.noPromo = activeUntil(record.noPromoUntil)
    state.noPromoText = `Вам временно запрещено применять промокоды (${formatUntil(record.noPromoUntil)})`
    if (record.noPromoReason) {
        state.noPromoText += `. Причина: ${record.noPromoReason}`
    }
    return state
}

function errorText(error, defaultText) {
    if (!error.response) {
        return "Нет связи с сервером. Проверьте интернет"
    }
    if (error.response.data && error.response.data.message) {
        return error.response.data.message
    }
    return defaultText
}

async function registerUser(name, email, password) {
    let response = null

    try {
        response = await axios.post(API_REGISTER, {
            fullName: name,
            email: email,
            password: password
        })
    } catch (error) {
        console.log("Ошибка: ", error);
        const disabled = error.response && error.response.data && error.response.data.message === "RESOURCE_REGISTRATION_DISABLED"
        if (error.response && error.response.status !== 404 && !disabled) {
            return { ok: false, message: errorText(error, "Не удалось зарегистрироваться") }
        }
        if (!error.response) {
            return { ok: false, message: errorText(error, "") }
        }
    }

    if (response !== null) {
        const user = makeUser(response.data.data)
        user.name = name
        saveSession(user, response.data.token)
        return { ok: true, user: user }
    }

    try {
        const list = await axios.get(API_USERS)
        const found = list.data.find(e => String(e.email).toLowerCase() === email.toLowerCase())

        if (found) {
            return { ok: false, message: "Этот email уже зарегистрирован" }
        }

        const created = await axios.post(API_USERS, {
            name: name,
            email: email,
            password: password,
            role: "user"
        })
        const user = makeUser(created.data)
        saveSession(user, "")
        return { ok: true, user: user }
    } catch (error) {
        console.log("Ошибка: ", error);
        return { ok: false, message: errorText(error, "Не удалось зарегистрироваться") }
    }
}

async function loginUser(email, password) {
    const variants = [email]
    if (email.toLowerCase() !== email) {
        variants.push(email.toLowerCase())
    }

    let details = ""

    for (let i = 0; i < variants.length; i++) {
        try {
            const response = await axios.post(API_AUTH, {
                email: variants[i],
                password: password
            })
            let user = makeUser(response.data.data)
            const fresh = await fetchFreshUser(user.id, response.data.token)
            if (fresh !== null) {
                user = makeUser(fresh)
            }
            if (user.blocked) {
                return { ok: false, message: banMessage(fresh !== null ? fresh : response.data.data) }
            }
            saveSession(user, response.data.token)
            return { ok: true, user: user }
        } catch (error) {
            console.log("Ошибка /auth: ", error);
            if (!error.response) {
                return { ok: false, message: errorText(error, "") }
            }
            details = `/auth ${error.response.status}`
            if (error.response.data && error.response.data.message) {
                details += `: ${error.response.data.message}`
            }
        }
    }

    try {
        const list = await axios.get(API_USERS)
        const found = list.data.find(e => {
            return String(e.email).toLowerCase() === email.toLowerCase() && String(e.password) === password
        })

        if (found) {
            if (isBannedRecord(found)) {
                return { ok: false, message: banMessage(found) }
            }
            saveSession(makeUser(found), "")
            return { ok: true, user: makeUser(found) }
        }

        const sameEmail = list.data.find(e => String(e.email).toLowerCase() === email.toLowerCase())
        if (sameEmail) {
            details += "; пользователь с таким email найден, пароль не совпал"
        }
        else {
            details += "; пользователя с таким email нет в users"
        }
    } catch (error) {
        console.log("Ошибка /users: ", error);
        if (!error.response) {
            return { ok: false, message: errorText(error, "") }
        }
        details += `; /users ${error.response.status}`
    }

    return { ok: false, message: `Неверный email или пароль (${details})` }
}