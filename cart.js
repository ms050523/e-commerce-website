const API = `${BASE_URL}/basket`
const API_ORDERS = `${BASE_URL}/orders`

const leftBox = document.getElementsByClassName("left-box")[0]
const summaryValues = document.getElementsByClassName("val")
const checkoutBtn = document.getElementsByClassName("main-btn")[0]

let basketData = []

const clearBtn = document.getElementById("clear-btn")
const cartTitle = document.querySelector(".title")

async function fetchBascket() {
    const session = getSession()
    if (session === null) {
        basketData = []
        leftBox.innerHTML = `<p class="empty">Чтобы увидеть корзину, <a href="./login.html?next=cart.html">войдите в аккаунт</a></p>`
        renderSummary(basketData)
        return
    }

    try {
        const response = await axios.get(API)
        basketData = response.data.filter(e => String(e.userId) === String(session.user.id))
        renderBascket(basketData)
    } catch (error) {
        console.log("Ошибка: ", error);
        leftBox.innerHTML = `<p class="empty">Не удалось загрузить корзину</p>`
    }
}

function getTotals(data) {
    let subtotal = 0
    data.forEach(element => {
        let price = Number(element.price || element.currentPrice || 0)
        let qty = Number(element.quantity || 1)
        subtotal += price * qty
    });

    let delivery = 0
    if (data.length > 0) {
        delivery = 15
    }
    let total = Math.round((subtotal + delivery) * 100) / 100

    return { subtotal: subtotal, delivery: delivery, total: total }
}

function renderSummary(data) {
    const totals = getTotals(data)
    const subtotal = totals.subtotal
    const delivery = totals.delivery
    const total = totals.total

    if (summaryValues.length >= 3) {
        summaryValues[0].innerHTML = `$${subtotal}`
        summaryValues[1].innerHTML = `$${delivery}`
        summaryValues[2].innerHTML = `$${total}`
    }

    checkoutBtn.disabled = data.length === 0
    clearBtn.disabled = data.length === 0

    let count = 0
    data.forEach(element => {
        count += Number(element.quantity || 1)
    });
    if (count > 0) {
        cartTitle.textContent = `YOUR CART (${count})`
    }
    else {
        cartTitle.textContent = "YOUR CART"
    }
}

function renderBascket(data) {
    let cards = ""

    if (data.length === 0) {
        cards = `<p class="empty">Your cart is empty. <a href="./index.html">Continue shopping</a></p>`
    }

    data.forEach(element => {
        let price = element.price || element.currentPrice || 0
        let qty = Number(element.quantity || 1)
        let disabled = ""
        if (qty <= 1) {
            disabled = "disabled"
        }
        cards += `<div class="card">
                    <img src="${element.imageUrl}">
                    <div class="info">
                        <a href="./detail.html?id=${element.productId}" style="text-decoration: none; color: inherit;">
                            <h3 class="name">${element.title}</h3>
                        </a>
                        <p class="text">Size: <span>${element.size}</span></p>
                        <p class="text">Color: <span>${element.color}</span></p>
                        <p class="price">$${price}</p>
                    </div>
                    <div class="controls">
                        <i class="fa-solid fa-trash-can" data-id="${element.id}"></i>
                        <div class="counter">
                            <button class="btn-minus" data-id="${element.id}" ${disabled}>-</button>
                            <span>${qty}</span>
                            <button class="btn-plus" data-id="${element.id}">+</button>
                        </div>
                    </div>
                </div>`
    });
    leftBox.innerHTML = cards

    const deleteBtn = document.querySelectorAll(".fa-trash-can")
    const btnPlus = document.querySelectorAll(".btn-plus")
    const btnMinus = document.querySelectorAll(".btn-minus")

    deleteBtn.forEach(btn => {
        btn.addEventListener('click', async () => {
            const id = btn.dataset.id
            basketData = basketData.filter(e => String(e.id) !== String(id))
            renderBascket(basketData)
            try {
                await axios.delete(`${API}/${id}`)
            } catch (error) {
                console.log("Ошибка при удалении:", error);
                fetchBascket()
            }
        })
    })

    btnPlus.forEach(btn => {
        btn.addEventListener('click', async () => {
            const id = btn.dataset.id
            const item = basketData.find(e => String(e.id) === String(id))
            item.quantity = Number(item.quantity || 1) + 1
            renderBascket(basketData)
            try {
                await axios.patch(`${API}/${id}`, { quantity: item.quantity })
            } catch (error) {
                console.log("Ошибка при увеличении количества:", error);
                fetchBascket()
            }
        })
    })

    btnMinus.forEach(btn => {
        btn.addEventListener('click', async () => {
            const id = btn.dataset.id
            const item = basketData.find(e => String(e.id) === String(id))

            if (Number(item.quantity) > 1) {
                item.quantity = Number(item.quantity) - 1
                renderBascket(basketData)
                try {
                    await axios.patch(`${API}/${id}`, { quantity: item.quantity })
                } catch (error) {
                    console.log("Ошибка при уменьшении количества:", error);
                    fetchBascket()
                }
            }
        })
    })

    renderSummary(data)
}

clearBtn.addEventListener('click', async () => {
    if (basketData.length === 0) {
        return
    }
    const ok = confirm("Очистить корзину?")
    if (!ok) {
        return
    }

    const oldData = basketData
    basketData = []
    renderBascket(basketData)
    try {
        await Promise.all(oldData.map(e => axios.delete(`${API}/${e.id}`)))
    } catch (error) {
        console.log("Ошибка при очистке корзины:", error);
        fetchBascket()
    }
})

const modal = document.getElementById("modal")
const modalClose = document.getElementById("modal-close")
const modalFormBox = document.getElementById("modal-form-box")
const modalDone = document.getElementById("modal-done")
const modalDoneText = document.getElementById("modal-done-text")
const modalDoneBtn = document.getElementById("modal-done-btn")
const orderForm = document.getElementById("order-form")
const orderBtn = document.getElementById("order-btn")
const modalError = document.getElementById("modal-error")
const inputName = document.getElementById("o-name")
const inputPhone = document.getElementById("o-phone")
const inputEmail = document.getElementById("o-email")
const inputAddress = document.getElementById("o-address")
const orderInputs = [inputName, inputPhone, inputEmail, inputAddress]

const paymentNames = {
    cash: "Наличными при получении",
    card: "Банковской картой при получении",
    sbp: "Переводом по СБП"
}

function showNotice(iconClass, title, text, buttonText, onButton, laterText) {
    const overlay = document.createElement("div")
    overlay.className = "modal-backdrop open"

    const box = document.createElement("div")
    box.className = "modal notice"

    const icon = document.createElement("i")
    icon.className = `fa-solid ${iconClass} notice-icon`

    const heading = document.createElement("h2")
    heading.className = "modal-title"
    heading.textContent = title

    const message = document.createElement("p")
    message.className = "notice-text"
    message.textContent = text

    const button = document.createElement("button")
    button.type = "button"
    button.className = "main-btn"
    button.textContent = buttonText
    button.addEventListener('click', () => {
        overlay.remove()
        onButton()
    })

    box.appendChild(icon)
    box.appendChild(heading)
    box.appendChild(message)
    box.appendChild(button)

    if (laterText) {
        const later = document.createElement("button")
        later.type = "button"
        later.className = "notice-later"
        later.textContent = laterText
        later.addEventListener('click', () => overlay.remove())
        box.appendChild(later)
    }

    overlay.appendChild(box)
    document.body.appendChild(overlay)
}

function openModal() {
    const totals = getTotals(basketData)
    document.getElementById("m-subtotal").textContent = `$${totals.subtotal}`
    document.getElementById("m-delivery").textContent = `$${totals.delivery}`
    document.getElementById("m-total").textContent = `$${totals.total}`

    const session = getSession()
    if (session !== null) {
        if (inputName.value === "") {
            inputName.value = String(session.user.name).replace(/[0-9]/g, "")
        }
        if (inputEmail.value === "") {
            inputEmail.value = session.user.email
        }
    }

    modalError.textContent = ""
    modalFormBox.hidden = false
    modalDone.hidden = true
    modal.classList.add("open")
    document.body.style.overflow = "hidden"
}

function closeModal() {
    modal.classList.remove("open")
    document.body.style.overflow = ""
}

checkoutBtn.addEventListener('click', () => {
    if (basketData.length === 0) {
        return
    }

    if (getSession() === null) {
        showNotice("fa-circle-user", "Нужен аккаунт", "Чтобы оформить заказ, войдите в аккаунт. Товары в корзине сохранятся", "Войти", () => {
            window.location.href = "./login.html?next=cart.html"
        }, "Позже")
        return
    }

    openModal()
})

modalClose.addEventListener('click', closeModal)
modalDoneBtn.addEventListener('click', () => {
    closeModal()
    window.location.href = "./index.html"
})

modal.addEventListener('click', (event) => {
    if (event.target === modal) {
        closeModal()
    }
})

document.addEventListener('keydown', (event) => {
    if (event.key === "Escape" && modal.classList.contains("open")) {
        closeModal()
    }
})

let lastPhone = ""

function formatPhone(value) {
    let digits = value.replace(/\D/g, "")
    if (digits === "") {
        return ""
    }
    if (digits[0] === "8") {
        digits = "7" + digits.slice(1)
    }
    if (digits[0] !== "7") {
        digits = "7" + digits
    }
    digits = digits.slice(0, 11)

    let result = "+7"
    if (digits.length > 1) {
        result += " (" + digits.slice(1, 4)
    }
    if (digits.length >= 5) {
        result += ") " + digits.slice(4, 7)
    }
    if (digits.length >= 8) {
        result += "-" + digits.slice(7, 9)
    }
    if (digits.length >= 10) {
        result += "-" + digits.slice(9, 11)
    }
    return result
}

inputPhone.addEventListener('input', () => {
    const raw = inputPhone.value
    let formatted = formatPhone(raw)
    if (raw.length < lastPhone.length && raw.replace(/\D/g, "").length <= 1) {
        formatted = ""
    }
    inputPhone.value = formatted
    lastPhone = formatted
})

orderInputs.forEach(input => {
    input.addEventListener('input', () => input.classList.remove("invalid"))
})

const nameWarning = "В имени нельзя использовать цифры"

inputName.addEventListener('input', () => {
    const clean = inputName.value.replace(/[0-9]/g, "")
    if (clean !== inputName.value) {
        inputName.value = clean
        modalError.textContent = nameWarning
    }
    else if (modalError.textContent === nameWarning) {
        modalError.textContent = ""
    }
})

orderForm.addEventListener('submit', async (event) => {
    event.preventDefault()

    const name = inputName.value.trim()
    const phone = inputPhone.value.trim()
    const email = inputEmail.value.trim()
    const address = inputAddress.value.trim()
    const digits = phone.replace(/\D/g, "")
    const emailOk = /^\S+@\S+\.\S+$/.test(email)

    inputName.classList.toggle("invalid", name === "")
    inputPhone.classList.toggle("invalid", digits.length !== 11)
    inputEmail.classList.toggle("invalid", email !== "" && !emailOk)
    inputAddress.classList.toggle("invalid", address === "")

    if (name === "" || digits.length !== 11 || address === "" || (email !== "" && !emailOk)) {
        modalError.textContent = "Проверьте имя, телефон (+7 и 10 цифр), email и адрес"
        return
    }

    if (basketData.length === 0) {
        modalError.textContent = "Корзина пустая"
        return
    }

    const session = getSession()

    const state = await getAccountState(session.user.id)
    if (state.banned) {
        clearSession()
        closeModal()
        showNotice("fa-ban", "Аккаунт заблокирован", state.banText, "Понятно", () => {
            window.location.href = "./index.html"
        })
        return
    }
    if (state.noOrders) {
        modalError.textContent = state.noOrdersText
        return
    }

    let payment = "cash"
    const checkedPayment = document.querySelector('input[name="payment"]:checked')
    if (checkedPayment) {
        payment = checkedPayment.value
    }

    const totals = getTotals(basketData)
    const items = basketData.map(e => {
        return {
            productId: e.productId,
            title: e.title,
            imageUrl: e.imageUrl,
            price: Number(e.price || e.currentPrice || 0),
            size: e.size,
            color: e.color,
            quantity: Number(e.quantity || 1)
        }
    })

    const order = {
        userId: session.user.id,
        customerName: name,
        phone: phone,
        email: email,
        address: address,
        payment: payment,
        items: items,
        subtotal: totals.subtotal,
        discount: 0,
        delivery: totals.delivery,
        total: totals.total,
        status: "new",
        createdAt: new Date().toISOString()
    }

    orderBtn.disabled = true
    orderBtn.textContent = "Отправляем..."
    modalError.textContent = ""

    try {
        const response = await axios.post(API_ORDERS, order)
        await Promise.all(basketData.map(e => axios.delete(`${API}/${e.id}`)))

        basketData = []
        renderBascket(basketData)
        orderForm.reset()

        modalDoneText.textContent = `Номер вашего заказа: №${response.data.id}. Оплата: ${paymentNames[payment]}. Мы скоро свяжемся с вами по телефону`
        modalFormBox.hidden = true
        modalDone.hidden = false
    } catch (error) {
        console.log("Ошибка при оформлении заказа:", error);
        modalError.textContent = "Не удалось отправить заказ, попробуйте позже"
    }

    orderBtn.disabled = false
    orderBtn.textContent = "Подтвердить заказ"
})

fetchBascket()