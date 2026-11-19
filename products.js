const API = `${BASE_URL}/products`

const newArrivals = document.getElementById("new-arrivals")
const topSelling = document.getElementById('top-selling');

async function fetchProducts() {
    try {
        const response = await axios.get(API)
        renderProducts(response.data.sort((a, b) => a.id - b.id))
    } catch (error) {
        console.error("Ошибка при загрузке товаров:", error);
    }
}

function renderProducts(data) {
    data.forEach(element => {
        let divCard = document.createElement('div')
        divCard.classList.add('product-card')
        divCard.innerHTML = productCardInner(element)
        bindFavButtons(divCard)
        if (element.category === 'new-arrivals') {
            newArrivals.appendChild(divCard)
        }
        else {
            topSelling.appendChild(divCard)
        }
    });
}

fetchProducts()