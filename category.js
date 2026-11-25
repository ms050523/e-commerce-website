const API = `${BASE_URL}/products`

const productRow = document.getElementById("category-row")
const searchInput = document.querySelector(".search-box input")
const typeRows = document.querySelectorAll(".sidebar .block")[0].querySelectorAll(".row")
const priceLine = document.querySelector(".price-box .line")
const progress = document.querySelector(".price-box .progress")
const circleLeft = document.querySelector(".circle-left")
const circleRight = document.querySelector(".circle-right")
const priceValues = document.querySelectorAll(".price-box .values span")
const colorItems = document.querySelectorAll(".color-item")
const sizeItems = document.querySelectorAll(".size-item")
const styleRows = document.querySelectorAll(".last-block .row")
const applyBtn = document.querySelector(".sidebar .btn")
const sidebar = document.querySelector(".sidebar")
const filterBtn = document.getElementById("filter-btn")
const filterClose = document.getElementById("filter-close")
const filterBackdrop = document.getElementById("filter-backdrop")
const filterDot = document.getElementById("filter-dot")

let allProducts = []
let maxPrice = 200
let leftPercent = 0
let rightPercent = 100
let activeType = ""

function openFilter() {
    sidebar.classList.add("open")
    filterBackdrop.classList.add("open")
    filterBtn.setAttribute("aria-expanded", "true")
    document.body.classList.add("no-scroll")
}

function closeFilter() {
    sidebar.classList.remove("open")
    filterBackdrop.classList.remove("open")
    filterBtn.setAttribute("aria-expanded", "false")
    document.body.classList.remove("no-scroll")
}

function updateFilterDot() {
    if (activeType !== "" || leftPercent > 0 || rightPercent < 100) {
        filterDot.classList.add("on")
    }
    else {
        filterDot.classList.remove("on")
    }
}

function percentToPrice(percent) {
    return Math.round(Math.pow(percent / 100, 3) * maxPrice)
}

function renderSlider() {
    circleLeft.style.left = `${leftPercent}%`
    circleRight.style.right = `${100 - rightPercent}%`
    progress.style.left = `${leftPercent}%`
    progress.style.right = `${100 - rightPercent}%`
    priceValues[0].textContent = `$${percentToPrice(leftPercent)}`
    priceValues[1].textContent = `$${percentToPrice(rightPercent)}`
}

function startDrag(circle, side) {
    circle.addEventListener('pointerdown', (event) => {
        event.preventDefault()
        circle.setPointerCapture(event.pointerId)

        function move(e) {
            const rect = priceLine.getBoundingClientRect()
            let percent = (e.clientX - rect.left) / rect.width * 100
            if (percent < 0) {
                percent = 0
            }
            if (percent > 100) {
                percent = 100
            }

            if (side === "left") {
                if (percent > rightPercent - 3) {
                    percent = rightPercent - 3
                }
                leftPercent = percent
            }
            else {
                if (percent < leftPercent + 3) {
                    percent = leftPercent + 3
                }
                rightPercent = percent
            }
            renderSlider()
            renderCategory()
        }

        function stop() {
            circle.removeEventListener('pointermove', move)
            circle.removeEventListener('pointerup', stop)
            circle.removeEventListener('pointercancel', stop)
        }

        circle.addEventListener('pointermove', move)
        circle.addEventListener('pointerup', stop)
        circle.addEventListener('pointercancel', stop)
    })
}

async function fetchProducts() {
    try {
        const response = await axios.get(API)
        allProducts = response.data.sort((a, b) => a.id - b.id)

        let max = 0
        allProducts.forEach(element => {
            if (Number(element.currentPrice) > max) {
                max = Number(element.currentPrice)
            }
        });
        if (max > 0) {
            maxPrice = max
        }
        renderSlider()
        renderCategory()
    } catch (error) {
        console.error("Ошибка при загрузке товаров:", error);
        productRow.innerHTML = `<p class="empty">Не удалось загрузить товары</p>`
    }
}

function renderCategory() {
    const search = searchInput.value.trim().toLowerCase()
    const minPrice = percentToPrice(leftPercent)
    let maxFilter = percentToPrice(rightPercent)
    if (rightPercent === 100) {
        maxFilter = Infinity
    }

    let cards = ""
    let count = 0

    allProducts.forEach(element => {
        const title = String(element.title).toLowerCase()
        const price = Number(element.currentPrice)

        if (search !== "" && !searchWords(search).every(word => title.includes(word))) {
            return
        }
        if (activeType !== "" && !title.includes(activeType)) {
            return
        }
        if (price < minPrice || price > maxFilter) {
            return
        }
        count++

        cards += `<div class="product-card">${productCardInner(element)}</div>`
    });

    if (count === 0) {
        cards = `<p class="empty">Товары не найдены</p>`
    }
    productRow.innerHTML = cards
    bindFavButtons(productRow)
    updateFilterDot()
}

typeRows.forEach(row => {
    row.addEventListener('click', () => {
        const word = row.textContent.trim().toLowerCase().replace(/s$/, "")
        const wasActive = row.classList.contains("active")

        typeRows.forEach(r => r.classList.remove("active"))
        if (wasActive) {
            activeType = ""
        }
        else {
            row.classList.add("active")
            activeType = word
        }
        renderCategory()
    })
})

colorItems.forEach(item => {
    item.addEventListener('click', () => {
        colorItems.forEach(c => c.classList.remove("active"))
        item.classList.add("active")
    })
})

sizeItems.forEach(item => {
    item.addEventListener('click', () => {
        sizeItems.forEach(s => s.classList.remove("active"))
        item.classList.add("active")
    })
})

styleRows.forEach(row => {
    row.addEventListener('click', () => {
        styleRows.forEach(r => r.classList.remove("active"))
        row.classList.add("active")
    })
})

applyBtn.addEventListener('click', renderCategory)

searchInput.addEventListener('input', () => {
    const url = new URL(window.location.href)
    if (searchInput.value.trim() === "") {
        url.searchParams.delete("search")
    }
    else {
        url.searchParams.set("search", searchInput.value.trim())
    }
    history.replaceState(null, "", url)
})
applyBtn.addEventListener('click', closeFilter)
filterBtn.addEventListener('click', openFilter)
filterClose.addEventListener('click', closeFilter)
filterBackdrop.addEventListener('click', closeFilter)

document.addEventListener('keydown', (event) => {
    if (event.key === "Escape") {
        closeFilter()
    }
})

window.addEventListener('resize', () => {
    if (window.innerWidth > 768) {
        closeFilter()
    }
})
searchInput.addEventListener('input', renderCategory)

const urlParams = new URLSearchParams(window.location.search)
if (urlParams.get("search") !== null) {
    searchInput.value = urlParams.get("search")
}

startDrag(circleLeft, "left")
startDrag(circleRight, "right")
renderSlider()
fetchProducts()