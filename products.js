const API = "https://bed1d07ffac740ee.mokky.dev/products"
const newArrivals = document.getElementById("new-arrivals")
const topSelling = document.getElementById('top-selling');


async function fetchProducts() {
    try {
        const response = await axios.get(API)
        renderProducts(response.data)
    } catch (error) {
        console.error("Ошибка при загрузке товаров:", error);
    }
}

function renderProducts(data) {
    data.forEach(element => {
        let oldPrice = " "
        if (element.oldPrice !== null) {
            oldPrice = `<span class="old-price">$${element.oldPrice}</span>`
        }
        let discount = " "
        if (element.discount !== null) {
            discount = `<span class="badge">-${element.discount}%</span>`
        }
        let stars = " "
        for (let i = 1; i <= 5; i++) {
            if (i <= element.rating) {
                stars += `<i class="fa-solid fa-star" style="color: #ffad33"></i>`
            }
            else if (i - 0.5 === element.rating) {
                stars += `<i class="fa-regular fa-star-half-stroke" style="color: #ffad33"></i>`
            }
            else {
                 stars += `<i class="fa-regular fa-star" style="color: #ffad33"></i>`
            }
        }
        let divCard = document.createElement('div')
        divCard.classList.add('product-card')
        divCard.innerHTML = ` <a href="./detail.html?id=${element.id}" style="text-decoration: none; color: inherit;">
                <div class="card-visual">
                    <img src="${element.imageUrl}">
                </div>
                <div class="card-info">
                    <h3>${element.title}</h3>
                    <div class="product-rating">
                        ${stars}
                        <span>${element.rating}</span>
                    </div>
                    <div class="card-price">
                        <span class="current-price">$${element.currentPrice}</span>
                        ${oldPrice}
                        ${discount}
                    </div>
                </div>
            </a>`
        if (element.category === 'new-arrivals') {
            newArrivals.appendChild(divCard)
        }
        else {
            topSelling.appendChild(divCard)
        }
    });
}

fetchProducts()