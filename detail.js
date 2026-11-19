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
const colorBtn = document.querySelectorAll(".color-btn")
const cartBtn = document.getElementsByClassName("cart-btn")[0]


const urlParams = new URLSearchParams(window.location.search)


const productId = urlParams.get('id')

let quantity = 1

let inCart = false

let currentProduct = null

async function fetchOneProduct() {
    try {
        const response = await axios.get(`${API}/${productId}`)
        renderDetailProduct(response.data)
    } catch (error) {
        console.error("Ошибка при загрузке товара:", error);
    }
}

function setInCart() {
    inCart = true
    cartBtn.textContent = "Go to Cart"
}

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
        alert("Чтобы добавить товар в корзину, войдите в аккаунт")
        window.location.href = `./login.html?next=${encodeURIComponent("detail.html?id=" + productId)}`
        return
    }

    const activeSize = document.querySelector(".size-btn.active")
    const size = activeSize.textContent

    const activeColor = document.querySelector(".color-btn.active")
    let color = "Olive"
    if (activeColor.classList.contains("color-2")) {
        color = "Green"
    }
    if (activeColor.classList.contains("color-3")) {
        color = "Navy"
    }

    if (currentProduct === null) {
        alert("Товар еще загружается, попробуйте через секунду")
        return
    }

    cartBtn.disabled = true
    cartBtn.textContent = "Adding..."

    const state = await getAccountState(session.user.id)
    if (state.banned) {
        clearSession()
        alert(state.banText)
        window.location.href = "./index.html"
        return
    }

    try {
        const product = currentProduct

        const basketResponse = await axios.get(API_CART)
        const found = basketResponse.data.find(e => {
            return String(e.userId) === String(session.user.id) && Number(e.productId) === Number(product.id)
        })

        if (found) {
            alert("Этот товар уже в корзине")
            setInCart()
        }
        else {
            await axios.post(API_CART, {
                userId: session.user.id,
                productId: product.id,
                title: product.title,
                imageUrl: product.imageUrl,
                price: product.currentPrice,
                size: size,
                color: color,
                quantity: quantity
            })
            alert("Товар добавлен в корзину")
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

function renderDetailProduct(product) {
    currentProduct = product
    title.innerHTML = product.title
    mainImg.src = product.imageUrl
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

    if (smallImages) {
        smallImages.innerHTML = `
            <img src="${product.imageUrl}" alt="${product.title}">
            <img src="${product.imageUrl}" alt="${product.title}">
            <img src="${product.imageUrl}" alt="${product.title}">
        `;
    }

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

colorBtn.forEach(e => {
    e.addEventListener('click', () => {
        colorBtn.forEach(c => c.classList.remove("active"))
        e.classList.add("active")
    })
});

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