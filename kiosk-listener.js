console.log("SCANNER READY");

let buffer = "";
let lastTime = 0;
let locked = false;

document.addEventListener("keydown", async (e) => {

    if (locked) return;

    const now = Date.now();

    if (now - lastTime > 120) {
        buffer = "";
    }

    lastTime = now;

    if (e.key === "Enter") {
        e.preventDefault();

        if (buffer.length > 3) {

            locked = true;

            let nusukId = buffer;

            nusukId = nusukId.replace(/[^\x20-\x7E]/g, "").trim();

            console.log("📡 FINAL SCAN:", JSON.stringify(nusukId));

            try {
                console.log("Sending scan to backend:", nusukId);

                const res = await fetch("/api/scan", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({ nusukId })
                });

                const data = await res.json();

                console.log("Scan status:", res.status);
                console.log("Backend response:", data);

                if (data.user) {
                    localStorage.setItem("user", JSON.stringify(data.user));
                    localStorage.setItem("hajj_id", data.user.id);
                    
                    const userLang = data.user.preferred_language || "en";
                    localStorage.setItem("preferred_language", userLang);
                    console.log("✅ Hajj ID saved from scan:", data.user.id);
                    console.log("✅ Language saved:", userLang);
                    
                    window.location.assign("/reportType.html");
                } else {
                    alert(`${data.message || data.error || "Invalid card"}: ${nusukId}`);
                }

            } catch (err) {
                console.error(err);
                alert("Server Error");
            }

            setTimeout(() => {
                locked = false;
            }, 1000);
        }

        buffer = "";
        return;
    }

    if (e.key.length === 1) {
        buffer += e.key;
    }
});
