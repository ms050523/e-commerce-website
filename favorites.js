const API = `${BASE_URL}/products`

const favRow = document.getElementById("fav-row")

let allProducts = []

async function fetchProducts() {
    try {
        const response = await axios.get(API)
        allProducts = response.data.sort((a, b) => a.id - b.id)
        renderFavorites()
    } catch (error) {
        console.error("Ошибка при загрузке товаров:", error);
        favRow.innerHTML = `<p class="empty">Не удалось загрузить товары</p>`
    }
}

function renderFavorites() {
    const ids = getFavorites()
    let cards = ""

    allProducts.forEach(element => {
        if (ids.includes(String(element.id))) {
            cards += `<div class="product-card">${productCardInner(element)}</div>`
        }
    });

    if (cards === "") {
        cards = `<p class="empty">В избранном пока ничего нет. <a href="./index.html">Перейти к товарам</a></p>`
    }

    favRow.innerHTML = cards
    bindFavButtons(favRow, renderFavorites)
}

fetchProducts()