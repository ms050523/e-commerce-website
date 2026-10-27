const API = "https://bed1d07ffac740ee.mokky.dev/products"

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


const urlParams = new URLSearchParams(window.location.search)

const productId = urlParams.get('id')
console.log(productId);

async function fetchOneProduct() {
    try {
        const response = await axios.get(`${API}/${productId}`)
        renderDetailProduct(response.data)
    } catch (error) {
        console.error("Ошибка при загрузке товара:", error);
    }
}

function renderDetailProduct(product) {
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

let quantity = 1

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