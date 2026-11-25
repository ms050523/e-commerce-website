const arrowButton = document.querySelector(".arrow-btn");
const iconBurger = document.querySelector('.burger-icon');
const dropBox = document.querySelector('.drop-box');

function toggleMenu(event) {
    event.stopPropagation();
    dropBox.classList.toggle("open");
}

if (arrowButton) arrowButton.addEventListener("click", toggleMenu);
if (iconBurger) iconBurger.addEventListener("click", toggleMenu);

document.addEventListener("click", (event) => {
    const isClickInsideMenu = dropBox.contains(event.target);
    const isClickOnBurger = event.target.closest('.burger-icon');
    const isClickOnArrow = event.target.closest('.arrow-btn');

    if (dropBox.classList.contains('open') && !isClickInsideMenu && !isClickOnBurger && !isClickOnArrow) {
        dropBox.classList.remove("open");
    }
});

const userIcon = document.querySelector(".fa-circle-user");
const cartIcon = document.querySelector(".fa-cart-shopping");
const headerIcons = document.querySelector(".header-icon");

if (cartIcon) {
    cartIcon.style.cursor = "pointer";
    cartIcon.addEventListener("click", () => {
        window.location.href = "./cart.html";
    });
}

if (userIcon && headerIcons && typeof getSession === "function") {
    const currentSession = getSession();
    const accountMenu = document.createElement("div");
    accountMenu.className = "account-menu";
    userIcon.style.cursor = "pointer";

    if (currentSession !== null) {
        const user = currentSession.user;
        userIcon.title = user.name;
        userIcon.classList.remove("fa-regular");
        userIcon.classList.add("fa-solid");

        const nameBox = document.createElement("div");
        nameBox.className = "account-name";
        nameBox.textContent = user.name;
        accountMenu.appendChild(nameBox);

        const emailBox = document.createElement("div");
        emailBox.className = "account-email";
        emailBox.textContent = user.email;
        accountMenu.appendChild(emailBox);

        const ordersLink = document.createElement("a");
        ordersLink.className = "account-link";
        ordersLink.href = "./orders.html";
        ordersLink.innerHTML = `<i class="fa-solid fa-box"></i> Мои заказы`;
        accountMenu.appendChild(ordersLink);

        if (isAdmin(user)) {
            const adminLink = document.createElement("a");
            adminLink.className = "account-link";
            adminLink.href = "./admin.html";
            adminLink.innerHTML = `<i class="fa-solid fa-gauge"></i> Панель управления`;
            accountMenu.appendChild(adminLink);
        }

        const logoutBtn = document.createElement("button");
        logoutBtn.type = "button";
        logoutBtn.className = "account-link account-logout";
        logoutBtn.innerHTML = `<i class="fa-solid fa-arrow-right-from-bracket"></i> Выйти`;
        logoutBtn.addEventListener("click", () => {
            clearSession();
            window.location.reload();
        });
        accountMenu.appendChild(logoutBtn);

        headerIcons.appendChild(accountMenu);
    }

    userIcon.addEventListener("click", (event) => {
        event.stopPropagation();
        if (currentSession === null) {
            window.location.href = "./login.html";
        }
        else {
            accountMenu.classList.toggle("open");
        }
    });

    document.addEventListener("click", (event) => {
        if (!accountMenu.contains(event.target)) {
            accountMenu.classList.remove("open");
        }
    });
}

const promoBanner = document.querySelector(".promo-banner");
const promoClose = document.querySelector(".promo-close");

if (promoBanner && sessionStorage.getItem("promoClosed") === "1") {
    promoBanner.remove();
}

if (promoBanner && promoClose) {
    promoClose.addEventListener("click", () => {
        sessionStorage.setItem("promoClosed", "1");
        promoBanner.classList.add("closing");
        setTimeout(() => promoBanner.remove(), 200);
    });
}