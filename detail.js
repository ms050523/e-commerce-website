const API = `${BASE_URL}/products`
const API_CART = `${BASE_URL}/basket`


const title = document.getElementsByClassName("title")[0]
const mainImg = document.getElementsByClassName("main-img")[0]
const priceNow = document.getElementsByClassName("price-now")[0]
const priceOld = document.getElementsByClassName("price-old")[0]
const saleBadge = document.getElementsByClassName("sale-badge")[0]
const stars = document.getElementsByClassName("stars")[0]
const rating = document.getElementsByClassName("rating-num")[0]
const description = document.getElementsByClassName("description")[0]
const smallImages = document.getElementsByClassName("small-images")[0]
const sizeButtons = document.querySelectorAll(".size-btn")
const btnPlus = document.getElementsByClassName("plus-btn")[0]
const btnMinus = document.getElementsByClassName("minus-btn")[0]
const countNum = document.getElementsByClassName("count-num")[0]
const colorsWrap = document.querySelector(".colors-wrap")
const colorName = document.getElementById("color-name")
let colorBtn = []
const cartBtn = document.getElementsByClassName("cart-btn")[0]


const urlParams = new URLSearchParams(window.location.search)


const productId = urlParams.get('id')

let quantity = 1

// true - если этот товар уже лежит в корзине
let inCart = false

// сюда сохраняем товар после загрузки
let currentProduct = null

let currentImages = []
let currentColors = []
let currentColorIndex = 0

async function fetchOneProduct() {
    try {
        const response = await axios.get(`${API}/${productId}`)
        renderDetailProduct(response.data)
    } catch (error) {
        console.error("Ошибка при загрузке товара:", error);
    }
}

// товар уже в корзине - меняем кнопку
function setInCart() {
    inCart = true
    cartBtn.textContent = "Go to Cart"
}

// проверяем при открытии страницы, есть ли товар в корзине
async function checkCart() {
    const session = getSession()
    if (session === null) {
        return
    }

    try {
        const response = await axios.get(API_CART)
        const found = response.data.find(e => {
            return String(e.userId) === String(session.user.id) && Number(e.productId) === Number(productId)
        })
        if (found) {
            setInCart()
        }
    } catch (error) {
        console.log("Ошибка: ", error);
    }
}

async function ADD_TO_CART() {
    const session = getSession()
    if (session === null) {
        showToast("Войдите в аккаунт, чтобы добавить товар в корзину", "info", "Войти", `./login.html?next=${encodeURIComponent("detail.html?id=" + productId)}`)
        return
    }

    // выбранный размер
    const activeSize = document.querySelector(".size-btn.active")
    const size = activeSize.textContent

    // выбранный цвет
    let color = "Olive"
    if (currentColors[currentColorIndex]) {
        color = currentColors[currentColorIndex].name
    }

    if (currentProduct === null) {
        showToast("Товар ещё загружается, попробуйте через секунду", "info")
        return
    }

    cartBtn.disabled = true
    cartBtn.textContent = "Adding..."

    const state = await getAccountState(session.user.id)
    if (state.banned) {
        clearSession()
        showToast(state.banText, "error")
        setTimeout(() => {
            window.location.href = "./index.html"
        }, 2500)
        return
    }

    try {
        // товар уже загружен, второй раз его не запрашиваем
        const product = currentProduct

        // еще раз смотрим корзину, вдруг товар уже добавили (например в другой вкладке)
        const basketResponse = await axios.get(API_CART)
        const found = basketResponse.data.find(e => {
            return String(e.userId) === String(session.user.id) && Number(e.productId) === Number(product.id)
        })

        if (found) {
            showToast("Этот товар уже в корзине", "info", "В корзину", "./cart.html")
            setInCart()
        }
        else {
            await axios.post(API_CART, {
                userId: session.user.id,
                productId: product.id,
                title: product.title,
                imageUrl: currentImages[currentColorIndex] || product.imageUrl,
                price: product.currentPrice,
                size: size,
                color: color,
                quantity: quantity
            })
            showToast("Товар добавлен в корзину", "success", "Перейти в корзину", "./cart.html")
            setInCart()
        }
    } catch (error) {
        console.log("Ошибка: ", error);
    }
    cartBtn.disabled = false
    if (inCart === false) {
        cartBtn.textContent = "Add to Cart"
    }
}

function buildColors(product) {
    const list = []
    const used = []

    if (Array.isArray(product.colors)) {
        product.colors.forEach(item => {
            if (!item || !item.name || used.includes(String(item.name).toLowerCase())) {
                return
            }
            let hex = "#000000"
            if (/^#[0-9a-fA-F]{3,8}$/.test(item.hex)) {
                hex = item.hex
            }
            used.push(String(item.name).toLowerCase())
            list.push({ name: item.name, hex: hex, image: item.image || product.imageUrl })
        });
    }

    if (list.length > 0) {
        return list
    }

    const extra = product.colorImages || []
    return [
        { name: "Olive", hex: "#4F4E44", image: product.imageUrl },
        { name: "Green", hex: "#314F4A", image: extra[0] || product.imageUrl },
        { name: "Navy", hex: "#31344F", image: extra[1] || product.imageUrl }
    ]
}

function renderColors() {
    colorsWrap.innerHTML = ""
    currentColors.forEach((item, index) => {
        const btn = document.createElement("button")
        btn.type = "button"
        btn.className = "color-btn"
        btn.style.backgroundColor = item.hex
        btn.title = item.name
        btn.setAttribute("aria-label", item.name)
        btn.addEventListener('click', () => showColorImage(index))
        colorsWrap.appendChild(btn)
    });
    colorBtn = colorsWrap.querySelectorAll(".color-btn")
}

function renderThumbs() {
    if (!smallImages || currentProduct === null) {
        return
    }

    smallImages.innerHTML = ""
    currentImages.forEach((url, index) => {
        const img = document.createElement("img")
        img.src = url
        img.alt = currentProduct.title
        img.dataset.index = index
        if (index === currentColorIndex) {
            img.classList.add("active")
        }
        smallImages.appendChild(img)
    });
}

function showColorImage(index) {
    currentColorIndex = index

    if (currentColors[index]) {
        colorName.textContent = currentColors[index].name
    }

    colorBtn.forEach((c, i) => {
        if (i === index) {
            c.classList.add("active")
        }
        else {
            c.classList.remove("active")
        }
    })

    if (smallImages) {
        smallImages.querySelectorAll("img").forEach((img, i) => {
            if (i === index) {
                img.classList.add("active")
            }
            else {
                img.classList.remove("active")
            }
        })
    }

    const url = currentImages[index]
    if (!url || mainImg.getAttribute("src") === url) {
        return
    }

    mainImg.classList.add("swap")
    const loader = new Image()
    loader.onload = () => {
        mainImg.src = url
        mainImg.classList.remove("swap")
    }
    loader.onerror = () => {
        mainImg.src = url
        mainImg.classList.remove("swap")
    }
    loader.src = url
}

function renderDetailProduct(product) {
    currentProduct = product
    title.innerHTML = product.title
    currentColors = buildColors(product)
    currentImages = currentColors.map(item => item.image)
    currentColorIndex = 0
    renderColors()
    mainImg.src = currentImages[0]
    priceNow.innerHTML = `$${product.currentPrice}`


    if (product.oldPrice !== null) {
        priceOld.innerHTML = `$${product.oldPrice}`
    }
    else {
        priceOld.innerHTML = " "
    }
    if (product.discount !== null) {
        saleBadge.innerHTML = `-${product.discount}%`
    }
    else {
        saleBadge.innerHTML = " "
        saleBadge.style.display = 'none'
    }

    renderThumbs()
    showColorImage(0)

    description.innerHTML = product.description

    let star = ""
    for (let i = 1; i <= 5; i++) {
        if (i <= product.rating) {
            star += `<i class="fa-solid fa-star" style="color: #ffad33"></i>`
        }
        else if (i - 0.5 === product.rating) {
            star += `<i class="fa-regular fa-star-half-stroke" style="color: #ffad33"></i>`
        }
        else {
            star += `<i class="fa-regular fa-star" style="color: #ffad33"></i>`
        }
    }
    stars.innerHTML = star
    rating.innerHTML = `${product.rating}/5`
}

cartBtn.addEventListener('click', () => {
    if (inCart) {
        window.location.href = "./cart.html"
    }
    else {
        ADD_TO_CART()
    }
})


sizeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        sizeButtons.forEach(a => a.classList.remove('active'))
        btn.classList.add('active')
    })
});

if (smallImages) {
    smallImages.addEventListener('click', (event) => {
        const img = event.target.closest("img")
        if (img) {
            showColorImage(Number(img.dataset.index))
        }
    })
}

btnPlus.addEventListener('click', () => {
    quantity++
    countNum.textContent = quantity
    btnMinus.classList.remove("disabled")
})

btnMinus.addEventListener('click', () => {
    if (quantity > 1) {
        quantity--
        countNum.textContent = quantity
    }
    
    if (quantity === 1 ) {
        btnMinus.classList.add("disabled")
    }
})

fetchOneProduct()
checkCart()