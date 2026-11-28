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
    const value = Number(rating) || 0
    let stars = " "
    for (let i = 1; i <= 5; i++) {
        const left = value - (i - 1)
        if (left >= 0.75) {
            stars += `<i class="fa-solid fa-star" style="color: #ffad33"></i>`
        }
        else if (left >= 0.25) {
            stars += `<i class="fa-regular fa-star-half-stroke" style="color: #ffad33"></i>`
        }
        else {
            stars += `<i class="fa-regular fa-star" style="color: #ffad33"></i>`
        }
    }
    return stars
}

function productCardInner(element) {
    let reviewsText = ""
    if (Number(element.reviewsCount) > 0) {
        reviewsText = ` (${element.reviewsCount})`
    }

    let oldPrice = " "
    if (element.oldPrice !== null && element.oldPrice !== undefined) {
        oldPrice = `<span class="old-price">${formatPrice(element.oldPrice)}</span>`
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
                        <span>${element.rating}/5${reviewsText}</span>
                    </div>
                    <div class="card-price">
                        <span class="current-price">${formatPrice(element.currentPrice)}</span>
                        ${oldPrice}
                        ${discount}
                    </div>
                </div>
            </a>`
}

function showToast(text, kind, actionText, actionHref) {
    let box = document.getElementById("site-toasts")
    if (!box) {
        box = document.createElement("div")
        box.id = "site-toasts"
        document.body.appendChild(box)
    }

    let iconClass = "fa-circle-info"
    if (kind === "success") {
        iconClass = "fa-circle-check"
    }
    if (kind === "error") {
        iconClass = "fa-circle-exclamation"
    }

    const toast = document.createElement("div")
    toast.className = `site-toast ${kind || "info"}`

    const icon = document.createElement("i")
    icon.className = `fa-solid ${iconClass}`

    const message = document.createElement("span")
    message.textContent = text

    toast.appendChild(icon)
    toast.appendChild(message)

    if (actionText && actionHref) {
        const link = document.createElement("a")
        link.href = actionHref
        link.textContent = actionText
        toast.appendChild(link)
    }

    box.appendChild(toast)

    setTimeout(() => {
        toast.classList.add("hide")
        setTimeout(() => toast.remove(), 300)
    }, 3500)
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

const popularQueries = [
    { label: "Футболки", query: "футболк" },
    { label: "Джинсы", query: "джинс" },
    { label: "Худи", query: "худи" },
    { label: "Шорты", query: "шорт" }
]

const searchSynonyms = {
    "футболк": ["t-shirt", "tee"],
    "джинс": ["jeans"],
    "худи": ["hoodie"],
    "шорт": ["shorts"],
    "рубашк": ["shirt"],
    "поло": ["polo"],
    "куртк": ["jacket"],
    "свитшот": ["sweatshirt"]
}

function searchVariants(word) {
    const variants = [word]
    for (const key in searchSynonyms) {
        if (word.startsWith(key) || (word.length >= 3 && key.startsWith(word))) {
            searchSynonyms[key].forEach(item => variants.push(item))
        }
    }
    return variants
}

function searchEscape(text) {
    let value = ""
    if (text !== undefined && text !== null) {
        value = String(text)
    }
    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
}

function searchWords(text) {
    return String(text).toLowerCase().split(/\s+/).filter(word => word !== "")
}

function searchScore(product, words) {
    const title = String(product.title).toLowerCase()
    let score = 0
    for (let i = 0; i < words.length; i++) {
        let at = -1
        searchVariants(words[i]).forEach(variant => {
            const found = title.indexOf(variant)
            if (found !== -1 && (at === -1 || found < at)) {
                at = found
            }
        });
        if (at === -1) {
            return -1
        }
        if (at === 0) {
            score += 3
        }
        else if (title[at - 1] === " ") {
            score += 2
        }
        else {
            score += 1
        }
    }
    return score
}

function findProducts(products, words) {
    const found = []
    products.forEach(product => {
        const score = searchScore(product, words)
        if (score >= 0) {
            found.push({ product: product, score: score })
        }
    });
    found.sort((a, b) => {
        if (b.score !== a.score) {
            return b.score - a.score
        }
        return String(a.product.title).localeCompare(String(b.product.title))
    })
    return found.map(item => item.product)
}

function searchHighlight(title, words) {
    const full = String(title)
    if (words.length === 0) {
        return searchEscape(full)
    }
    let allWords = []
    words.forEach(word => {
        allWords = allWords.concat(searchVariants(word))
    });
    const pattern = allWords.map(word => word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")
    const parts = full.split(new RegExp(`(${pattern})`, "gi"))
    let html = ""
    parts.forEach((part, index) => {
        if (index % 2 === 1) {
            html += `<mark>${searchEscape(part)}</mark>`
        }
        else {
            html += searchEscape(part)
        }
    });
    return html
}

function searchPlural(number, forms) {
    const last = number % 10
    const lastTwo = number % 100
    if (lastTwo >= 11 && lastTwo <= 14) {
        return forms[2]
    }
    if (last === 1) {
        return forms[0]
    }
    if (last >= 2 && last <= 4) {
        return forms[1]
    }
    return forms[2]
}

function setupSearch() {
    const box = document.querySelector(".search-box")
    if (!box) {
        return
    }

    const input = box.querySelector("input")
    const icon = box.querySelector("i")
    const toggle = document.querySelector(".search-toggle")
    const listId = "search-list"

    input.setAttribute("type", "search")
    input.setAttribute("name", "q")
    input.setAttribute("autocomplete", "off")
    input.setAttribute("inputmode", "search")
    input.setAttribute("enterkeyhint", "search")
    input.setAttribute("aria-label", "Поиск товаров")
    input.setAttribute("placeholder", "Поиск товаров, например футболка…")
    input.setAttribute("role", "combobox")
    input.setAttribute("aria-autocomplete", "list")
    input.setAttribute("aria-expanded", "false")
    input.setAttribute("aria-controls", listId)
    input.spellcheck = false

    if (icon) {
        icon.setAttribute("aria-hidden", "true")
    }

    const key = document.createElement("kbd")
    key.className = "search-key"
    key.setAttribute("aria-hidden", "true")
    key.textContent = "/"

    const clearBtn = document.createElement("button")
    clearBtn.type = "button"
    clearBtn.className = "search-clear"
    clearBtn.setAttribute("aria-label", "Очистить поиск")
    clearBtn.innerHTML = `<i class="fa-solid fa-circle-xmark" aria-hidden="true"></i>`

    const list = document.createElement("div")
    list.className = "suggest"
    list.id = listId
    list.setAttribute("role", "listbox")
    list.setAttribute("aria-label", "Результаты поиска")

    const status = document.createElement("div")
    status.className = "sr-only"
    status.setAttribute("aria-live", "polite")

    box.appendChild(key)
    box.appendChild(clearBtn)
    box.appendChild(list)
    box.appendChild(status)

    let activeIndex = -1

    function options() {
        return list.querySelectorAll('[role="option"]')
    }

    function closeList() {
        list.classList.remove("open")
        input.setAttribute("aria-expanded", "false")
        input.removeAttribute("aria-activedescendant")
        activeIndex = -1
    }

    function openList() {
        list.classList.add("open")
        input.setAttribute("aria-expanded", "true")
    }

    function setActive(index) {
        const items = options()
        items.forEach(item => {
            item.classList.remove("active")
            item.setAttribute("aria-selected", "false")
        })
        activeIndex = index
        if (index >= 0 && items[index]) {
            items[index].classList.add("active")
            items[index].setAttribute("aria-selected", "true")
            input.setAttribute("aria-activedescendant", items[index].id)
            items[index].scrollIntoView({ block: "nearest" })
        }
        else {
            input.removeAttribute("aria-activedescendant")
        }
    }

    function showPopular() {
        let html = `<div class="suggest-head">Популярное</div><div class="suggest-tags">`
        popularQueries.forEach((item, index) => {
            html += `<a class="suggest-tag" role="option" aria-selected="false" tabindex="-1" id="search-opt-${index}" href="./category.html?search=${encodeURIComponent(item.query)}">${searchEscape(item.label)}</a>`
        });
        html += `</div>`
        list.innerHTML = html
        status.textContent = ""
        activeIndex = -1
        openList()
    }

    function showLoading() {
        list.innerHTML = `<div class="suggest-empty">Загрузка…</div>`
        openList()
    }

    async function update() {
        const text = input.value.trim()

        if (input.value !== "") {
            box.classList.add("has-text")
        }
        else {
            box.classList.remove("has-text")
        }

        if (text === "") {
            if (document.activeElement === input) {
                showPopular()
            }
            else {
                closeList()
            }
            return
        }

        if (suggestProducts === null) {
            showLoading()
        }

        const products = await loadSuggestProducts()
        if (input.value.trim() !== text) {
            return
        }

        const words = searchWords(text)
        const found = findProducts(products, words)
        const shown = found.slice(0, 6)

        if (found.length === 0) {
            list.innerHTML = `<div class="suggest-empty"><b>Ничего не найдено</b><span>Проверьте запрос или откройте каталог: <a href="./category.html">все товары</a></span></div>`
            status.textContent = "Ничего не найдено"
            activeIndex = -1
            openList()
            return
        }

        let html = ""
        shown.forEach((product, index) => {
            let oldPrice = ""
            if (product.oldPrice !== null && product.oldPrice !== undefined) {
                oldPrice = `<s>${formatPrice(product.oldPrice)}</s>`
            }
            html += `<a class="suggest-item" role="option" aria-selected="false" tabindex="-1" id="search-opt-${index}" href="./detail.html?id=${product.id}">
                        <img src="${searchEscape(product.imageUrl)}" alt="" width="44" height="44" loading="lazy">
                        <span class="suggest-text">
                            <span class="suggest-title">${searchHighlight(product.title, words)}</span>
                            <span class="suggest-price"><b>${formatPrice(product.currentPrice)}</b>${oldPrice}</span>
                        </span>
                    </a>`
        });
        html += `<a class="suggest-all" role="option" aria-selected="false" tabindex="-1" id="search-opt-${shown.length}" href="./category.html?search=${encodeURIComponent(input.value.trim())}">Показать все результаты (${found.length})</a>`
        html += `<div class="suggest-hint" aria-hidden="true"><kbd>↑</kbd><kbd>↓</kbd> выбор · <kbd>Enter</kbd>&nbsp;открыть · <kbd>Esc</kbd>&nbsp;закрыть</div>`

        list.innerHTML = html
        status.textContent = `Найдено ${found.length} ${searchPlural(found.length, ["товар", "товара", "товаров"])}`
        activeIndex = -1
        openList()
    }

    input.addEventListener('input', update)
    input.addEventListener('focus', update)

    input.addEventListener('keydown', (event) => {
        const items = options()

        if (event.key === "ArrowDown" && items.length > 0) {
            event.preventDefault()
            if (!list.classList.contains("open")) {
                update()
                return
            }
            setActive((activeIndex + 1) % items.length)
        }
        if (event.key === "ArrowUp" && items.length > 0) {
            event.preventDefault()
            if (activeIndex <= 0) {
                setActive(items.length - 1)
            }
            else {
                setActive(activeIndex - 1)
            }
        }
        if (event.key === "Enter") {
            if (activeIndex >= 0 && items[activeIndex]) {
                event.preventDefault()
                window.location.href = items[activeIndex].getAttribute("href")
                return
            }
            const text = input.value.trim()
            if (text !== "" && !window.location.pathname.endsWith("category.html")) {
                event.preventDefault()
                window.location.href = `./category.html?search=${encodeURIComponent(text)}`
            }
            else {
                closeList()
            }
        }
        if (event.key === "Escape") {
            if (list.classList.contains("open")) {
                closeList()
            }
            else if (input.value !== "") {
                input.value = ""
                input.dispatchEvent(new Event('input'))
            }
            else if (box.classList.contains("mobile-open")) {
                box.classList.remove("mobile-open")
                if (toggle) {
                    toggle.setAttribute("aria-expanded", "false")
                    toggle.focus()
                }
            }
        }
    })

    list.addEventListener('mousemove', (event) => {
        const item = event.target.closest('[role="option"]')
        if (!item) {
            return
        }
        const index = Array.prototype.indexOf.call(options(), item)
        if (index !== activeIndex) {
            setActive(index)
        }
    })

    clearBtn.addEventListener('click', () => {
        input.value = ""
        input.focus()
        input.dispatchEvent(new Event('input'))
    })

    box.addEventListener('focusout', (event) => {
        if (!box.contains(event.relatedTarget)) {
            closeList()
        }
    })

    document.addEventListener('click', (event) => {
        if (!box.contains(event.target) && !(toggle && toggle.contains(event.target))) {
            closeList()
            box.classList.remove("mobile-open")
            if (toggle) {
                toggle.setAttribute("aria-expanded", "false")
            }
        }
    })

    if (toggle) {
        toggle.addEventListener('click', (event) => {
            event.stopPropagation()
            box.classList.toggle("mobile-open")
            if (box.classList.contains("mobile-open")) {
                toggle.setAttribute("aria-expanded", "true")
                input.focus()
            }
            else {
                toggle.setAttribute("aria-expanded", "false")
                closeList()
            }
        })
    }

    document.addEventListener('keydown', (event) => {
        if (event.key !== "/" || event.metaKey || event.ctrlKey || event.altKey) {
            return
        }
        const active = document.activeElement
        if (active && (active.tagName === "INPUT" || active.tagName === "TEXTAREA" || active.tagName === "SELECT" || active.isContentEditable)) {
            return
        }
        event.preventDefault()
        if (window.matchMedia("(max-width: 768px)").matches && toggle) {
            toggle.click()
        }
        else {
            input.focus()
        }
    })

    setTimeout(() => {
        if (input.value !== "") {
            box.classList.add("has-text")
        }
    }, 0)
}

addHeaderHeart()
setupSearch()
loadFavoritesFromServer()
verifySession()