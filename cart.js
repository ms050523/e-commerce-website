const API = "https://bed1d07ffac740ee.mokky.dev/basket"

const leftBox = document.getElementsByClassName("left-box")[0]

async function fetchBascket() {
    try {
        const response = await axios.get(API)
        renderBascket(response.data)
    } catch (error) {
        console.log("Ошибка: ", error);
    }
}


function renderBascket(data) {
    leftBox.innerHTML = ""
    data.forEach(element => {
        leftBox.innerHTML += `<div class="card">
                    <img src="${element.imageUrl}">
                    <div class="info">
                        <h3 class="name">${element.title}</h3>
                        <p class="text">Size: <span>${element.size}</span></p>
                        <p class="text">Color: <span>${element.color}</span></p>
                        <p class="price">$${element.price}</p>
                    </div>
                    <div class="controls">
                        <i class="fa-solid fa-trash-can" data-id= "${element.id}"></i>
                        <div class="counter">
                            <button class="btn-minus" data-id="${element.id}" data-quantity="${element.quantity}">-</button>
                            <span>${element.quantity}</span>
                            <button class="btn-plus" data-id="${element.id}" data-quantity="${element.quantity}">+</button>
                        </div>
                    </div>
                </div>`
    });
    const deleteBtn = document.querySelectorAll(".fa-trash-can")
    const btnPlus = document.querySelectorAll(".btn-plus")
    const btnMinus = document.querySelectorAll(".btn-minus")

    deleteBtn.forEach(btn => {
        btn.addEventListener('click', async () => {
            const id = btn.dataset.id
            try {
                await axios.delete(`${API}/${id}`)

                fetchBascket()
            } catch (error) {
                console.log("Ошибка при удалении:", error);
            }
        })
    })

    btnPlus.forEach(btn => {
        btn.addEventListener('click', async () => {
            const id = btn.dataset.id
            const currentQty = Number(btn.dataset.quantity)
            const newQty = currentQty + 1
            try {
                await axios.patch(`${API}/${id}`, { quantity: newQty })

                fetchBascket()
            } catch (error) {
                console.log("Ошибка при увеличении количества:", error);
            }
        })
    })

    btnMinus.forEach(btn => {
        btn.addEventListener('click', async () => {
            const id = btn.dataset.id
            const currentQty = Number(btn.dataset.quantity)

            if (currentQty > 1) {
                const newQty = currentQty - 1
                try {
                    await axios.patch(`${API}/${id}`, { quantity: newQty })

                    fetchBascket()
                } catch (error) {
                    console.log("Ошибка при уменьшении количества:", error);
                }
            }
        })
    })
}

fetchBascket()