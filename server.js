const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

dotenv.config({ path: path.join(__dirname, "..", ".env"), quiet: true });
dotenv.config({ quiet: true });

const app = express();

app.use(cors());
app.use(express.json());
app.get("/favicon.ico", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "SANADlogo.png"));
});
app.use(express.static("public"));

const DEFAULT_LOCATION = {
    lat: 21.413333,
    lng: 39.893333
};

// ================= اتصال قاعدة البيانات =================
const mongoUri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/sanad";

mongoose
    .connect(mongoUri)
    .then(async () => {
        console.log("✅ MongoDB connected");
        await ensureDemoData();
    })
    .catch(err => {
        console.log("❌ DB ERROR:", err.message);
        process.exit(1);
    });

// ================= نماذج MongoDB =================
const hajjSchema = new mongoose.Schema(
    {
        full_name: { type: String, default: "" },
        phone: { type: String, required: true, trim: true },
        country_code: { type: String, required: true, trim: true },
        preferred_language: { type: String, default: "en" },
        nusuk_id: { type: String, trim: true }
    },
    { timestamps: true, collection: "hujjaj" }
);

hajjSchema.index({ phone: 1, country_code: 1 }, { unique: true });
hajjSchema.index({ nusuk_id: 1 }, { unique: true, sparse: true });

const nusukCardSchema = new mongoose.Schema(
    {
        nusuk_id: { type: String, required: true, trim: true },
        full_name: { type: String, default: "" },
        phone: { type: String, default: "" },
        country_code: { type: String, default: "" },
        language: { type: String, default: "en" },
        preferred_language: { type: String, default: "" },
        is_valid: { type: mongoose.Schema.Types.Mixed, default: true }
    },
    { timestamps: true, collection: "nusuk_cards" }
);

const kioskSchema = new mongoose.Schema(
    {
        name: { type: String, required: true },
        lat: { type: Number, required: true },
        lng: { type: Number, required: true },
        status: { type: String, default: "active" }
    },
    { timestamps: true, collection: "kiosks" }
);

const reportSchema = new mongoose.Schema(
    {
        type: { type: String, required: true },
        description: { type: String, required: true },
        status: {
            type: String,
            enum: ["pending", "in-progress", "resolved", "failed"],
            default: "pending"
        },
        location: {
            lat: { type: Number, default: DEFAULT_LOCATION.lat },
            lng: { type: Number, default: DEFAULT_LOCATION.lng }
        },
        screenNumber: { type: String, default: "" },
        screen_number: { type: Number },
        hajj_id: { type: mongoose.Schema.Types.ObjectId, ref: "Hajj" },
        language: { type: String, default: "ar" },
        assignedVolunteerId: { type: String, default: "" },
        assignedVolunteerName: { type: String, default: "" }
    },
    { timestamps: true, collection: "reports" }
);

const volunteerSchema = new mongoose.Schema(
    {
        birthDate: { type: String, default: "" },
        bloodType: { type: String, default: "" },
        fullName: { type: String, required: true, trim: true },
        nationalId: { type: String, required: true, unique: true, trim: true },
        password: { type: String, required: true },
        phone: { type: String, required: true, unique: true, trim: true },
        role: { type: String, default: "volunteer" },
        status: {
            type: String,
            enum: ["active", "pending", "blocked"],
            default: "pending"
        }
    },
    { timestamps: true, collection: "volunteers" }
);

const Hajj = mongoose.model("Hajj", hajjSchema);
const NusukCard = mongoose.model("NusukCard", nusukCardSchema);
const Kiosk = mongoose.model("Kiosk", kioskSchema);
const Report = mongoose.model("Report", reportSchema);
const Volunteer = mongoose.model("Volunteer", volunteerSchema);

const toClientHajj = user => ({
    id: user._id.toString(),
    _id: user._id,
    full_name: user.full_name,
    phone: user.phone,
    country_code: user.country_code,
    preferred_language: user.preferred_language,
    nusuk_id: user.nusuk_id
});

const toLegacyReport = report => {
    const hajj = report.hajj_id;
    const hajjData = hajj && hajj._id ? hajj : null;

    return {
        ...report.toObject(),
        id: report._id.toString(),
        report_id: report._id.toString(),
        text: report.description,
        category: report.type,
        screen_number: report.screen_number,
        hajj_id: hajjData ? hajjData._id.toString() : report.hajj_id,
        full_name: hajjData ? hajjData.full_name : undefined,
        phone: hajjData ? hajjData.phone : undefined,
        preferred_language: hajjData ? hajjData.preferred_language : undefined,
        assignedVolunteerId: report.assignedVolunteerId,
        assignedVolunteerName: report.assignedVolunteerName
    };
};

const jwtSecret = process.env.JWT_SECRET || "sanad-dev-secret";

const generateToken = id => {
    return jwt.sign({ id }, jwtSecret, { expiresIn: "7d" });
};

const protect = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({ message: "Not authorized, no token" });
        }

        const token = authHeader.split(" ")[1];
        const decoded = jwt.verify(token, jwtSecret);

        req.user = decoded.id;
        next();
    } catch (err) {
        return res.status(401).json({ message: "Not authorized, invalid token" });
    }
};

const toClientVolunteer = volunteer => ({
    id: volunteer._id,
    fullName: volunteer.fullName,
    nationalId: volunteer.nationalId,
    phone: volunteer.phone,
    birthDate: volunteer.birthDate,
    bloodType: volunteer.bloodType,
    role: volunteer.role,
    status: volunteer.status
});

async function ensureDemoData() {
    const demoKiosks = [
        { name: "1", lat: 21.42296, lng: 39.82602, status: "active" },
        { name: "2", lat: 21.4232, lng: 39.82652, status: "active" },
        { name: "3", lat: 21.42345, lng: 39.8271, status: "active" },
        { name: "4", lat: 21.42238, lng: 39.82754, status: "active" },
        { name: "5", lat: 21.42174, lng: 39.8272, status: "active" },
        { name: "6", lat: 21.42115, lng: 39.82662, status: "active" },
        { name: "7", lat: 21.42072, lng: 39.8258, status: "active" },
        { name: "8", lat: 21.42105, lng: 39.82512, status: "active" },
        { name: "9", lat: 21.42182, lng: 39.82472, status: "active" },
        { name: "10", lat: 21.42255, lng: 39.8249, status: "active" },
        { name: "11", lat: 21.42395, lng: 39.82588, status: "active" },
        { name: "12", lat: 21.4242, lng: 39.82682, status: "active" },
        { name: "13", lat: 21.42032, lng: 39.82532, status: "active" },
        { name: "14", lat: 21.42002, lng: 39.82628, status: "active" },
        { name: "15", lat: 21.42092, lng: 39.82782, status: "active" }
    ];

    for (const kiosk of demoKiosks) {
        await Kiosk.updateOne(
            { name: kiosk.name },
            { $setOnInsert: kiosk },
            { upsert: true }
        );
    }

    console.log("✅ Demo kiosks ready");

    const demoCards = [
        {
            nusuk_id: "123456789",
            full_name: "Demo Hajj",
            phone: "500000000",
            country_code: "+966",
            language: "en",
            is_valid: true
        },
        {
            nusuk_id: "NUSUK-00000001",
            full_name: "Mohammed Ahmed Abdullah",
            phone: "500000001",
            country_code: "+966",
            language: "ar",
            is_valid: true
        }
    ];

    for (const card of demoCards) {
        await NusukCard.updateOne(
            { nusuk_id: card.nusuk_id },
            { $setOnInsert: card },
            { upsert: true }
        );
    }

    console.log("✅ Demo Nusuk cards ready: 123456789, NUSUK-00000001");
}

// ================= إدارة رقم الشاشة =================
let currentScreenNumber = 1;

app.get("/api/screen/next", async (req, res) => {
    try {
        const activeKioskCount = await Kiosk.countDocuments({ status: "active" });
        const maxScreenNumber = activeKioskCount || 15;
        const screenToUse = currentScreenNumber;

        currentScreenNumber = (currentScreenNumber % maxScreenNumber) + 1;
        res.json({ screen_number: screenToUse });
    } catch (err) {
        const screenToUse = currentScreenNumber;
        currentScreenNumber = (currentScreenNumber % 15) + 1;
        res.json({ screen_number: screenToUse });
    }
});

app.post("/api/screen/reset", (req, res) => {
    currentScreenNumber = 1;
    res.json({ message: "Screen counter reset to 1" });
});

// ================= حسابات المتطوعين لتطبيق الجوال =================
app.post("/api/auth/register", async (req, res) => {
    try {
        const { fullName, nationalId, password, phone } = req.body;

        if (!fullName || !nationalId || !password || !phone) {
            return res.status(400).json({ message: "All fields are required" });
        }

        if (!/^05\d{8}$/.test(phone)) {
            return res.status(400).json({ message: "رقم الجوال غير صحيح" });
        }

        if (!/^\d{10}$/.test(nationalId)) {
            return res.status(400).json({ message: "رقم الهوية غير صحيح" });
        }

        if (password.length < 6) {
            return res.status(400).json({ message: "Password must be at least 6 characters" });
        }

        if (!/[A-Za-z]/.test(password)) {
            return res.status(400).json({ message: "Password must contain at least one letter" });
        }

        if (!/\d/.test(password)) {
            return res.status(400).json({ message: "Password must contain at least one number" });
        }

        if (!/[@$!%*#?&]/.test(password)) {
            return res.status(400).json({ message: "Password must contain at least one special character (# $ ! @)" });
        }

        const existingPhone = await Volunteer.findOne({ phone });

        if (existingPhone) {
            return res.status(400).json({ message: "رقم الجوال مستخدم مسبقًا" });
        }

        const existingVolunteer = await Volunteer.findOne({ nationalId });

        if (existingVolunteer) {
            return res.status(400).json({ message: "Volunteer already exists" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const volunteer = await Volunteer.create({
            fullName,
            nationalId,
            password: hashedPassword,
            phone,
            status: "active"
        });

        res.status(201).json({
            message: "Volunteer registered successfully",
            token: generateToken(volunteer._id),
            volunteer: toClientVolunteer(volunteer)
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

app.post("/api/auth/login", async (req, res) => {
    try {
        const { nationalId, password } = req.body;

        if (!nationalId || !password) {
            return res.status(400).json({ message: "National ID and password are required" });
        }

        if (!/^\d{10}$/.test(nationalId)) {
            return res.status(400).json({ message: "رقم الهوية غير صحيح" });
        }

        if (password.length < 6) {
            return res.status(400).json({ message: "Invalid password format" });
        }

        const volunteer = await Volunteer.findOne({ nationalId });

        if (!volunteer) {
            return res.status(401).json({ message: "Invalid national ID or password" });
        }

        const isMatch = await bcrypt.compare(password, volunteer.password);

        if (!isMatch) {
            return res.status(401).json({ message: "Invalid national ID or password" });
        }

        res.status(200).json({
            message: "Login successful",
            token: generateToken(volunteer._id),
            volunteer: toClientVolunteer(volunteer)
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

app.get("/api/auth/me", protect, async (req, res) => {
    try {
        const volunteer = await Volunteer.findById(req.user).select("-password");

        if (!volunteer) {
            return res.status(404).json({ message: "Volunteer not found" });
        }

        res.status(200).json(volunteer);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

app.put("/api/auth/profile", protect, async (req, res) => {
    try {
        const { fullName, phone, birthDate, bloodType } = req.body;

        if (phone && !/^05\d{8}$/.test(phone)) {
            return res.status(400).json({ message: "رقم الجوال غير صحيح" });
        }

        if (phone) {
            const existingPhone = await Volunteer.findOne({
                phone,
                _id: { $ne: req.user }
            });

            if (existingPhone) {
                return res.status(400).json({ message: "رقم الجوال مستخدم مسبقًا" });
            }
        }

        const volunteer = await Volunteer.findById(req.user);

        if (!volunteer) {
            return res.status(404).json({ message: "Volunteer not found" });
        }

        volunteer.fullName = fullName || volunteer.fullName;
        volunteer.phone = phone || volunteer.phone;
        volunteer.birthDate = birthDate ?? volunteer.birthDate;
        volunteer.bloodType = bloodType ?? volunteer.bloodType;

        const updatedVolunteer = await volunteer.save();

        res.status(200).json({
            message: "Profile updated successfully",
            volunteer: toClientVolunteer(updatedVolunteer)
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// ================= تسجيل حاج جديد أو تحديث البيانات =================
app.post("/api/register", async (req, res) => {
    try {
        let { fullName, phone, countryCode, language } = req.body;

        console.log("📝 Register request:", { fullName, phone, countryCode, language });

        if (!phone || !countryCode) {
            return res.status(400).json({ error: "Missing data" });
        }

        phone = phone.replace(/\D/g, "");

        if (countryCode === "+966" && !/^5\d{8}$/.test(phone)) {
            return res.status(400).json({ error: "Invalid Saudi phone number" });
        }

        const existing = await Hajj.findOne({ phone, country_code: countryCode });

        if (existing) {
            const hasNusukId = Boolean(existing.nusuk_id);

            console.log("♻ Existing user:", existing._id.toString(), "has nusuk_id:", hasNusukId);

            if (hasNusukId) {
                return res.json({
                    success: true,
                    hajj_id: existing._id.toString(),
                    message: "Welcome back",
                    language: existing.preferred_language || "en",
                    fullName: existing.full_name
                });
            }

            existing.full_name = fullName || existing.full_name;
            existing.preferred_language = language || existing.preferred_language || "en";
            await existing.save();

            return res.json({
                success: true,
                hajj_id: existing._id.toString(),
                message: "Welcome back, data updated",
                language: existing.preferred_language,
                fullName: existing.full_name
            });
        }

        const user = await Hajj.create({
            full_name: fullName || "",
            phone,
            country_code: countryCode,
            preferred_language: language || "en"
        });

        console.log("✅ New user created:", user._id.toString());

        res.json({
            success: true,
            hajj_id: user._id.toString(),
            message: "Registered successfully",
            language: user.preferred_language,
            fullName: user.full_name
        });
    } catch (err) {
        if (err.code === 11000) {
            return res.status(409).json({ error: "User already exists" });
        }

        console.error("❌ Register error:", err);
        res.status(500).json({ error: err.message });
    }
});

// ================= مسح بطاقة نسك =================
app.post("/api/scan", async (req, res) => {
    try {
        let { nusukId } = req.body;

        if (!nusukId) {
            return res.status(400).json({ message: "No Nusuk ID provided" });
        }

        nusukId = nusukId.replace(/[^\x20-\x7E]/g, "").trim();

        const card = await NusukCard.findOne({
            nusuk_id: nusukId,
            is_valid: { $in: [true, 1] }
        });

        if (!card) {
            return res.status(404).json({ message: "Invalid Nusuk card" });
        }

        const existing = await Hajj.findOne({ nusuk_id: nusukId });

        if (existing) {
            return res.json({
                message: "Login success",
                user: toClientHajj(existing)
            });
        }

        const phone = card.phone || nusukId;
        const countryCode = card.country_code || "+966";
        const existingByPhone = await Hajj.findOne({ phone, country_code: countryCode });

        if (existingByPhone) {
            if (!existingByPhone.nusuk_id) {
                existingByPhone.nusuk_id = nusukId;
                existingByPhone.full_name = card.full_name || existingByPhone.full_name;
                existingByPhone.preferred_language = card.preferred_language || card.language || existingByPhone.preferred_language;
                await existingByPhone.save();
            }

            return res.json({
                message: "Login success",
                user: toClientHajj(existingByPhone)
            });
        }

        const user = await Hajj.create({
            full_name: card.full_name,
            phone,
            country_code: countryCode,
            preferred_language: card.preferred_language || card.language || "en",
            nusuk_id: nusukId
        });

        res.json({
            message: "Created from Nusuk card",
            user: toClientHajj(user)
        });
    } catch (err) {
        console.error("❌ Scan error:", err);
        res.status(500).json({ error: err.message });
    }
});

// ================= الأكشاك لتطبيق المتطوعين =================
app.get("/api/kiosks", async (req, res) => {
    try {
        const kiosks = await Kiosk.find({ status: "active" });
        res.json(kiosks);
    } catch (err) {
        res.status(500).json({
            message: "Failed to fetch kiosks",
            error: err.message
        });
    }
});

// ================= حفظ البلاغ =================
app.post("/api/reports", async (req, res) => {
    try {
        const {
            screen_number,
            hajj_id,
            text,
            category,
            language = "ar",
            type,
            description,
            location
        } = req.body;

        if (type && description && !text && !category) {
            const report = await Report.create({
                type,
                description,
                location: location || DEFAULT_LOCATION
            });

            return res.status(201).json(report);
        }

        if (!screen_number || !hajj_id || !text || !category) {
            return res.status(400).json({
                error: "Missing required fields"
            });
        }

        if (!mongoose.isValidObjectId(hajj_id)) {
            return res.status(400).json({ error: "Invalid hajj_id" });
        }

        const hajj = await Hajj.findById(hajj_id);

        if (!hajj) {
            return res.status(404).json({ error: "Hajj user not found" });
        }

        const numericScreenNumber = Number(screen_number);
        const kiosk = await Kiosk.findOne({
            name: String(screen_number),
            status: "active"
        });

        const report = await Report.create({
            type: category,
            description: text,
            screenNumber: String(screen_number),
            screen_number: Number.isNaN(numericScreenNumber) ? undefined : numericScreenNumber,
            hajj_id: hajj._id,
            language,
            location: kiosk
                ? { lat: kiosk.lat, lng: kiosk.lng }
                : DEFAULT_LOCATION
        });

        res.status(201).json({
            success: true,
            report_id: report._id.toString()
        });
    } catch (err) {
        console.error("Insert error:", err);
        res.status(500).json({ error: "Failed to save report" });
    }
});

// ================= جلب البلاغات لتطبيق المتطوعين =================
app.get("/api/reports", async (req, res) => {
    try {
        const reports = await Report.find()
            .populate("hajj_id")
            .sort({ createdAt: -1 });

        res.json(reports.map(toLegacyReport));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post("/api/translate", async (req, res) => {
    try {
        const { text, target = "ar" } = req.body;

        if (!text || !String(text).trim()) {
            return res.status(400).json({ message: "Text is required" });
        }

        const url = "https://translate.googleapis.com/translate_a/single" +
            `?client=gtx&sl=auto&tl=${encodeURIComponent(target)}` +
            `&dt=t&q=${encodeURIComponent(text)}`;

        const response = await fetch(url);

        if (!response.ok) {
            throw new Error("Translation service failed");
        }

        const data = await response.json();
        const translatedText = data[0].map(part => part[0]).join("");

        res.json({ translatedText });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

app.patch("/api/reports/:id/status", async (req, res) => {
    try {
        const { status, assignedVolunteerId, assignedVolunteerName } = req.body;
        const allowedStatuses = ["pending", "in-progress", "resolved", "failed"];

        if (!allowedStatuses.includes(status)) {
            return res.status(400).json({ message: "Invalid report status" });
        }

        const existingReport = await Report.findById(req.params.id);

        if (!existingReport) {
            return res.status(404).json({ message: "Report not found" });
        }

        if (
            status === "in-progress" &&
            existingReport.status !== "pending" &&
            existingReport.assignedVolunteerId &&
            existingReport.assignedVolunteerId !== assignedVolunteerId
        ) {
            return res.status(409).json({ message: "Report already assigned" });
        }

        existingReport.status = status;

        if (assignedVolunteerId) {
            existingReport.assignedVolunteerId = assignedVolunteerId;
            existingReport.assignedVolunteerName = assignedVolunteerName || "";
        }

        const report = await existingReport.save();

        res.json(report);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ================= استرجاع بلاغات شاشة =================
app.get("/api/reports/screen/:screenNumber", async (req, res) => {
    try {
        const numericScreenNumber = Number(req.params.screenNumber);
        const reports = await Report.find({
            $or: [
                { screenNumber: String(req.params.screenNumber) },
                ...(Number.isNaN(numericScreenNumber)
                    ? []
                    : [{ screen_number: numericScreenNumber }])
            ]
        })
            .populate("hajj_id")
            .sort({ createdAt: -1 });

        res.json(reports.map(toLegacyReport));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ================= الصفحة الرئيسية =================
app.get("/", (req, res) => {
    res.redirect("/Welcome.html");
});

// ================= تشغيل السيرفر =================
const PORT = process.env.SANAD_PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});
