const API_REVIEWS = `${BASE_URL}/reviews`
const API_ORDERS_FOR_REVIEWS = `${BASE_URL}/orders`
const API_PRODUCTS_FOR_REVIEWS = `${BASE_URL}/products`

const reviewsList = document.getElementById("reviews-list")
const reviewsCount = document.getElementById("reviews-count")
const reviewsAvg = document.getElementById("reviews-avg")
const writeBtn = document.getElementById("write-review-btn")
const reviewForm = document.getElementById("review-form")
const starPick = document.getElementById("star-pick")
const starButtons = starPick.querySelectorAll("button")
const reviewInput = document.getElementById("review-text")
const reviewCounter = document.getElementById("review-counter")
const reviewError = document.getElementById("review-error")
const reviewCancel = document.getElementById("review-cancel")
const reviewSubmit = document.getElementById("review-submit")
const ratingStars = document.querySelector(".stars")
const ratingNumber = document.querySelector(".rating-num")
const ratingCount = document.getElementById("rating-count")

let allReviews = []
let pickedStars = 0
let deleteId = null
let deleteTimer = null

function reviewSafe(text) {
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

function reviewDate(review) {
    const date = new Date(review.createdAt)
    if (isNaN(date.getTime())) {
        return ""
    }
    return date.toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })
}

function reviewsPlural(number) {
    const last = number % 10
    const lastTwo = number % 100
    if (lastTwo >= 11 && lastTwo <= 14) {
        return "отзывов"
    }
    if (last === 1) {
        return "отзыв"
    }
    if (last >= 2 && last <= 4) {
        return "отзыва"
    }
    return "отзывов"
}

function averageRating() {
    let sum = 0
    allReviews.forEach(review => {
        sum += Number(review.rating)
    });
    return Math.round(sum / allReviews.length * 10) / 10
}

function showRatingCount() {
    if (allReviews.length === 0) {
        ratingCount.textContent = "Отзывов пока нет"
        return
    }
    ratingCount.textContent = `${allReviews.length} ${reviewsPlural(allReviews.length)}`
}

async function saveAverageRating() {
    if (allReviews.length === 0) {
        try {
            await axios.patch(`${API_PRODUCTS_FOR_REVIEWS}/${productId}`, { reviewsCount: 0 })
        } catch (error) {
            console.log("Ошибка: ", error);
        }
        return
    }

    const average = averageRating()
    ratingStars.innerHTML = starsHtml(average)
    ratingNumber.textContent = `${average}/5`

    try {
        await axios.patch(`${API_PRODUCTS_FOR_REVIEWS}/${productId}`, { rating: average, reviewsCount: allReviews.length })
    } catch (error) {
        console.log("Рейтинг не сохранён: ", error);
    }
}

function loginLink() {
    return `./login.html?next=${encodeURIComponent("detail.html?id=" + productId)}`
}

async function fetchReviews() {
    try {
        const response = await axios.get(API_REVIEWS)
        allReviews = response.data
            .filter(e => String(e.productId) === String(productId))
            .sort((a, b) => b.id - a.id)
        renderReviews()
        if (allReviews.length > 0) {
            const average = averageRating()
            ratingStars.innerHTML = starsHtml(average)
            ratingNumber.textContent = `${average}/5`
        }
    } catch (error) {
        console.log("Ошибка: ", error);
        reviewsList.innerHTML = `<p class="reviews-empty">Не удалось загрузить отзывы</p>`
    }
}

function renderReviews() {
    reviewsCount.textContent = allReviews.length
    showRatingCount()

    if (allReviews.length === 0) {
        reviewsAvg.innerHTML = ""
        reviewsList.innerHTML = `<p class="reviews-empty">Отзывов пока нет. Станьте первым, кто оставит отзыв</p>`
        return
    }

    const average = averageRating()
    reviewsAvg.innerHTML = `${starsHtml(Math.round(average * 2) / 2)}<b>${average}</b><span>из 5</span>`

    const session = getSession()
    let html = ""

    allReviews.forEach(review => {
        let verified = ""
        if (review.verified) {
            verified = `<i class="fa-solid fa-circle-check" style="color: rgb(70, 146, 31);" title="Покупал этот товар"></i>`
        }

        let del = ""
        if (session !== null && (String(review.userId) === String(session.user.id) || isAdmin(session.user))) {
            let label = `<i class="fa-solid fa-trash-can"></i>`
            let cls = "review-del"
            if (String(deleteId) === String(review.id)) {
                label = "Удалить?"
                cls += " sure"
            }
            del = `<button type="button" class="${cls}" data-id="${review.id}" title="Удалить отзыв">${label}</button>`
        }

        html += `<div class="reviews-card">
                ${del}
                <div class="rating">${starsHtml(Number(review.rating))}</div>
                <div class="user-name">
                    <p>${reviewSafe(review.userName)}</p>
                    ${verified}
                </div>
                <p class="review-text">${reviewSafe(review.text)}</p>
                <p class="review-date">Опубликовано ${reviewDate(review)}</p>
            </div>`
    });

    reviewsList.innerHTML = html
}

function renderPickedStars() {
    starButtons.forEach(btn => {
        const icon = btn.querySelector("i")
        if (Number(btn.dataset.star) <= pickedStars) {
            icon.className = "fa-solid fa-star"
        }
        else {
            icon.className = "fa-regular fa-star"
        }
    })
}

function resetReviewForm() {
    pickedStars = 0
    renderPickedStars()
    reviewInput.value = ""
    reviewCounter.textContent = "0/500"
    reviewError.textContent = ""
    reviewForm.hidden = true
}

writeBtn.addEventListener('click', () => {
    const session = getSession()
    if (session === null) {
        showToast("Войдите в аккаунт, чтобы написать отзыв", "info", "Войти", loginLink())
        return
    }

    const mine = allReviews.find(e => String(e.userId) === String(session.user.id))
    if (mine) {
        showToast("Вы уже оставили отзыв на этот товар", "info")
        return
    }

    reviewForm.hidden = false
    reviewInput.focus()
})

starButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        pickedStars = Number(btn.dataset.star)
        reviewError.textContent = ""
        renderPickedStars()
    })
})

reviewInput.addEventListener('input', () => {
    reviewCounter.textContent = `${reviewInput.value.length}/500`
    reviewError.textContent = ""
})

reviewCancel.addEventListener('click', resetReviewForm)

reviewForm.addEventListener('submit', async (event) => {
    event.preventDefault()

    const session = getSession()
    if (session === null) {
        showToast("Войдите в аккаунт, чтобы написать отзыв", "info", "Войти", loginLink())
        return
    }

    const text = reviewInput.value.trim()

    if (pickedStars === 0) {
        reviewError.textContent = "Поставьте оценку"
        return
    }
    if (text.length < 10) {
        reviewError.textContent = "Напишите хотя бы 10 символов"
        return
    }

    reviewSubmit.disabled = true
    reviewSubmit.textContent = "Отправляем..."

    const state = await getAccountState(session.user.id)
    if (state.banned) {
        clearSession()
        showToast(state.banText, "error")
        setTimeout(() => {
            window.location.href = "./index.html"
        }, 2500)
        return
    }

    let verified = false
    try {
        const response = await axios.get(API_ORDERS_FOR_REVIEWS)
        response.data.forEach(order => {
            if (String(order.userId) !== String(session.user.id) || order.status === "canceled") {
                return
            }
            const items = order.items || []
            items.forEach(item => {
                if (String(item.productId) === String(productId)) {
                    verified = true
                }
            });
        });
    } catch (error) {
        console.log("Ошибка: ", error);
    }

    const review = {
        productId: productId,
        userId: session.user.id,
        userName: session.user.name,
        rating: pickedStars,
        text: text,
        verified: verified,
        createdAt: new Date().toISOString()
    }

    try {
        const response = await axios.post(API_REVIEWS, review)
        allReviews.unshift(response.data)
        renderReviews()
        resetReviewForm()
        saveAverageRating()
        showToast("Спасибо! Отзыв опубликован", "success")
        writeLog("review.create", `Товар №${productId}`, `Оценка ${review.rating}`)
    } catch (error) {
        console.log("Ошибка при отправке отзыва:", error);
        reviewError.textContent = "Не удалось отправить отзыв, попробуйте позже"
    }

    reviewSubmit.disabled = false
    reviewSubmit.textContent = "Отправить"
})

reviewsList.addEventListener('click', async (event) => {
    const btn = event.target.closest(".review-del")
    if (!btn) {
        return
    }

    const id = btn.dataset.id

    if (String(deleteId) !== String(id)) {
        deleteId = id
        clearTimeout(deleteTimer)
        deleteTimer = setTimeout(() => {
            deleteId = null
            renderReviews()
        }, 3000)
        renderReviews()
        return
    }

    clearTimeout(deleteTimer)
    deleteId = null

    try {
        await axios.delete(`${API_REVIEWS}/${id}`)
        allReviews = allReviews.filter(e => String(e.id) !== String(id))
        renderReviews()
        saveAverageRating()
        showToast("Отзыв удалён", "success")
        writeLog("review.delete", `Товар №${productId}`, `Отзыв №${id} удалён`)
    } catch (error) {
        console.log("Ошибка при удалении отзыва:", error);
        showToast("Не удалось удалить отзыв", "error")
        renderReviews()
    }
})

fetchReviews()