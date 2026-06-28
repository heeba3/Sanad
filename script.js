const translations = {
    ar: {
        welcome: "مرحبًا بك!",
        sub: "هل تحتاج إلى مساعدة؟",
        btn: "لا أملك بطاقة نسك",
        className: ""
    },
    en: {
        welcome: "Welcome!",
        sub: "Do you need help?",
        btn: "I don't have a Nusuk card",
        className: "english"
    },
    ur: {
        welcome: "خوش آمدید!",
        sub: "مدد کی ضرورت ہے؟",
        btn: "میرے پاس نسک کارڈ نہیں ہے",
        className: "urdu"
    }
};

const textsDiv = document.querySelector(".texts");
const welcome = textsDiv.querySelector(".welcome");
const sub = textsDiv.querySelector(".sub-text");
const btn = textsDiv.querySelector(".btn");
const languageButtons = document.querySelectorAll(".language-btn");
const languageOrder = ["ar", "en", "ur"];
let activeLanguageIndex = 0;

const kioskFromUrl = new URLSearchParams(window.location.search).get("kiosk");
if (/^(?:[1-9]|1[0-5])$/.test(kioskFromUrl || "")) {
    localStorage.setItem("kiosk_number", kioskFromUrl);
}

function applyWelcomeLanguage(langCode) {
    const lang = translations[langCode] || translations.ar;
    const nextIndex = languageOrder.indexOf(langCode);

    if (nextIndex >= 0) {
        activeLanguageIndex = nextIndex;
    }

    welcome.textContent = lang.welcome;
    sub.textContent = lang.sub;
    btn.textContent = lang.btn;

    textsDiv.classList.remove("english", "urdu");
    if (lang.className) {
        textsDiv.classList.add(lang.className);
    }

    languageButtons.forEach(button => {
        button.classList.toggle("active", button.dataset.lang === langCode);
    });

    localStorage.setItem("selected_language", langCode);
}

languageButtons.forEach(button => {
    button.addEventListener("click", () => {
        applyWelcomeLanguage(button.dataset.lang);
    });
});

applyWelcomeLanguage(localStorage.getItem("selected_language") || "ar");

setInterval(() => {
    activeLanguageIndex = (activeLanguageIndex + 1) % languageOrder.length;
    applyWelcomeLanguage(languageOrder[activeLanguageIndex]);
}, 3500);
