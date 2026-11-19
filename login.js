const authBox = document.getElementById("auth-box")
const authTabsBox = document.getElementById("auth-tabs")
const authTabs = document.querySelectorAll(".auth-tab")
const authForms = document.querySelectorAll(".auth-form")
const authTitle = document.getElementById("auth-title")
const authSub = document.getElementById("auth-sub")
const authSuccess = document.getElementById("auth-success")
const authSuccessText = document.getElementById("auth-success-text")
const eyeButtons = document.querySelectorAll(".eye")

const loginForm = document.getElementById("login-form")
const loginEmail = document.getElementById("login-email")
const loginPassword = document.getElementById("login-password")
const loginError = document.getElementById("login-error")
const loginBtn = document.getElementById("login-btn")

const registerForm = document.getElementById("register-form")
const regName = document.getElementById("reg-name")
const regEmail = document.getElementById("reg-email")
const regPassword = document.getElementById("reg-password")
const regPassword2 = document.getElementById("reg-password2")
const regError = document.getElementById("reg-error")
const regBtn = document.getElementById("reg-btn")
const strengthBar = document.getElementById("strength-bar")

const urlParams = new URLSearchParams(window.location.search)

function goNext(user) {
    let next = urlParams.get("next")
    const correct = next !== null && /^[a-z]+\.html(\?[\w=&%.-]*)?$/.test(next)

    if (!correct) {
        next = "index.html"
        if (isAdmin(user)) {
            next = "admin.html"
        }
    }
    window.location.href = `./${next}`
}

function showSuccess(user) {
    authSuccessText.textContent = `Добро пожаловать, ${user.name}!`
    authBox.classList.add("done")
    setTimeout(() => goNext(user), 1100)
}

function shake(form, input) {
    form.classList.remove("shake")
    void form.offsetWidth
    form.classList.add("shake")
    if (input) {
        input.focus()
    }
}

function setLoading(btn, loading) {
    btn.disabled = loading
    if (loading) {
        btn.classList.add("loading")
    }
    else {
        btn.classList.remove("loading")
    }
}

function showForm(id) {
    authTabsBox.dataset.active = id
    authTabs.forEach(tab => {
        if (tab.dataset.form === id) {
            tab.classList.add("active")
        }
        else {
            tab.classList.remove("active")
        }
    })
    authForms.forEach(form => {
        if (form.id === id) {
            form.classList.add("active")
        }
        else {
            form.classList.remove("active")
        }
    })
    loginError.textContent = ""
    regError.textContent = ""

    if (id === "login-form") {
        authTitle.textContent = "С возвращением"
        authSub.textContent = "Введите email и пароль, чтобы войти"
    }
    else {
        authTitle.textContent = "Создайте аккаунт"
        authSub.textContent = "Это займет меньше минуты"
    }
}

authTabs.forEach(tab => {
    tab.addEventListener('click', () => showForm(tab.dataset.form))
})

eyeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        const input = btn.parentElement.querySelector("input")
        const icon = btn.querySelector("i")
        if (input.type === "password") {
            input.type = "text"
            icon.className = "fa-regular fa-eye-slash"
        }
        else {
            input.type = "password"
            icon.className = "fa-regular fa-eye"
        }
    })
})

regPassword.addEventListener('input', () => {
    const value = regPassword.value
    let score = 0
    if (value.length >= 6) {
        score++
    }
    if (value.length >= 10) {
        score++
    }
    if (/[A-Z]/.test(value) && /[a-z]/.test(value)) {
        score++
    }
    if (/\d/.test(value) && /[^a-zA-Z0-9]/.test(value)) {
        score++
    }
    if (value.length === 0) {
        score = 0
    }

    const colors = ["transparent", "#ff5c6c", "#ffb020", "#7c5cff", "#34d399"]
    strengthBar.style.width = `${score * 25}%`
    strengthBar.style.backgroundColor = colors[score]
})

loginForm.addEventListener('submit', async (event) => {
    event.preventDefault()

    const email = loginEmail.value.trim()
    const password = loginPassword.value

    if (email === "" || password === "") {
        loginError.textContent = "Введите email и пароль"
        shake(loginForm)
        return
    }

    loginError.textContent = ""
    setLoading(loginBtn, true)
    const result = await loginUser(email, password)
    setLoading(loginBtn, false)

    if (result.ok) {
        showSuccess(result.user)
    }
    else {
        loginError.textContent = result.message
        shake(loginForm, loginPassword)
    }
})

registerForm.addEventListener('submit', async (event) => {
    event.preventDefault()

    const name = regName.value.trim()
    const email = regEmail.value.trim()
    const password = regPassword.value
    const password2 = regPassword2.value

    let error = ""
    if (name === "" || email === "" || password === "") {
        error = "Заполните все поля"
    }
    else if (!email.includes("@") || !email.includes(".")) {
        error = "Введите правильный email"
    }
    else if (password.length < 6) {
        error = "Пароль должен быть не короче 6 символов"
    }
    else if (password !== password2) {
        error = "Пароли не совпадают"
    }

    if (error !== "") {
        regError.textContent = error
        shake(registerForm)
        return
    }

    regError.textContent = ""
    setLoading(regBtn, true)
    const result = await registerUser(name, email, password)
    setLoading(regBtn, false)

    if (result.ok) {
        showSuccess(result.user)
    }
    else {
        regError.textContent = result.message
        shake(registerForm)
    }
})

const currentSession = getSession()
if (currentSession !== null) {
    goNext(currentSession.user)
}