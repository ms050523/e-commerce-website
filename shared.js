const API_PRODUCTS_SHARED = `${BASE_URL}/products`
const API_FAVORITES = `${BASE_URL}/favorites`

let favRecordId = null
let favLoaded = false
let favDirty = false
let favTimer = null

function favoritesKey() {
    const session = getSession()
    if (session === null) {
        return "favorites_guest"
    }
    return `favorites_${session.user.id}`
}

function getFavorites() {
    try {
        const raw = localStorage.getItem(favoritesKey())
        if (raw === null) {
            return []
        }
        return JSON.parse(raw).map(String)
    } catch (error) {
        console.log("Ошибка: ", error);
        return []
    }
}

function isFavorite(id) {
    return getFavorites().includes(String(id))
}

function updateFavCount() {
    const counter = document.getElementById("fav-count")
    if (!counter) {
        return
    }
    const count = getFavorites().length
    if (counter.textContent !== String(count)) {
        counter.classList.add("bump")
        setTimeout(() => counter.classList.remove("bump"), 400)
    }
    counter.textContent = count
    if (count > 0) {
        counter.style.display = "flex"
    }
    else {
        counter.style.display = "none"
    }
}

function toggleFavorite(id) {
    let list = getFavorites()
    const key = String(id)

    if (list.includes(key)) {
        list = list.filter(e => e !== key)
    }
    else {
        list.push(key)
    }

    try {
        localStorage.setItem(favoritesKey(), JSON.stringify(list))
    } catch (error) {
        console.log("Ошибка: ", error);
    }
    updateFavCount()
    saveFavoritesToServer()
    return list.includes(key)
}

function refreshFavUi() {
    updateFavCount()
    document.querySelectorAll("[data-fav]").forEach(btn => {
        const icon = btn.querySelector("i")
        if (isFavorite(btn.dataset.fav)) {
            btn.classList.add("active")
            icon.className = "fa-solid fa-heart"
        }
        else {
            btn.classList.remove("active")
            icon.className = "fa-regular fa-heart"
        }
    })
}

function saveFavoritesToServer() {
    const session = getSession()
    if (session === null) {
        return
    }
    if (!favLoaded) {
        favDirty = true
        return
    }

    clearTimeout(favTimer)
    favTimer = setTimeout(async () => {
        const body = { productIds: getFavorites(), userName: session.user.name }
        try {
            if (favRecordId !== null) {
                await axios.patch(`${API_FAVORITES}/${favRecordId}`, body)
            }
            else {
                body.userId = session.user.id
                const response = await axios.post(API_FAVORITES, body)
                favRecordId = response.data.id
            }
        } catch (error) {
            console.log("Избранное не сохранено на сервере: ", error);
        }
    }, 400)
}

async function loadFavoritesFromServer() {
    const session = getSession()
    if (session === null) {
        return
    }

    try {
        const response = await axios.get(API_FAVORITES)
        const mine = response.data.find(e => String(e.userId) === String(session.user.id))
        if (mine) {
            favRecordId = mine.id
            if (!favDirty) {
                localStorage.setItem(favoritesKey(), JSON.stringify((mine.productIds || []).map(String)))
            }
        }
        favLoaded = true
        if (favDirty || (!mine && getFavorites().length > 0)) {
            favDirty = false
            saveFavoritesToServer()
        }
        refreshFavUi()
    } catch (error) {
        console.log("Избранное с сервера не загружено: ", error);
    }
}

function showWarnings(record) {
    const list = (record.warnings || []).filter(e => !e.seen)
    if (list.length === 0 || document.getElementById("warn-overlay")) {
        return
    }

    let items = ""
    list.forEach(item => {
        const div = document.createElement("div")
        div.className = "warn-item"
        div.textContent = item.text
        items += div.outerHTML
    });

    const overlay = document.createElement("div")
    overlay.id = "warn-overlay"
    overlay.className = "warn-overlay"
    overlay.innerHTML = `<div class="warn-box">
            <div class="warn-icon"><i class="fa-solid fa-triangle-exclamation"></i></div>
            <h2>Предупреждение от администрации</h2>
            ${items}
            <p class="warn-hint">Повторные нарушения могут привести к ограничению или блокировке аккаунта.</p>
            <button type="button" class="warn-btn" id="warn-ok">Понятно</button>
        </div>`
    document.body.appendChild(overlay)

    document.getElementById("warn-ok").addEventListener('click', async () => {
        overlay.remove()
        const updated = (record.warnings || []).map(e => Object.assign({}, e, { seen: true }))
        try {
            await axios.patch(`${API_USERS}/${record.id}`, { warnings: updated }, { headers: getToken() ? { Authorization: `Bearer ${getToken()}` } : {} })
        } catch (error) {
            console.log("Предупреждение не отмечено прочитанным: ", error);
        }
    })
}

async function verifySession() {
    const session = getSession()
    if (session === null) {
        return
    }

    const fresh = await fetchFreshUser(session.user.id, getToken())
    if (fresh === null) {
        return
    }
    if (isBannedRecord(fresh)) {
        clearSession()
        alert(banMessage(fresh))
        window.location.href = "./index.html"
        return
    }

    const user = makeUser(fresh)
    if (user.role !== session.user.role || user.name !== session.user.name) {
        saveSession(user, getToken())
    }
    showWarnings(fresh)
}

function favButton(id) {
    let icon = "fa-regular"
    let active = ""
    if (isFavorite(id)) {
        icon = "fa-solid"
        active = "active"
    }
    return `<button type="button" class="fav-btn ${active}" data-fav="${id}" title="В избранное"><i class="${icon} fa-heart"></i></button>`
}

function bindFavButtons(root, onChange) {
    root.querySelectorAll("[data-fav]").forEach(btn => {
        btn.addEventListener('click', (event) => {
            event.preventDefault()
            event.stopPropagation()

            const active = toggleFavorite(btn.dataset.fav)
            const icon = btn.querySelector("i")
            btn.classList.add("pop")
            setTimeout(() => btn.classList.remove("pop"), 450)
            if (active) {
                btn.classList.add("active")
                icon.className = "fa-solid fa-heart"
            }
            else {
                btn.classList.remove("active")
                icon.className = "fa-regular fa-heart"
            }

            if (onChange) {
                onChange(btn.dataset.fav, active)
            }
        })
    })
}

function starsHtml(rating) {
    let stars = " "
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

function productCardInner(element) {
    let oldPrice = " "
    if (element.oldPrice !== null && element.oldPrice !== undefined) {
        oldPrice = `<span class="old-price">$${element.oldPrice}</span>`
    }
    let discount = " "
    if (element.discount !== null && element.discount !== undefined) {
        discount = `<span class="badge">-${element.discount}%</span>`
    }

    return `${favButton(element.id)}
            <a href="./detail.html?id=${element.id}" style="text-decoration: none; color: inherit;">
                <div class="card-visual">
                    <img src="${element.imageUrl}">
                </div>
                <div class="card-info">
                    <h3>${element.title}</h3>
                    <div class="product-rating">
                        ${starsHtml(element.rating)}
                        <span>${element.rating}/5</span>
                    </div>
                    <div class="card-price">
                        <span class="current-price">$${element.currentPrice}</span>
                        ${oldPrice}
                        ${discount}
                    </div>
                </div>
            </a>`
}

function addHeaderHeart() {
    const icons = document.querySelector(".header-icon")
    if (!icons) {
        return
    }

    const link = document.createElement("a")
    link.href = "./favorites.html"
    link.className = "fav-link"
    link.title = "Избранное"
    link.innerHTML = `<i class="fa-regular fa-heart"></i><span class="fav-count" id="fav-count"></span>`

    icons.insertBefore(link, icons.querySelector(".fa-cart-shopping"))
    updateFavCount()
}

let suggestProducts = null

async function loadSuggestProducts() {
    if (suggestProducts !== null) {
        return suggestProducts
    }
    try {
        const response = await axios.get(API_PRODUCTS_SHARED)
        suggestProducts = response.data
    } catch (error) {
        console.log("Ошибка: ", error);
        suggestProducts = []
    }
    return suggestProducts
}

function setupSearch() {
    const box = document.querySelector(".search-box")
    if (!box) {
        return
    }

    const input = box.querySelector("input")
    const mobileIcon = document.querySelector(".header-icon .fa-magnifying-glass")
    const list = document.createElement("div")
    list.className = "suggest"
    box.appendChild(list)

    function hide() {
        list.classList.remove("open")
    }

    async function show() {
        const text = input.value.trim().toLowerCase()
        if (text === "") {
            hide()
            return
        }

        const products = await loadSuggestProducts()
        const found = products.filter(e => String(e.title).toLowerCase().includes(text)).slice(0, 5)

        let html = ""
        if (found.length === 0) {
            html = `<div class="suggest-empty">Ничего не найдено</div>`
        }
        found.forEach(e => {
            html += `<a class="suggest-item" href="./detail.html?id=${e.id}">
                        <img src="${e.imageUrl}">
                        <span class="suggest-title">${e.title}</span>
                        <b>$${e.currentPrice}</b>
                    </a>`
        });
        if (found.length > 0) {
            html += `<a class="suggest-all" href="./category.html?search=${encodeURIComponent(input.value.trim())}">Показать все результаты</a>`
        }

        list.innerHTML = html
        list.classList.add("open")
    }

    input.addEventListener('input', show)
    input.addEventListener('focus', show)
    input.addEventListener('keydown', (event) => {
        if (event.key === "Escape") {
            hide()
        }
        if (event.key === "Enter") {
            const text = input.value.trim()
            if (text !== "" && !window.location.pathname.endsWith("category.html")) {
                window.location.href = `./category.html?search=${encodeURIComponent(text)}`
            }
        }
    })

    if (mobileIcon) {
        mobileIcon.style.cursor = "pointer"
        mobileIcon.addEventListener('click', (event) => {
            event.stopPropagation()
            box.classList.toggle("mobile-open")
            if (box.classList.contains("mobile-open")) {
                input.focus()
            }
        })
    }

    document.addEventListener('click', (event) => {
        if (!box.contains(event.target)) {
            hide()
            box.classList.remove("mobile-open")
        }
    })
}

addHeaderHeart()
setupSearch()
loadFavoritesFromServer()
verifySession()