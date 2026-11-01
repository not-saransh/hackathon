document.addEventListener("DOMContentLoaded", () => {
    const nameInput = document.getElementById("user-name");
    const emailInput = document.getElementById("user-email");
    const langInput = document.getElementById("user-lang");
    const form = document.getElementById("profile-form");
    const message = document.getElementById("profile-message");

    nameInput.value = localStorage.getItem("civic_name") || "";
    emailInput.value = localStorage.getItem("civic_email") || "";
    langInput.value = localStorage.getItem("civic_lang") || "en";

    form.addEventListener("submit", (event) => {
        event.preventDefault();

        const newLang = langInput.value;

        localStorage.setItem("civic_name", nameInput.value.trim());
        localStorage.setItem("civic_email", emailInput.value.trim());
        localStorage.setItem("civic_lang", newLang);

        document.cookie = `googtrans=/en/${newLang}; path=/`;

        message.textContent = "Profile saved successfully! Applying language changes...";
        message.className = "civic-message success";
        message.style.display = "block";

        setTimeout(() => {
            window.location.reload();
        }, 1200);
    });
});