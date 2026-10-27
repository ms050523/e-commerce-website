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