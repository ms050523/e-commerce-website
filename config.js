const BASE_URL = "https://5809b9fdfd824e69.mokky.dev"
const AUTH_URL = BASE_URL

const ADMIN_EMAILS = ["admin@shop.com", "admin@shop.co"]

const CURRENCY_FORMAT = new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB", minimumFractionDigits: 0, maximumFractionDigits: 2 })
const DELIVERY_FEE = 300

function formatPrice(value) {
    return CURRENCY_FORMAT.format(Number(value) || 0)
}