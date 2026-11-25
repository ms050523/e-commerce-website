const API = `${BASE_URL}/orders`

const ordersWrap = document.getElementById("orders-wrap")

const statusNames = {
    new: "Новый",
    processing: "В обработке",
    done: "Выполнен",
    canceled: "Отменён"
}

const paymentNames = {
    cash: "Наличными при получении",
    card: "Банковской картой при получении",
    sbp: "Переводом по СБП"
}

let myOrders = []

function esc(text) {
    return String(text === undefined || text === null ? "" : text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
}

function formatDate(order) {
    const date = new Date(order.createdAt)
    if (isNaN(date.getTime())) {
        return order.date || ""
    }
    return date.toLocaleString("ru-RU", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })
}

async function fetchOrders() {
    const session = getSession()
    if (session === null) {
        ordersWrap.innerHTML = `<p class="empty">Чтобы увидеть заказы, <a href="./login.html?next=orders.html">войдите в аккаунт</a></p>`
        return
    }

    try {
        const response = await axios.get(API)
        myOrders = response.data
            .filter(e => String(e.userId) === String(session.user.id))
            .sort((a, b) => b.id - a.id)
        renderOrders()
    } catch (error) {
        console.log("Ошибка: ", error);
        ordersWrap.innerHTML = `<p class="empty">Не удалось загрузить заказы</p>`
    }
}

function renderOrders() {
    if (myOrders.length === 0) {
        ordersWrap.innerHTML = `<p class="empty">У вас пока нет заказов. <a href="./index.html">Перейти к покупкам</a></p>`
        return
    }

    let html = ""

    myOrders.forEach(order => {
        let status = order.status
        if (statusNames[status] === undefined) {
            status = "new"
        }

        let progress = ""
        if (status === "canceled") {
            progress = `<div class="ord-cancelled-note">Заказ отменён</div>`
        }
        else {
            const level = ["new", "processing", "done"].indexOf(status)
            const names = ["Принят", "В обработке", "Выполнен"]
            progress = `<div class="ord-steps">`
            names.forEach((name, index) => {
                let on = ""
                if (index <= level) {
                    on = "on"
                }
                progress += `<div class="ord-step ${on}">${name}</div>`
            });
            progress += `</div>`
        }

        let items = ""
        const list = order.items || []
        list.forEach(item => {
            const price = Number(item.price || 0)
            const qty = Number(item.quantity || 1)
            items += `<div class="ord-item">
                        <img src="${esc(item.imageUrl)}">
                        <div class="ord-item-info">
                            <a href="./detail.html?id=${esc(item.productId)}">${esc(item.title)}</a>
                            <p class="ord-item-sub">Size: ${esc(item.size)} · Color: ${esc(item.color)} · ${qty} × $${price}</p>
                        </div>
                        <div class="ord-item-sum">$${Math.round(price * qty * 100) / 100}</div>
                    </div>`
        });

        let discountLine = ""
        if (Number(order.discount) > 0) {
            discountLine = `<div class="ord-line"><span>Скидка</span><span>-$${order.discount}</span></div>`
        }

        let paymentLine = ""
        if (paymentNames[order.payment]) {
            paymentLine = `<div>Оплата: ${paymentNames[order.payment]}</div>`
        }

        let cancelBtn = ""
        if (status === "new") {
            cancelBtn = `<button type="button" class="ord-cancel" data-id="${order.id}">Отменить заказ</button>`
        }

        html += `<div class="ord">
                    <div class="ord-head">
                        <div>
                            <h3>Заказ №${order.id}</h3>
                            <p class="ord-date">${formatDate(order)}</p>
                        </div>
                        <span class="ord-status ord-status-${status}">${statusNames[status]}</span>
                    </div>
                    ${progress}
                    ${items}
                    <div class="ord-foot">
                        <div class="ord-info">
                            <div>${esc(order.customerName)}, ${esc(order.phone)}</div>
                            <div>${esc(order.address)}</div>
                            ${paymentLine}
                            ${cancelBtn}
                        </div>
                        <div class="ord-sums">
                            <div class="ord-line"><span>Товары</span><span>$${order.subtotal}</span></div>
                            ${discountLine}
                            <div class="ord-line"><span>Доставка</span><span>$${order.delivery}</span></div>
                            <div class="ord-line ord-total"><span>Итого</span><span>$${order.total}</span></div>
                        </div>
                    </div>
                </div>`
    });

    ordersWrap.innerHTML = html

    document.querySelectorAll(".ord-cancel").forEach(btn => {
        btn.addEventListener('click', async () => {
            const ok = confirm("Отменить заказ?")
            if (!ok) {
                return
            }

            btn.disabled = true
            try {
                await axios.patch(`${API}/${btn.dataset.id}`, { status: "canceled" })
                const order = myOrders.find(e => String(e.id) === String(btn.dataset.id))
                order.status = "canceled"
                writeLog("order.status", `Заказ №${order.id}`, "Новый → Отменён (отменил клиент)")
                renderOrders()
            } catch (error) {
                console.log("Ошибка при отмене:", error);
                alert("Не удалось отменить заказ, попробуйте позже")
                btn.disabled = false
            }
        })
    })
}

fetchOrders()