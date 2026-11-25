const API_ORDERS = `${BASE_URL}/orders`
const API_PRODUCTS = `${BASE_URL}/products`

const statusNames = {
    new: "Новый",
    processing: "В обработке",
    done: "Выполнен",
    canceled: "Отменён"
}

const categoryNames = {
    "new-arrivals": "New Arrivals",
    "top-selling": "Top Selling"
}

const placeholder = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='295' height='298'><rect width='100%25' height='100%25' fill='%23e4e4e4'/></svg>"

const session = getSession()
let allowed = false

if (session === null) {
    window.location.replace("./login.html?next=admin.html")
}
else if (!isAdmin(session.user)) {
    window.location.replace("./index.html")
}
else {
    allowed = true
    document.body.classList.remove("locked")
}

const navButtons = document.querySelectorAll(".tab-btn")
const tabs = document.querySelectorAll(".tab")
const navNew = document.getElementById("nav-new")
const refreshBtn = document.getElementById("refresh-btn")
const logoutBtn = document.getElementById("logout-btn")
const notifyBtn = document.getElementById("notify-btn")
const updateText = document.getElementById("update-text")
const toastBox = document.getElementById("toast-box")

const dashRevenue = document.getElementById("dash-revenue")
const dashNew = document.getElementById("dash-new")
const dashAvg = document.getElementById("dash-avg")
const statNewBtn = document.getElementById("stat-new-btn")
const chartBox = document.getElementById("chart")
const chartTitle = document.getElementById("chart-title")
const chartTotal = document.getElementById("chart-total")
const chartNote = document.getElementById("chart-note")
const metricButtons = document.querySelectorAll("#metric-chips .period-btn")
const periodButtons = document.querySelectorAll("#period-chips .period-btn")
const latestOrdersBox = document.getElementById("latest-orders")
const topProductsBox = document.getElementById("top-products")
const topPeriod = document.getElementById("top-period")
const orderChips = document.querySelectorAll("#order-chips .chip")
const goOrdersBtn = document.getElementById("go-orders-btn")


const ordersList = document.getElementById("orders-list")
const orderSearch = document.getElementById("order-search")
const drawer = document.getElementById("drawer")
const drawerBody = document.getElementById("drawer-body")
const drawerBackdrop = document.getElementById("drawer-backdrop")
const productEditor = document.getElementById("product-editor")
const editorBackdrop = document.getElementById("editor-backdrop")
const editorClose = document.getElementById("editor-close")
const newProductBtn = document.getElementById("new-product-btn")

const productsList = document.getElementById("products-list")
const productSearch = document.getElementById("product-search")
const productCount = document.getElementById("product-count")
const productChips = document.querySelectorAll("#product-chips .chip")
const formTitle = document.getElementById("form-title")
const preview = document.getElementById("preview")
const inputTitle = document.getElementById("p-title")
const inputImage = document.getElementById("p-image")
const colorList = document.getElementById("color-list")
const addColorBtn = document.getElementById("add-color-btn")
const inputPrice = document.getElementById("p-price")
const inputOld = document.getElementById("p-old")
const inputDiscount = document.getElementById("p-discount")
const inputRating = document.getElementById("p-rating")
const inputCost = document.getElementById("p-cost")
const marginNote = document.getElementById("margin-note")
const inputCategory = document.getElementById("p-category")
const inputDescription = document.getElementById("p-description")
const saveProductBtn = document.getElementById("save-product-btn")
const cancelEditBtn = document.getElementById("cancel-edit-btn")
const bulkAll = document.getElementById("bulk-all")
const bulkCount = document.getElementById("bulk-count")
const bulkButtons = document.querySelectorAll("#bulk-bar [data-bulk]")

let ordersData = []
let productsData = []
let ordersLoaded = false
let editId = null
let productFilter = "all"
let openOrderId = null
let notifyOn = false
let selectedIds = []
let orderFilter = "all"
let chartDays = 7
let chartMetric = "revenue"
let chartAnimated = false
let currentTab = "dashboard-tab"

function safe(text) {
    return String(text || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;")
}

function money(number) {
    return `$${(Math.round(Number(number) * 100) / 100).toLocaleString("en-US")}`
}

function showToast(text, isError) {
    const toast = document.createElement("div")
    toast.className = "toast"
    if (isError) {
        toast.className = "toast error"
    }
    toast.textContent = text
    toastBox.appendChild(toast)
    setTimeout(() => toast.remove(), 3000)
}

function dayKey(date) {
    let month = String(date.getMonth() + 1)
    if (month.length === 1) {
        month = "0" + month
    }
    let day = String(date.getDate())
    if (day.length === 1) {
        day = "0" + day
    }
    return `${date.getFullYear()}-${month}-${day}`
}

function orderDay(order) {
    if (order.createdAt) {
        const date = new Date(order.createdAt)
        if (!isNaN(date)) {
            return dayKey(date)
        }
    }
    const parts = String(order.date || "").split(",")[0].trim().split(".")
    if (parts.length === 3) {
        return `${parts[2]}-${parts[1]}-${parts[0]}`
    }
    return ""
}

function badge(status) {
    return `<span class="badge status-${safe(status)}">${statusNames[status] || safe(status)}</span>`
}

function orderDate(order) {
    if (order.createdAt) {
        const date = new Date(order.createdAt)
        if (!isNaN(date)) {
            return date.toLocaleString("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
        }
    }
    return String(order.date || "")
}

function showTab(tabId) {
    navButtons.forEach(btn => {
        if (btn.dataset.tab === tabId) {
            btn.classList.add("active")
        }
        else {
            btn.classList.remove("active")
        }
    })
    tabs.forEach(t => t.classList.remove("active"))
    document.getElementById(tabId).classList.add("active")
    window.scrollTo({ top: 0 })
    currentTab = tabId
}

function switchTab(tabId) {
    showTab(tabId)
    saveSettings()
}

async function saveSettings() {
    const headers = {}
    if (getToken()) {
        headers.Authorization = `Bearer ${getToken()}`
    }
    const settings = { tab: currentTab, period: chartDays, metric: chartMetric, notify: notifyOn }

    try {
        await axios.patch(`${API_USERS}/${session.user.id}`, { adminSettings: settings }, { headers: headers })
    } catch (error) {
        console.log("Настройки не сохранены: ", error);
    }
}

function loadSettings(saved) {
    if (saved.metric === "profit") {
        chartMetric = "profit"
    }
    if ([7, 30, 90].includes(Number(saved.period))) {
        chartDays = Number(saved.period)
    }
    notifyOn = saved.notify === true

    metricButtons.forEach(btn => {
        if (btn.dataset.metric === chartMetric) {
            btn.classList.add("active")
        }
        else {
            btn.classList.remove("active")
        }
    })
    periodButtons.forEach(btn => {
        if (Number(btn.dataset.days) === chartDays) {
            btn.classList.add("active")
        }
        else {
            btn.classList.remove("active")
        }
    })

    renderNotifyBtn()
    renderChart()
    renderTopProducts()
    if (saved.tab === "dashboard-tab" || saved.tab === "orders-tab" || saved.tab === "products-tab") {
        showTab(saved.tab)
    }
}

navButtons.forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab))
})

goOrdersBtn.addEventListener('click', () => switchTab("orders-tab"))

statNewBtn.addEventListener('click', () => {
    setOrderFilter("new")
    switchTab("orders-tab")
})

async function fetchOrders() {
    try {
        const response = await axios.get(API_ORDERS)
        const data = response.data.sort((a, b) => b.id - a.id)

        if (!ordersLoaded || JSON.stringify(data) !== JSON.stringify(ordersData)) {
            if (ordersLoaded) {
                const oldIds = ordersData.map(e => e.id)
                data.forEach(order => {
                    if (!oldIds.includes(order.id)) {
                        showToast(`Новый заказ №${order.id} на ${money(order.total)}`)
                        notifyNewOrder(order)
                    }
                });
            }
            ordersData = data
            renderAll()
        }
        ordersLoaded = true
        updateText.textContent = "Обновлено " + new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })
    } catch (error) {
        console.log("Ошибка: ", error);
        if (ordersData.length === 0) {
            ordersList.innerHTML = `<p class="empty">Не удалось загрузить заказы</p>`
        }
    }
}

function renderAll() {
    renderStats()
    renderChart()
    renderTopProducts()
    renderLatest()
    renderChips()
    renderOrders()
    if (openOrderId !== null) {
        renderDrawer()
    }
}

function renderStats() {
    let countNew = 0
    let revenue = 0
    let activeCount = 0
    let activeSum = 0

    ordersData.forEach(order => {
        if (order.status === "new") {
            countNew++
        }
        if (order.status === "done") {
            revenue += Number(order.total)
        }
        if (order.status !== "canceled") {
            activeCount++
            activeSum += Number(order.total)
        }
    });

    let avg = 0
    if (activeCount > 0) {
        avg = activeSum / activeCount
    }

    dashRevenue.textContent = money(revenue)
    dashNew.textContent = countNew
    dashAvg.textContent = money(Math.round(avg))
    renderProfit()

    if (countNew > 0) {
        statNewBtn.classList.add("has-new")
        navNew.textContent = countNew
        navNew.style.display = "inline-block"
        document.title = `(${countNew}) SHOP.CO Admin`
    }
    else {
        statNewBtn.classList.remove("has-new")
        navNew.style.display = "none"
        document.title = "SHOP.CO Admin"
    }
}

function renderChart() {
    const days = []
    let step = 5
    if (chartDays > 30) {
        step = 10
    }

    for (let i = chartDays - 1; i >= 0; i--) {
        const d = new Date()
        d.setDate(d.getDate() - i)

        let label = ""
        if (chartDays <= 7) {
            label = `${d.toLocaleDateString("ru-RU", { weekday: "short" })} ${d.getDate()}`
        }
        else if ((chartDays - 1 - i) % step === 0 || i === 0) {
            label = d.toLocaleDateString("ru-RU", { day: "numeric", month: "numeric" })
        }

        days.push({
            key: dayKey(d),
            label: label,
            full: d.toLocaleDateString("ru-RU", { day: "numeric", month: "long" }),
            sum: 0,
            count: 0,
            today: i === 0
        })
    }

    ordersData.forEach(order => {
        if (order.status === "canceled") {
            return
        }
        const day = days.find(e => e.key === orderDay(order))
        if (day) {
            if (chartMetric === "profit") {
                day.sum += orderProfit(order).profit
            }
            else {
                day.sum += Number(order.total)
            }
            day.count++
        }
    });

    let max = 0
    let periodTotal = 0
    let periodCount = 0
    days.forEach(d => {
        periodTotal += d.sum
        periodCount += d.count
        if (d.sum > max) {
            max = d.sum
        }
    });

    let html = ""
    days.forEach((d, index) => {
        let height = 0
        if (max > 0) {
            height = Math.round(d.sum / max * 100)
        }
        if (d.sum > 0 && height < 4) {
            height = 4
        }
        let value = ""
        let barClass = "bar"
        if (d.sum > 0) {
            if (chartDays <= 7) {
                value = money(d.sum)
            }
        }
        else {
            barClass += " zero"
        }
        if (d.today) {
            barClass += " today"
        }
        let tipClass = ""
        const place = (index + 0.5) / days.length
        if (place < 0.3) {
            tipClass = "tip-left"
        }
        if (place > 0.7) {
            tipClass = "tip-right"
        }

        html += `<div class="bar-col ${tipClass}" data-tip="${d.full}: ${money(d.sum)}, заказов: ${d.count}">
                <span class="bar-value">${value}</span>
                <div class="bar-track"><div class="${barClass}" style="height: ${height}%"></div></div>
                <span class="bar-label">${d.label}</span>
            </div>`
    });

    if (!chartAnimated) {
        chartBox.classList.add("animate")
        chartAnimated = true
    }
    if (chartDays > 7) {
        chartBox.classList.add("dense")
    }
    else {
        chartBox.classList.remove("dense")
    }

    let metricName = "Продажи"
    if (chartMetric === "profit") {
        metricName = "Прибыль"
    }

    chartBox.innerHTML = html
    chartTitle.textContent = `${metricName} за ${chartDays} дней`
    chartTotal.textContent = money(periodTotal)
    chartNote.textContent = `Заказов: ${periodCount}, максимум за день: ${money(max)}`
}

metricButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        chartMetric = btn.dataset.metric
        metricButtons.forEach(b => b.classList.remove("active"))
        btn.classList.add("active")
        renderChart()
        saveSettings()
    })
})

periodButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        chartDays = Number(btn.dataset.days)
        periodButtons.forEach(b => b.classList.remove("active"))
        btn.classList.add("active")
        renderChart()
        renderTopProducts()
        saveSettings()
    })
})

function renderTopProducts() {
    const from = new Date()
    from.setDate(from.getDate() - (chartDays - 1))
    const fromKey = dayKey(from)

    topPeriod.textContent = `за ${chartDays} дней`

    const stats = {}
    ordersData.forEach(order => {
        if (order.status === "canceled") {
            return
        }
        if (orderDay(order) < fromKey) {
            return
        }
        const items = order.items || []
        items.forEach(item => {
            const key = String(item.productId)
            const qty = Number(item.quantity || 1)
            if (!stats[key]) {
                stats[key] = { title: item.title, imageUrl: item.imageUrl, qty: 0, sum: 0 }
            }
            stats[key].qty += qty
            stats[key].sum += Number(item.price) * qty
        });
    });

    let list = []
    for (const key in stats) {
        list.push(stats[key])
    }
    list.sort((a, b) => b.qty - a.qty)
    list = list.slice(0, 5)

    if (list.length === 0) {
        topProductsBox.innerHTML = `<p class="empty">За этот период продаж нет</p>`
        return
    }

    const maxQty = list[0].qty
    let html = ""
    list.forEach((item, index) => {
        const width = Math.round(item.qty / maxQty * 100)
        html += `<div class="top-row">
                <span class="top-rank">${index + 1}</span>
                <img src="${safe(item.imageUrl)}" alt="">
                <div class="top-info">
                    <div class="top-title">${safe(item.title)}</div>
                    <div class="progress-track"><div class="progress-fill" style="width: ${width}%"></div></div>
                </div>
                <div class="top-qty">${item.qty} шт.<span>${money(item.sum)}</span></div>
            </div>`
    });
    topProductsBox.innerHTML = html
}

function renderLatest() {
    if (ordersData.length === 0) {
        latestOrdersBox.innerHTML = `<p class="empty">Заказов пока нет. Когда покупатель оформит заказ, он появится здесь</p>`
        return
    }

    let html = ""
    ordersData.slice(0, 5).forEach(order => {
        html += `<button type="button" class="latest-row" data-order="${order.id}">
                <div class="latest-main">
                    <b>№${order.id}</b>
                    <span>${safe(order.customerName)}</span>
                </div>
                <div class="latest-side">
                    <b>${money(order.total)}</b>
                    ${badge(order.status)}
                </div>
            </button>`
    });
    latestOrdersBox.innerHTML = html
}

latestOrdersBox.addEventListener('click', (event) => {
    const row = event.target.closest("[data-order]")
    if (row) {
        switchTab("orders-tab")
        openDrawer(row.dataset.order)
    }
})

function setOrderFilter(value) {
    orderFilter = value
    orderChips.forEach(chip => {
        if (chip.dataset.filter === value) {
            chip.classList.add("active")
        }
        else {
            chip.classList.remove("active")
        }
    })
    renderOrders()
}

orderChips.forEach(chip => {
    chip.addEventListener('click', () => setOrderFilter(chip.dataset.filter))
})

function renderChips() {
    const counts = { all: ordersData.length, new: 0, processing: 0, done: 0, canceled: 0 }
    ordersData.forEach(order => {
        if (counts[order.status] !== undefined) {
            counts[order.status]++
        }
    });
    document.querySelectorAll("#order-chips [data-count]").forEach(el => {
        el.textContent = counts[el.dataset.count]
    })
}

function renderOrders() {
    const search = orderSearch.value.trim().toLowerCase()

    let html = ""
    let count = 0

    ordersData.forEach(order => {
        if (orderFilter !== "all" && order.status !== orderFilter) {
            return
        }
        const text = `${order.id} ${order.customerName} ${order.phone} ${order.email || ""}`.toLowerCase()
        if (search !== "" && !text.includes(search)) {
            return
        }
        count++

        const items = order.items || []
        let thumbs = ""
        items.slice(0, 3).forEach(item => {
            thumbs += `<img src="${safe(item.imageUrl)}" alt="">`
        });
        if (items.length > 3) {
            thumbs += `<span class="more">+${items.length - 3}</span>`
        }

        let dot = ""
        if (order.status === "new") {
            dot = `<span class="dot"></span>`
        }

        html += `<div class="o-row" data-order="${order.id}" tabindex="0">
                <span class="o-id">${dot}№${order.id}</span>
                <div class="o-who"><b>${safe(order.customerName)}</b><span>${safe(order.phone)}</span></div>
                <div class="thumbs">${thumbs}</div>
                <b class="o-sum">${money(order.total)}</b>
                ${badge(order.status)}
                <span class="o-date">${safe(orderDate(order))}</span>
            </div>`
    });

    if (count === 0) {
        html = `<p class="empty">Заказов нет</p>`
    }
    ordersList.innerHTML = html
}

ordersList.addEventListener('click', (event) => {
    const row = event.target.closest("[data-order]")
    if (row) {
        openDrawer(row.dataset.order)
    }
})

ordersList.addEventListener('keydown', (event) => {
    if (event.key === "Enter") {
        const row = event.target.closest("[data-order]")
        if (row) {
            openDrawer(row.dataset.order)
        }
    }
})

orderSearch.addEventListener('input', renderOrders)

function openDrawer(id) {
    openOrderId = id
    renderDrawer()
    drawer.classList.add("open")
    drawerBackdrop.classList.add("open")
    drawer.setAttribute("aria-hidden", "false")
    document.body.classList.add("no-scroll")
}

function closeDrawer() {
    openOrderId = null
    drawer.classList.remove("open")
    drawerBackdrop.classList.remove("open")
    drawer.setAttribute("aria-hidden", "true")
    document.body.classList.remove("no-scroll")
}

function renderDrawer() {
    const order = ordersData.find(e => String(e.id) === String(openOrderId))
    if (!order) {
        closeDrawer()
        return
    }

    let steps = ""
    for (const key in statusNames) {
        let cls = "step"
        if (order.status === key) {
            cls += " active"
        }
        if (key === "canceled") {
            cls += " is-canceled"
        }
        steps += `<button type="button" class="${cls}" data-status="${key}">${statusNames[key]}</button>`
    }

    let itemsHtml = ""
    const items = order.items || []
    items.forEach(item => {
        itemsHtml += `<div class="order-item">
                <img src="${safe(item.imageUrl)}" alt="">
                <div class="item-info">
                    <div>${safe(item.title)}</div>
                    <div class="item-sub">Размер ${safe(item.size)}, цвет ${safe(item.color)}</div>
                </div>
                <div>${Number(item.quantity)} × ${money(item.price)}</div>
            </div>`
    });

    let contact = `<div><i class="fa-solid fa-user"></i><span>${safe(order.customerName)}</span></div>
            <div><i class="fa-solid fa-phone"></i><a href="tel:${safe(order.phone)}">${safe(order.phone)}</a></div>`
    if (order.email) {
        contact += `<div><i class="fa-solid fa-envelope"></i><span>${safe(order.email)}</span></div>`
    }
    if (order.address) {
        contact += `<div><i class="fa-solid fa-location-dot"></i><span>${safe(order.address)}</span></div>`
    }

    let discountLine = ""
    if (Number(order.discount) > 0) {
        discountLine = `<div class="sum-line"><span>Скидка</span><span>-${money(order.discount)}</span></div>`
    }

    let profitLine = ""
    const result = orderProfit(order)
    if (result.known > 0) {
        profitLine = `<div class="sum-line"><span>Прибыль по товарам с закупкой</span><b>${money(result.profit)}</b></div>`
    }

    drawerBody.innerHTML = `<div class="drawer-top">
            <div>
                <h2>№${order.id}</h2>
                <p>${safe(orderDate(order))}</p>
            </div>
            <button type="button" class="round-btn" id="drawer-close" aria-label="Закрыть"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div class="drawer-section">
            <div class="steps">${steps}</div>
        </div>
        <div class="drawer-section">
            <div class="contact">${contact}</div>
        </div>
        <div class="drawer-section">
            ${itemsHtml}
        </div>
        <div class="drawer-section">
            <div class="sum-line"><span>Товары</span><span>${money(order.subtotal)}</span></div>
            ${discountLine}
            <div class="sum-line"><span>Доставка</span><span>${money(order.delivery)}</span></div>
            <div class="sum-line total"><span>Итого</span><b>${money(order.total)}</b></div>
            ${profitLine}
        </div>
        <div class="drawer-section">
            <button type="button" class="danger-btn" id="drawer-delete"><i class="fa-solid fa-trash-can"></i> Удалить заказ</button>
        </div>`
}

drawerBody.addEventListener('click', async (event) => {
    if (event.target.closest("#drawer-close")) {
        closeDrawer()
        return
    }

    const stepBtn = event.target.closest(".step")
    if (stepBtn) {
        const id = openOrderId
        const status = stepBtn.dataset.status
        const order = ordersData.find(e => String(e.id) === String(id))
        if (order.status === status) {
            return
        }
        const oldStatus = order.status
        order.status = status
        renderAll()
        showToast(`Заказ №${id}: ${statusNames[status]}`)
        try {
            await axios.patch(`${API_ORDERS}/${id}`, { status: status })
            writeLog("order.status", `Заказ №${id}`, `${statusNames[oldStatus] || oldStatus} → ${statusNames[status]}`)
        } catch (error) {
            console.log("Ошибка при смене статуса:", error);
            showToast("Не удалось сменить статус", true)
            fetchOrders()
        }
        return
    }

    if (event.target.closest("#drawer-delete")) {
        const id = openOrderId
        const ok = confirm(`Удалить заказ №${id}?`)
        if (!ok) {
            return
        }
        ordersData = ordersData.filter(e => String(e.id) !== String(id))
        closeDrawer()
        renderAll()
        showToast(`Заказ №${id} удалён`)
        try {
            await axios.delete(`${API_ORDERS}/${id}`)
            writeLog("order.delete", `Заказ №${id}`, "Заказ удалён")
        } catch (error) {
            console.log("Ошибка при удалении заказа:", error);
            showToast("Не удалось удалить заказ", true)
            fetchOrders()
        }
    }
})

drawerBackdrop.addEventListener('click', closeDrawer)

document.addEventListener('keydown', (event) => {
    if (event.key === "Escape" && openOrderId !== null) {
        closeDrawer()
    }
    if (event.key === "Escape" && productEditor.classList.contains("open")) {
        resetForm()
    }
})

async function fetchProducts() {
    try {
        const response = await axios.get(API_PRODUCTS)
        productsData = response.data.sort((a, b) => a.id - b.id)
        renderProducts()
    } catch (error) {
        console.log("Ошибка: ", error);
        productsList.innerHTML = `<p class="empty">Не удалось загрузить товары</p>`
    }
}

function starsHtml(rating) {
    let stars = ""
    for (let i = 1; i <= 5; i++) {
        if (i <= rating) {
            stars += `<i class="fa-solid fa-star" style="color: #ffad33"></i>`
        }
        else if (i - 0.5 === rating) {
            stars += `<i class="fa-regular fa-star-half-stroke" style="color: #ffad33"></i>`
        }
        else {
            stars += `<i class="fa-regular fa-star" style="color: #ffad33"></i>`
        }
    }
    return stars
}

function calcPricing() {
    const price = Number(inputPrice.value)
    let oldPrice = null
    let discount = null
    if (inputOld.value !== "") {
        oldPrice = Number(inputOld.value)
        if (inputDiscount.value !== "") {
            discount = Number(inputDiscount.value)
        }
        else if (oldPrice > price && price > 0) {
            discount = Math.round((1 - price / oldPrice) * 100)
        }
    }
    return { price: price, oldPrice: oldPrice, discount: discount }
}

function renderPreview() {
    updateMarginNote()
    const pricing = calcPricing()
    let rating = 4
    if (inputRating.value !== "") {
        rating = Number(inputRating.value)
    }

    let image = `<i class="fa-regular fa-image"></i>`
    if (inputImage.value.trim() !== "") {
        image = `<img src="${safe(inputImage.value.trim())}" alt="">`
    }

    let title = "Название товара"
    if (inputTitle.value.trim() !== "") {
        title = safe(inputTitle.value.trim())
    }

    let oldHtml = ""
    if (pricing.oldPrice !== null) {
        oldHtml = `<s>$${pricing.oldPrice}</s>`
    }
    let discountHtml = ""
    if (pricing.discount !== null) {
        discountHtml = `<span>-${pricing.discount}%</span>`
    }

    preview.innerHTML = `<div class="pv-img">${image}</div>
        <div class="pv-info">
            <h3>${title}</h3>
            <div class="pv-stars">${starsHtml(rating)}<span>${rating}</span></div>
            <div class="pv-price"><b>$${pricing.price || 0}</b>${oldHtml}${discountHtml}</div>
        </div>
        <p class="pv-note">Так карточка выглядит в магазине. Любая картинка подгоняется под одинаковый размер</p>`
}

const previewInputs = [inputTitle, inputImage, inputPrice, inputOld, inputDiscount, inputRating, inputCost]
previewInputs.forEach(input => {
    input.addEventListener('input', () => {
        input.classList.remove("invalid")
        renderPreview()
    })
})

function renderProducts() {
    const search = productSearch.value.trim().toLowerCase()

    let html = ""
    let count = 0

    productsData.forEach(product => {
        if (productFilter !== "all" && product.category !== productFilter) {
            return
        }
        if (search !== "" && !String(product.title).toLowerCase().includes(search)) {
            return
        }
        count++

        let oldPrice = ""
        if (product.oldPrice !== null && product.oldPrice !== undefined) {
            oldPrice = `<s>$${Number(product.oldPrice)}</s>`
        }
        let discount = ""
        if (product.discount !== null && product.discount !== undefined) {
            discount = `<em>-${Number(product.discount)}%</em>`
        }
        let editing = ""
        if (editId !== null && String(editId) === String(product.id)) {
            editing = "editing"
        }

        let selected = ""
        let checked = ""
        if (selectedIds.includes(String(product.id))) {
            selected = "selected"
            checked = "checked"
        }

        html += `<article class="p-card p-row ${editing} ${selected}">
                <label class="p-check"><input type="checkbox" class="p-select" data-id="${product.id}" ${checked}></label>
                <img class="p-thumb" src="${safe(product.imageUrl)}" alt="" loading="lazy">
                <div class="p-main">
                    <h4>${safe(product.title)}</h4>
                    <p class="p-meta">${categoryNames[product.category] || "Top Selling"}, рейтинг ${Number(product.rating)}</p>
                </div>
                <div class="p-price"><b>$${Number(product.currentPrice)}</b>${oldPrice}${discount}</div>
                <div class="p-margin-cell">${marginLine(product)}</div>
                <div class="p-actions">
                    <button type="button" class="icon-btn edit-product" data-id="${product.id}" title="Изменить"><i class="fa-solid fa-pen"></i></button>
                    <button type="button" class="icon-btn red delete-product" data-id="${product.id}" title="Удалить"><i class="fa-solid fa-trash-can"></i></button>
                </div>
            </article>`
    });

    if (count === 0) {
        html = `<p class="empty">Товаров нет</p>`
    }
    productsList.innerHTML = html
    productCount.textContent = count
    updateBulkBar()
    renderStats()
    if (chartMetric === "profit") {
        renderChart()
    }
}

productsList.addEventListener('click', async (event) => {
    const editBtn = event.target.closest(".edit-product")
    const deleteBtn = event.target.closest(".delete-product")

    if (editBtn) {
        const product = productsData.find(e => String(e.id) === String(editBtn.dataset.id))
        editId = product.id
        inputTitle.value = product.title
        inputImage.value = product.imageUrl
        colorList.innerHTML = ""
        if (Array.isArray(product.colors) && product.colors.length > 0) {
            product.colors.forEach(item => addColorRow(item.name, item.hex, item.image))
        }
        else if (product.colorImages) {
            addColorRow("Olive", "#4F4E44", "")
            addColorRow("Green", "#314F4A", product.colorImages[0] || "")
            addColorRow("Navy", "#31344F", product.colorImages[1] || "")
        }
        inputPrice.value = product.currentPrice
        inputOld.value = ""
        if (product.oldPrice !== null && product.oldPrice !== undefined) {
            inputOld.value = product.oldPrice
        }
        inputDiscount.value = ""
        if (product.discount !== null && product.discount !== undefined) {
            inputDiscount.value = product.discount
        }
        inputRating.value = product.rating
        inputCost.value = ""
        if (product.costPrice !== null && product.costPrice !== undefined) {
            inputCost.value = product.costPrice
        }
        inputCategory.value = product.category
        inputDescription.value = product.description || ""
        formTitle.textContent = `Изменить товар №${product.id}`
        saveProductBtn.textContent = "Сохранить изменения"
        cancelEditBtn.hidden = false
        renderPreview()
        renderProducts()
        openEditor()
        return
    }

    if (deleteBtn) {
        const id = deleteBtn.dataset.id
        const ok = confirm("Удалить этот товар из магазина?")
        if (!ok) {
            return
        }
        const deleted = productsData.find(e => String(e.id) === String(id))
        productsData = productsData.filter(e => String(e.id) !== String(id))
        if (editId !== null && String(editId) === String(id)) {
            resetForm()
        }
        renderProducts()
        showToast("Товар удалён")
        try {
            await axios.delete(`${API_PRODUCTS}/${id}`)
            let deletedName = `Товар №${id}`
            if (deleted) {
                deletedName = deleted.title
            }
            writeLog("product.delete", deletedName, `Товар №${id} удалён`)
        } catch (error) {
            console.log("Ошибка при удалении товара:", error);
            showToast("Не удалось удалить товар", true)
            fetchProducts()
        }
    }
})

productSearch.addEventListener('input', renderProducts)

productChips.forEach(chip => {
    chip.addEventListener('click', () => {
        productFilter = chip.dataset.cat
        productChips.forEach(c => c.classList.remove("active"))
        chip.classList.add("active")
        renderProducts()
    })
})

function addColorRow(name, hex, image) {
    const row = document.createElement("div")
    row.className = "color-row"

    let value = "#000000"
    if (/^#[0-9a-fA-F]{6}$/.test(hex)) {
        value = hex
    }

    const picker = document.createElement("input")
    picker.type = "color"
    picker.className = "color-hex"
    picker.value = value
    picker.title = "Цвет"

    const nameInput = document.createElement("input")
    nameInput.type = "text"
    nameInput.className = "field color-name-input"
    nameInput.placeholder = "Название цвета, например Natural Titanium"
    nameInput.value = name || ""
    nameInput.addEventListener('input', () => nameInput.classList.remove("invalid"))

    const removeBtn = document.createElement("button")
    removeBtn.type = "button"
    removeBtn.className = "icon-btn red color-remove"
    removeBtn.title = "Убрать цвет"
    removeBtn.innerHTML = `<i class="fa-solid fa-xmark"></i>`
    removeBtn.addEventListener('click', () => row.remove())

    const imageInput = document.createElement("input")
    imageInput.type = "text"
    imageInput.className = "field color-image-input"
    imageInput.placeholder = "Ссылка на фото этого цвета (необязательно)"
    imageInput.value = image || ""

    row.appendChild(picker)
    row.appendChild(nameInput)
    row.appendChild(removeBtn)
    row.appendChild(imageInput)
    colorList.appendChild(row)
}

function readColors() {
    const colors = []
    const names = []
    const rows = colorList.querySelectorAll(".color-row")

    for (let i = 0; i < rows.length; i++) {
        const nameInput = rows[i].querySelector(".color-name-input")
        const name = nameInput.value.trim()

        if (name === "") {
            nameInput.classList.add("invalid")
            showToast("Укажите название у каждого цвета", true)
            return null
        }
        if (names.includes(name.toLowerCase())) {
            nameInput.classList.add("invalid")
            showToast(`Цвет «${name}» уже есть, каждый цвет указывается один раз`, true)
            return null
        }

        names.push(name.toLowerCase())
        colors.push({
            name: name,
            hex: rows[i].querySelector(".color-hex").value,
            image: rows[i].querySelector(".color-image-input").value.trim()
        })
    }

    return colors
}

addColorBtn.addEventListener('click', () => addColorRow("", "#000000", ""))

function openEditor() {
    productEditor.classList.add("open")
    editorBackdrop.classList.add("open")
    document.body.classList.add("no-scroll")
}

function closeEditor() {
    productEditor.classList.remove("open")
    editorBackdrop.classList.remove("open")
    document.body.classList.remove("no-scroll")
}

function resetForm() {
    closeEditor()
    editId = null
    inputTitle.value = ""
    inputImage.value = ""
    colorList.innerHTML = ""
    inputPrice.value = ""
    inputOld.value = ""
    inputDiscount.value = ""
    inputRating.value = ""
    inputCost.value = ""
    inputCategory.value = "new-arrivals"
    inputDescription.value = ""
    formTitle.textContent = "Новый товар"
    saveProductBtn.textContent = "Добавить товар"
    cancelEditBtn.hidden = true
    const formInputs = [inputTitle, inputImage, inputPrice, inputOld, inputDiscount, inputRating]
    formInputs.forEach(input => input.classList.remove("invalid"))
    renderPreview()
    renderProducts()
}

saveProductBtn.addEventListener('click', async () => {
    const title = inputTitle.value.trim()
    const image = inputImage.value.trim()
    const pricing = calcPricing()

    inputTitle.classList.remove("invalid")
    inputImage.classList.remove("invalid")
    inputPrice.classList.remove("invalid")
    if (title === "") {
        inputTitle.classList.add("invalid")
    }
    if (image === "") {
        inputImage.classList.add("invalid")
    }
    if (!(pricing.price > 0)) {
        inputPrice.classList.add("invalid")
    }

    if (title === "" || image === "" || !(pricing.price > 0)) {
        showToast("Заполните название, картинку и цену", true)
        return
    }

    let rating = 4
    if (inputRating.value !== "") {
        rating = Number(inputRating.value)
    }
    if (rating < 0 || rating > 5) {
        inputRating.classList.add("invalid")
        showToast("Рейтинг должен быть от 0 до 5", true)
        return
    }

    let costPrice = null
    if (inputCost.value !== "") {
        costPrice = Number(inputCost.value)
    }

    const colors = readColors()
    if (colors === null) {
        return
    }

    const product = {
        title: title,
        imageUrl: image,
        colors: colors,
        currentPrice: pricing.price,
        oldPrice: pricing.oldPrice,
        discount: pricing.discount,
        rating: rating,
        category: inputCategory.value,
        description: inputDescription.value.trim(),
        costPrice: costPrice
    }

    saveProductBtn.disabled = true
    try {
        if (editId === null) {
            const response = await axios.post(API_PRODUCTS, product)
            productsData.push(response.data)
            showToast("Товар добавлен")
            writeLog("product.create", product.title, `Цена ${money(product.currentPrice)}, раздел ${categoryNames[product.category]}`)
        }
        else {
            const index = productsData.findIndex(e => e.id === editId)
            const before = productsData[index]
            const response = await axios.patch(`${API_PRODUCTS}/${editId}`, product)
            productsData[index] = response.data
            showToast("Изменения сохранены")
            const changes = describeChanges(before, product)
            if (changes !== "") {
                let action = "product.update"
                if (Number(before.currentPrice) !== Number(product.currentPrice)) {
                    action = "product.price"
                }
                writeLog(action, product.title, changes)
            }
        }
        resetForm()
    } catch (error) {
        console.log("Ошибка при сохранении товара:", error);
        showToast("Не удалось сохранить товар", true)
    }
    saveProductBtn.disabled = false
})

cancelEditBtn.addEventListener('click', resetForm)
editorClose.addEventListener('click', resetForm)
editorBackdrop.addEventListener('click', resetForm)

newProductBtn.addEventListener('click', () => {
    resetForm()
    openEditor()
})

refreshBtn.addEventListener('click', () => {
    refreshBtn.classList.add("spinning")
    setTimeout(() => refreshBtn.classList.remove("spinning"), 700)
    fetchOrders()
    fetchProducts()
    showToast("Данные обновлены")
})

logoutBtn.addEventListener('click', () => {
    clearSession()
    window.location.href = "./login.html"
})

document.addEventListener("error", (event) => {
    const img = event.target
    if (img.tagName === "IMG" && !img.dataset.failed) {
        img.dataset.failed = "1"
        img.src = placeholder
    }
}, true)

function updateBulkBar() {
    const existing = productsData.map(e => String(e.id))
    selectedIds = selectedIds.filter(id => existing.includes(id))
    const count = selectedIds.length
    bulkCount.textContent = `Выбрано: ${count}`
    bulkButtons.forEach(btn => {
        btn.disabled = count === 0
    })
    bulkAll.checked = count > 0 && count === productsData.length
}

productsList.addEventListener('change', (event) => {
    const box = event.target.closest(".p-select")
    if (!box) {
        return
    }
    const card = box.closest(".p-card")
    if (box.checked) {
        selectedIds.push(String(box.dataset.id))
        card.classList.add("selected")
    }
    else {
        selectedIds = selectedIds.filter(id => id !== String(box.dataset.id))
        card.classList.remove("selected")
    }
    updateBulkBar()
})

bulkAll.addEventListener('change', () => {
    selectedIds = []
    if (bulkAll.checked) {
        productsData.forEach(product => {
            selectedIds.push(String(product.id))
        });
    }
    renderProducts()
})

async function applyPatches(patches, bulkText) {
    try {
        await Promise.all(patches.map(item => axios.patch(`${API_PRODUCTS}/${item.id}`, item.data)))
        patches.forEach(item => {
            const product = productsData.find(e => String(e.id) === String(item.id))
            for (const key in item.data) {
                product[key] = item.data[key]
            }
        });
        showToast(`Обновлено товаров: ${patches.length}`)
        writeLog("product.bulk", `Товаров: ${patches.length}`, bulkText)
    } catch (error) {
        console.log("Ошибка: ", error);
        showToast("Не удалось обновить часть товаров", true)
        fetchProducts()
    }
    renderProducts()
}

bulkButtons.forEach(btn => {
    btn.addEventListener('click', async () => {
        const type = btn.dataset.bulk
        const targets = productsData.filter(e => selectedIds.includes(String(e.id)))
        if (targets.length === 0) {
            return
        }

        if (type === "delete") {
            const ok = confirm(`Удалить выбранные товары (${targets.length})?`)
            if (!ok) {
                return
            }
            try {
                await Promise.all(targets.map(e => axios.delete(`${API_PRODUCTS}/${e.id}`)))
                productsData = productsData.filter(e => !selectedIds.includes(String(e.id)))
                selectedIds = []
                if (editId !== null && !productsData.find(e => e.id === editId)) {
                    resetForm()
                }
                showToast("Товары удалены")
                writeLog("product.bulk", `Товаров: ${targets.length}`, `Удалены: ${targets.map(e => e.title).join(", ")}`)
            } catch (error) {
                console.log("Ошибка: ", error);
                showToast("Не удалось удалить часть товаров", true)
                fetchProducts()
            }
            renderProducts()
            return
        }

        if (type === "discount") {
            const value = Number(prompt("Скидка в процентах (от 1 до 90):"))
            if (!(value >= 1 && value <= 90)) {
                showToast("Введите число от 1 до 90", true)
                return
            }
            const patches = targets.map(product => {
                let base = Number(product.currentPrice)
                if (product.oldPrice !== null && product.oldPrice !== undefined) {
                    base = Number(product.oldPrice)
                }
                return {
                    id: product.id,
                    data: { oldPrice: base, currentPrice: Math.round(base * (100 - value)) / 100, discount: value }
                }
            });
            await applyPatches(patches, `Скидка ${value}% на выбранные товары`)
            return
        }

        if (type === "nodiscount") {
            const patches = []
            targets.forEach(product => {
                if (product.oldPrice !== null && product.oldPrice !== undefined) {
                    patches.push({ id: product.id, data: { currentPrice: Number(product.oldPrice), oldPrice: null, discount: null } })
                }
            });
            if (patches.length === 0) {
                showToast("У выбранных товаров нет скидки", true)
                return
            }
            await applyPatches(patches, "Скидка снята")
            return
        }

        const patches = targets.map(product => {
            return { id: product.id, data: { category: type } }
        });
        await applyPatches(patches, `Перенос в раздел ${categoryNames[type]}`)
    })
})

function productCost(productId) {
    const product = productsData.find(e => String(e.id) === String(productId))
    if (!product || product.costPrice === undefined || product.costPrice === null || product.costPrice === "") {
        return null
    }
    return Number(product.costPrice)
}

function orderProfit(order) {
    const items = order.items || []
    const subtotal = Number(order.subtotal) || 0
    const discount = Number(order.discount) || 0
    let ratio = 1
    if (subtotal > 0) {
        ratio = (subtotal - discount) / subtotal
    }

    let profit = 0
    let revenue = 0
    let known = 0
    items.forEach(item => {
        const cost = productCost(item.productId)
        if (cost === null) {
            return
        }
        const qty = Number(item.quantity || 1)
        const income = Number(item.price) * qty * ratio
        revenue += income
        profit += income - cost * qty
        known++
    });
    return { profit: profit, revenue: revenue, known: known, total: items.length }
}

function renderProfit() {
    let profit = 0
    let revenue = 0
    let known = 0
    let total = 0
    ordersData.forEach(order => {
        if (order.status !== "done") {
            return
        }
        const result = orderProfit(order)
        profit += result.profit
        revenue += result.revenue
        known += result.known
        total += result.total
    });

    document.getElementById("dash-profit").textContent = money(profit)
    const note = document.getElementById("profit-note")
    if (known === 0) {
        note.textContent = "добавьте закупочную цену"
    }
    else {
        let margin = 0
        if (revenue > 0) {
            margin = Math.round(profit / revenue * 100)
        }
        note.textContent = `маржа ${margin}%, позиций: ${known} из ${total}`
    }
}

function updateMarginNote() {
    const price = Number(inputPrice.value)
    const cost = Number(inputCost.value)
    if (inputCost.value === "" || !(price > 0)) {
        marginNote.textContent = ""
        return
    }
    const profit = price - cost
    const margin = Math.round(profit / price * 100)
    marginNote.textContent = `Прибыль с единицы: ${money(profit)} (маржа ${margin}%)`
    if (profit < 0) {
        marginNote.classList.add("bad")
    }
    else {
        marginNote.classList.remove("bad")
    }
}

function marginLine(product) {
    if (product.costPrice === undefined || product.costPrice === null || product.costPrice === "") {
        return ""
    }
    const price = Number(product.currentPrice)
    const profit = price - Number(product.costPrice)
    let margin = 0
    if (price > 0) {
        margin = Math.round(profit / price * 100)
    }
    let bad = ""
    if (profit < 0) {
        bad = "bad"
    }
    return `<p class="p-margin ${bad}">Маржа ${margin}% (${money(profit)})</p>`
}

function describeChanges(before, after) {
    const names = { title: "название", imageUrl: "картинка", colors: "цвета", currentPrice: "цена", oldPrice: "старая цена", discount: "скидка", rating: "рейтинг", category: "раздел", description: "описание", costPrice: "закупка" }
    const parts = []
    for (const key in names) {
        if (!(key in after)) {
            continue
        }
        let oldValue = ""
        if (before[key] !== undefined && before[key] !== null) {
            oldValue = String(before[key])
        }
        let newValue = ""
        if (after[key] !== undefined && after[key] !== null) {
            newValue = String(after[key])
        }
        if (key === "colors") {
            oldValue = JSON.stringify(before[key] || [])
            newValue = JSON.stringify(after[key] || [])
        }
        if (oldValue === newValue) {
            continue
        }
        if (key === "description" || key === "imageUrl" || key === "colors") {
            parts.push(`${names[key]} изменено`)
        }
        else {
            parts.push(`${names[key]}: ${oldValue || "—"} → ${newValue || "—"}`)
        }
    }
    return parts.join("; ")
}

function playSound() {
    try {
        const AudioClass = window.AudioContext || window.webkitAudioContext
        const ctx = new AudioClass()
        const notes = [880, 1175]
        notes.forEach((frequency, index) => {
            const start = ctx.currentTime + index * 0.18
            const osc = ctx.createOscillator()
            const gain = ctx.createGain()
            osc.type = "sine"
            osc.frequency.value = frequency
            gain.gain.setValueAtTime(0.0001, start)
            gain.gain.exponentialRampToValueAtTime(0.25, start + 0.02)
            gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.2)
            osc.connect(gain)
            gain.connect(ctx.destination)
            osc.start(start)
            osc.stop(start + 0.22)
        })
        setTimeout(() => ctx.close(), 800)
    } catch (error) {
        console.log("Звук недоступен: ", error);
    }
}

function renderNotifyBtn() {
    if (notifyOn) {
        notifyBtn.classList.add("on")
        notifyBtn.title = "Уведомления включены"
    }
    else {
        notifyBtn.classList.remove("on")
        notifyBtn.title = "Уведомления выключены"
    }
}

function notifyNewOrder(order) {
    if (!notifyOn) {
        return
    }
    playSound()
    if (!("Notification" in window) || Notification.permission !== "granted") {
        return
    }
    try {
        const note = new Notification(`Новый заказ №${order.id}`, {
            body: `${order.customerName} · ${money(order.total)}`,
            tag: `order-${order.id}`
        })
        note.onclick = () => {
            window.focus()
            switchTab("orders-tab")
            openDrawer(order.id)
            note.close()
        }
    } catch (error) {
        console.log("Уведомление недоступно: ", error);
    }
}

notifyBtn.addEventListener('click', async () => {
    notifyOn = !notifyOn
    if (notifyOn) {
        playSound()
        if ("Notification" in window && Notification.permission === "default") {
            try {
                await Notification.requestPermission()
            } catch (error) {
                console.log("Ошибка: ", error);
            }
        }
        if (!("Notification" in window) || Notification.permission !== "granted") {
            showToast("Системные уведомления запрещены в браузере, будет только звук", true)
        }
        else {
            showToast("Уведомления включены")
        }
    }
    else {
        showToast("Уведомления выключены")
    }

    renderNotifyBtn()
    saveSettings()
})

async function refreshAccess() {
    const token = getToken()
    const fresh = await fetchFreshUser(session.user.id, token)
    if (fresh === null) {
        return true
    }

    if (isBannedRecord(fresh)) {
        clearSession()
        alert(banMessage(fresh))
        window.location.replace("./index.html")
        return false
    }

    saveSession(makeUser(fresh), token)
    session.user = getSession().user
    if (!isAdmin(session.user)) {
        window.location.replace("./index.html")
        return false
    }
    if (fresh.adminSettings) {
        loadSettings(fresh.adminSettings)
    }
    return true
}

async function start() {
    renderNotifyBtn()
    showTab("dashboard-tab")
    renderPreview()

    const stillAllowed = await refreshAccess()
    if (!stillAllowed) {
        return
    }

    fetchOrders()
    setInterval(fetchOrders, 10000)
    fetchProducts()
    updateBulkBar()
}

if (allowed) {
    start()
}