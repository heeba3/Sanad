const countryCodes = [
    { code: "+966", name: "Saudi Arabia" },
    { code: "+971", name: "UAE" },
    { code: "+20", name: "Egypt" },
    { code: "+962", name: "Jordan" },
    { code: "+965", name: "Kuwait" },
    { code: "+974", name: "Qatar" },
    { code: "+973", name: "Bahrain" },
    { code: "+968", name: "Oman" },
    { code: "+90", name: "Turkey" },
    { code: "+44", name: "United Kingdom" },
    { code: "+1", name: "United States" },
    { code: "+91", name: "India" },
    { code: "+92", name: "Pakistan" },
    { code: "+94", name: "Sri Lanka" },
    { code: "+880", name: "Bangladesh" }
];

const languages = [
    {
        code: "en",
        dir: "ltr",
        switcher: "English",
        nameLabel: "Full name",
        namePlaceholder: "Enter full name",
        phoneLabel: "Phone number",
        prefLang: "Preferred language",
        submit: "Submit",
        options: ["English", "Arabic", "Urdu"],
        errors: {
            required: "This field is required",
            nameInvalid: "Please enter letters only",
            nameLength: "Name must be between 2-50 characters",
            phoneInvalid: "Please enter numbers only",
            phoneLength: "Phone number must be 7-15 digits",
            saudiInvalid: "Saudi number must start with 5 and be 9 digits"
        }
    },
    {
        code: "ar",
        dir: "rtl",
        switcher: "العربية",
        nameLabel: "الاسم الكامل",
        namePlaceholder: "أدخل الاسم الكامل",
        phoneLabel: "رقم الهاتف",
        prefLang: "اللغة المفضلة",
        submit: "تسجيل",
        options: ["العربية", "English", "اردو"],
        errors: {
            required: "هذا الحقل مطلوب",
            nameInvalid: "الرجاء إدخال حروف فقط",
            nameLength: "الاسم يجب أن يكون بين 2-50 حرف",
            phoneInvalid: "الرجاء إدخال أرقام فقط",
            phoneLength: "رقم الهاتف يجب أن يكون بين 7-15 رقم",
            saudiInvalid: "الرقم السعودي يجب أن يبدأ بـ 5 ويتكون من 9 أرقام"
        }
    },
    {
        code: "ur",
        dir: "rtl",
        switcher: "اردو",
        nameLabel: "پورا نام",
        namePlaceholder: "پورا نام درج کریں",
        phoneLabel: "فون نمبر",
        prefLang: "پسندیدہ زبان",
        submit: "جمع کریں",
        options: ["اردو", "English", "العربية"],
        errors: {
            required: "یہ فیلڈ درکار ہے",
            nameInvalid: "براہ کرم صرف حروف درج کریں",
            nameLength: "نام 2-50 حروف کے درمیان ہونا چاہیے",
            phoneInvalid: "براہ کرم صرف نمبر درج کریں",
            phoneLength: "فون نمبر 7-15 ہندسوں کے درمیان ہونا چاہیے",
            saudiInvalid: "سعودی نمبر 5 سے شروع ہونا چاہیے اور 9 ہندسوں پر مشتمل ہونا چاہیے"
        }
    }
];

let current = 0;
let nameTouched = false;
let phoneTouched = false;

const langBtn = document.getElementById("langSwitcher");
const nameLabel = document.getElementById("nameLabel");
const nameInput = document.getElementById("nameInput");
const phoneLabel = document.getElementById("phoneLabel");
const prefLangLabel = document.getElementById("prefLangLabel");
const prefLangSelect = document.getElementById("prefLangSelect");
const submitBtn = document.getElementById("submitBtn");
const countryCodeSelect = document.getElementById("countryCode");

countryCodes.forEach(c => {
    const option = document.createElement("option");
    option.value = c.code;
    option.textContent = `${c.code} (${c.name})`;
    countryCodeSelect.appendChild(option);
});

countryCodeSelect.value = "+966";

langBtn.addEventListener("click", () => {
    current = (current + 1) % languages.length;
    localStorage.setItem("selected_language", languages[current].code);
    applyLanguage(languages[current]);
});

const selectedLanguage = localStorage.getItem("selected_language");
const selectedIndex = languages.findIndex(lang => lang.code === selectedLanguage);

if (selectedIndex >= 0) {
    current = selectedIndex;
}

applyLanguage(languages[current]);

function applyLanguage(lang) {
    document.documentElement.lang = lang.code;
    document.documentElement.dir = lang.dir;

    document.body.classList.remove("rtl", "ltr");
    document.body.classList.add(lang.dir);

    langBtn.textContent = lang.switcher;
    nameLabel.textContent = lang.nameLabel;
    nameInput.placeholder = lang.namePlaceholder;
    phoneLabel.textContent = lang.phoneLabel;
    prefLangLabel.textContent = lang.prefLang;
    submitBtn.textContent = lang.submit;

    prefLangSelect.innerHTML = "";
    lang.options.forEach(opt => {
        const option = document.createElement("option");
        option.textContent = opt;
        if (opt === "العربية") option.value = "ar";
        else if (opt === "اردو" || opt === "Urdu") option.value = "ur";
        else option.value = "en";
        prefLangSelect.appendChild(option);
    });

    if (nameTouched && nameInput.value.trim()) {
        const result = validateName(nameInput.value);
        if (!result.valid) {
            showError("nameField", "nameError", result.message);
        } else {
            clearError("nameField", "nameError");
        }
    }

    if (phoneTouched && phoneInput.value.trim()) {
        const result = validatePhone(phoneInput.value, countryCodeSelect.value);
        if (!result.valid) {
            showError("phoneField", "phoneError", result.message);
        } else {
            clearError("phoneField", "phoneError");
        }
    }

    checkSubmitButton();
}

function validateName(name) {
    const trimmed = name.trim();
    const lang = languages[current];

    if (!nameTouched) {
        return { valid: true, message: "" };
    }

    if (!trimmed) {
        return { valid: false, message: lang.errors.required };
    }

    if (trimmed.length < 2 || trimmed.length > 50) {
        return { valid: false, message: lang.errors.nameLength };
    }

    const invalidCharsRegex = /[0-9@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/;

    if (invalidCharsRegex.test(trimmed)) {
        return { valid: false, message: lang.errors.nameInvalid };
    }

    return { valid: true, message: "" };
}

function validatePhone(phone, countryCode) {
    const trimmed = phone.trim();
    const lang = languages[current];

    if (!phoneTouched) {
        return { valid: true, message: "" };
    }

    if (!trimmed) {
        return { valid: false, message: lang.errors.required };
    }

    const digits = trimmed.replace(/\D/g, '');

    if (digits !== trimmed.replace(/\s/g, '')) {
        return { valid: false, message: lang.errors.phoneInvalid };
    }

    if (digits.length < 7 || digits.length > 15) {
        return { valid: false, message: lang.errors.phoneLength };
    }

    if (countryCode === "+966" && !/^5\d{8}$/.test(digits)) {
        return { valid: false, message: lang.errors.saudiInvalid };
    }

    return { valid: true, message: "" };
}

function showError(fieldId, errorId, message) {
    const field = document.getElementById(fieldId);
    const error = document.getElementById(errorId);

    if (field) field.classList.add("invalid");
    if (error) {
        error.textContent = message;
        error.style.display = "block";
    }
}

function clearError(fieldId, errorId) {
    const field = document.getElementById(fieldId);
    const error = document.getElementById(errorId);

    if (field) field.classList.remove("invalid");
    if (error) {
        error.textContent = "";
        error.style.display = "none";
    }
}

function checkSubmitButton() {
    const nameValue = nameInput.value.trim();
    const phoneValue = phoneInput.value.trim();

    if (!nameValue || !phoneValue) {
        submitBtn.disabled = true;
        return;
    }

    const nameValid = nameTouched ? validateName(nameValue).valid : true;
    const phoneValid = phoneTouched ? validatePhone(phoneValue, countryCodeSelect.value).valid : true;

    submitBtn.disabled = !(nameValid && phoneValid);
}

document.addEventListener('DOMContentLoaded', function() {
    console.log("SANAD Validation Initializing...");

    nameInput.addEventListener('focus', () => { nameTouched = true; });
    nameInput.addEventListener('blur', () => {
        nameTouched = true;
        const result = validateName(nameInput.value);
        if (!result.valid) showError("nameField", "nameError", result.message);
        else clearError("nameField", "nameError");
        checkSubmitButton();
    });
    nameInput.addEventListener('input', () => {
        if (nameTouched) {
            const result = validateName(nameInput.value);
            if (!result.valid) showError("nameField", "nameError", result.message);
            else clearError("nameField", "nameError");
        }
        checkSubmitButton();
    });

    phoneInput.addEventListener('focus', () => { phoneTouched = true; });
    phoneInput.addEventListener('blur', () => {
        phoneTouched = true;
        const result = validatePhone(phoneInput.value, countryCodeSelect.value);
        if (!result.valid) showError("phoneField", "phoneError", result.message);
        else clearError("phoneField", "phoneError");
        checkSubmitButton();
    });
    phoneInput.addEventListener('input', () => {
        if (phoneTouched) {
            const result = validatePhone(phoneInput.value, countryCodeSelect.value);
            if (!result.valid) showError("phoneField", "phoneError", result.message);
            else clearError("phoneField", "phoneError");
        }
        checkSubmitButton();
    });

    countryCodeSelect.addEventListener('change', () => {
        if (phoneTouched) {
            const result = validatePhone(phoneInput.value, countryCodeSelect.value);
            if (!result.valid) showError("phoneField", "phoneError", result.message);
            else clearError("phoneField", "phoneError");
        }
        checkSubmitButton();
    });

    const form = document.getElementById('userForm');
    if (form) {
        form.addEventListener('submit', (event) => {
            nameTouched = true;
            phoneTouched = true;

            const nameResult = validateName(nameInput.value);
            const phoneResult = validatePhone(phoneInput.value, countryCodeSelect.value);

            let hasError = false;

            if (!nameResult.valid) {
                showError("nameField", "nameError", nameResult.message);
                hasError = true;
            }

            if (!phoneResult.valid) {
                showError("phoneField", "phoneError", phoneResult.message);
                hasError = true;
            }

            if (hasError) {
                event.preventDefault();
                submitBtn.disabled = true;
                return false;
            }

            return true;
        });
    }

    checkSubmitButton();
    console.log("SANAD Validation Ready");
});


document.getElementById("userForm").addEventListener("submit", async function(e) {
    e.preventDefault();

    const fullName = document.getElementById("nameInput").value;
    const phone = document.getElementById("phoneInput").value;
    const countryCode = document.getElementById("countryCode").value;
    const languageSelect = document.getElementById("prefLangSelect");
    const selectedValue = languageSelect.value;
    
    const langCode = selectedValue; 

    console.log("📤 Sending registration:", { fullName, phone, countryCode, language: langCode });

    try {
        const res = await fetch("/api/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                fullName: fullName,
                phone: phone,
                countryCode: countryCode,
                language: langCode
            })
        });

        const data = await res.json();
        console.log("📥 Response:", data);

        if (data.success && data.hajj_id) {
            localStorage.setItem("hajj_id", data.hajj_id);
            localStorage.setItem("preferred_language", data.language);
            localStorage.setItem("user_name", data.fullName);
            console.log("✅ Saved hajj_id:", data.hajj_id);
            console.log("✅ Saved language:", data.language);
            console.log("✅ Saved name:", data.fullName);
            
            window.location.href = "reportType.html";
        } else {
            console.error("❌ Error:", data.error);
            alert("خطأ: " + (data.error || "حدث خطأ غير معروف"));
        }
    } catch (error) {
        console.error("❌ Fetch error:", error);
        alert("خطأ في الاتصال بالخادم");
    }
});
