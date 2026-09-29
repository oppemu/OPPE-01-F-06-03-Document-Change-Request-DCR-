let categoriesData = {};

document.addEventListener("DOMContentLoaded", function () {
    const today = new Date().toISOString().split("T")[0];
    const entryDateElem = document.getElementById("entryDate");
    if (entryDateElem) entryDateElem.value = today;

    // แอบโหลดหมวดงานไว้เบื้องหลังทันทีที่เปิดหน้าเว็บ
    preloadCategories();
});

// แอบดึงข้อมูลหมวดงานเบื้องหลัง
function preloadCategories() {
    const scriptId = "jsonp-cat-script";
    let oldScript = document.getElementById(scriptId);
    if (oldScript) oldScript.remove();

    const script = document.createElement("script");
    script.id = scriptId;
    script.src = `${CONFIG.GOOGLE_SCRIPT_URL}?action=getCategories&callback=renderCategories&t=${new Date().getTime()}`;
    document.body.appendChild(script);
}

function renderCategories(response) {
    const catSelect = document.getElementById("categoryInput");
    if (!catSelect) return;

    catSelect.innerHTML = '<option value="">-- เลือกหมวดงาน --</option>';

    if (response.status === "success" && response.data) {
        categoriesData = response.data;
        Object.keys(categoriesData).forEach(cat => {
            const opt = document.createElement("option");
            opt.value = cat;
            opt.textContent = cat;
            catSelect.appendChild(opt);
        });
    } else {
        catSelect.innerHTML = '<option value="">ไม่สามารถโหลดข้อมูลได้</option>';
    }
}

function handleCategoryChange() {
    const selectedCat = document.getElementById("categoryInput").value;
    const pwiSelect = document.getElementById("pwiInput");
    pwiSelect.innerHTML = '<option value="">-- เลือกชื่อระเบียบปฏิบัติ --</option>';

    if (selectedCat && categoriesData[selectedCat]) {
        pwiSelect.disabled = false;
        categoriesData[selectedCat].forEach(pwi => {
            const opt = document.createElement("option");
            opt.value = pwi;
            opt.textContent = pwi;
            pwiSelect.appendChild(opt);
        });
    } else {
        pwiSelect.disabled = true;
    }
}

// ตรวจสอบอีเมลแบบความเร็วสูง
function handleCheckEmail() {
    const email = document.getElementById("email").value.trim();
    if (!email) {
        alert("กรุณากรอกอีเมลก่อนค้นหา");
        return;
    }

    const btn = document.getElementById("btnCheckEmail");
    btn.disabled = true;
    btn.textContent = "กำลังค้นหา...";

    const scriptId = "jsonp-email-script";
    let oldScript = document.getElementById(scriptId);
    if (oldScript) oldScript.remove();

    const script = document.createElement("script");
    script.id = scriptId;
    script.src = `${CONFIG.GOOGLE_SCRIPT_URL}?action=checkEmail&email=${encodeURIComponent(email)}&callback=renderUserData&t=${new Date().getTime()}`;
    document.body.appendChild(script);
}

function renderUserData(response) {
    const btn = document.getElementById("btnCheckEmail");
    btn.disabled = false;
    btn.textContent = "ตรวจสอบ";

    if (response.isValid && response.data) {
        document.getElementById("reporterName").value = response.data.name || "";
        document.getElementById("position").value = response.data.position || "";
        document.getElementById("deptCode").value = response.data.deptCode || "";

        // แสดงส่วนที่ 2 และ 3 ทันทีเมื่อค้นพบชื่อ
        document.getElementById("restOfForm").style.display = "block";
    } else {
        alert(response.message || "ไม่พบข้อมูลอีเมลนี้ในระบบ");
        document.getElementById("restOfForm").style.display = "none";
    }
}

// บันทึกฟอร์ม DCR
document.getElementById("dcrForm").addEventListener("submit", async function (e) {
    e.preventDefault();

    const btnSubmit = document.getElementById("btnSubmit");
    btnSubmit.disabled = true;
    btnSubmit.textContent = "กำลังบันทึกและสร้างไฟล์...";

    const payload = {
        action: "submitDCR",
        email: document.getElementById("email").value.trim(),
        reporterName: document.getElementById("reporterName").value.trim(),
        position: document.getElementById("position").value.trim(),
        deptCode: document.getElementById("deptCode").value.trim(),
        entryDate: document.getElementById("entryDate").value,
        operationsName: document.getElementById("operationsName").value,
        categoryInput: document.getElementById("categoryInput").value,
        pwiInput: document.getElementById("pwiInput").value,
        docType: document.getElementById("docType").value,
        docCode: document.getElementById("docCode").value.trim(),
        docName: document.getElementById("docName").value.trim(),
        oldRev: document.getElementById("oldRev").value.trim(),
        newRev: document.getElementById("newRev").value.trim(),
        changeDetail: document.getElementById("changeDetail").value.trim()
    };

    try {
        const res = await fetch(CONFIG.GOOGLE_SCRIPT_URL, {
            method: "POST",
            body: JSON.stringify(payload)
        });
        const result = await res.json();

        if (result.success) {
            alert(`บันทึกสำเร็จ! เลขที่: ${result.dcrId}`);
            document.getElementById("dcrForm").reset();
            document.getElementById("pwiInput").disabled = true;
            document.getElementById("restOfForm").style.display = "none";
        } else {
            alert("เกิดข้อผิดพลาด: " + result.message);
        }
    } catch (err) {
        alert("เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์");
        console.error(err);
    } finally {
        btnSubmit.disabled = false;
        btnSubmit.textContent = "บันทึกข้อมูล DCR";
    }
});
