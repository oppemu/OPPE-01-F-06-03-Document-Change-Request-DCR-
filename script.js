let categoriesData = {};

// กำหนดวันที่ปัจจุบันในช่อง วันที่ดำเนินการ
document.addEventListener("DOMContentLoaded", function () {
    const today = new Date().toISOString().split("T")[0];
    document.getElementById("entryDate").value = today;
    
    // โหลดหมวดหมู่งานทันทีที่เปิดหน้าเว็บ
    loadCategories();
});

// ดึงหมวดหมู่งานจาก Google Apps Script (JSONP)
function loadCategories() {
    const script = document.createElement("script");
    script.src = `${CONFIG.GOOGLE_SCRIPT_URL}?action=getCategories&callback=renderCategories`;
    document.body.appendChild(script);
}

function renderCategories(response) {
    const catSelect = document.getElementById("categoryInput");
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

// เมื่อเปลี่ยนหมวดงาน ให้เปลี่ยนรายการระเบียบปฏิบัติ (P/WI)
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

// ตรวจสอบข้อมูลผู้ใช้จากอีเมล (JSONP)
function handleCheckEmail() {
    const email = document.getElementById("email").value.trim();
    if (!email) {
        alert("กรุณากรอกอีเมลก่อนค้นหา");
        return;
    }

    const btn = document.getElementById("btnCheckEmail");
    btn.disabled = true;
    btn.textContent = "กำลังตรวจสอบ...";

    const script = document.createElement("script");
    script.src = `${CONFIG.GOOGLE_SCRIPT_URL}?action=checkEmail&email=${encodeURIComponent(email)}&callback=renderUserData`;
    document.body.appendChild(script);
}

function renderUserData(response) {
    const btn = document.getElementById("btnCheckEmail");
    btn.disabled = false;
    btn.textContent = "ตรวจสอบ";

    if (response.isValid && response.data) {
        document.getElementById("reporterName").value = response.data.name || "";
        document.getElementById("position").value = response.data.position || "";
        document.getElementById("department").value = response.data.department || "";
        alert("พบข้อมูลผู้ใช้เรียบร้อยแล้ว");
    } else {
        alert(response.message || "ไม่พบข้อมูลอีเมลนี้ในระบบ");
    }
}

// ตรวจสอบจำนวนครั้งที่เคยดำเนินการเรื่องนี้ (JSONP)
function handleSubjectChange() {
    const subject = document.getElementById("subject").value.trim();
    if (!subject) return;

    const script = document.createElement("script");
    script.src = `${CONFIG.GOOGLE_SCRIPT_URL}?action=getVisitCount&subject=${encodeURIComponent(subject)}&callback=renderVisitCount`;
    document.body.appendChild(script);
}

function renderVisitCount(response) {
    if (response.status === "success") {
        document.getElementById("currentVisit").value = response.count || 0;
    }
}

// บันทึกแบบฟอร์ม (POST Request)
document.getElementById("oppeForm").addEventListener("submit", async function (e) {
    e.preventDefault();

    const btnSubmit = document.getElementById("btnSubmit");
    btnSubmit.disabled = true;
    btnSubmit.textContent = "กำลังบันทึก...";

    const fileInput = document.getElementById("attachFile");
    let attachFileData = null;

    if (fileInput.files.length > 0) {
        const file = fileInput.files[0];
        const base64 = await convertBase64(file);
        attachFileData = {
            name: file.name,
            type: file.type,
            base64: base64.split(",")[1]
        };
    }

    const payload = {
        action: "submitDCR",
        email: document.getElementById("email").value.trim(),
        reporterName: document.getElementById("reporterName").value.trim(),
        position: document.getElementById("position").value.trim(),
        department: document.getElementById("department").value.trim(),
        entryDate: document.getElementById("entryDate").value,
        operationsName: document.getElementById("operationsName").value.trim(),
        categoryInput: document.getElementById("categoryInput").value,
        pwiInput: document.getElementById("pwiInput").value,
        subject: document.getElementById("subject").value.trim(),
        currentVisit: document.getElementById("currentVisit").value,
        jobDetailInput: document.getElementById("jobDetailInput").value.trim(),
        attachFile: attachFileData
    };

    try {
        const res = await fetch(CONFIG.GOOGLE_SCRIPT_URL, {
            method: "POST",
            body: JSON.stringify(payload)
        });
        const result = await res.json();

        if (result.success) {
            alert(`บันทึกเรียบร้อยแล้ว! รหัส DCR: ${result.dcrId}`);
            document.getElementById("oppeForm").reset();
            document.getElementById("pwiInput").disabled = true;
        } else {
            alert("เกิดข้อผิดพลาด: " + result.message);
        }
    } catch (err) {
        alert("เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์");
        console.error(err);
    } finally {
        btnSubmit.disabled = false;
        btnSubmit.textContent = "บันทึกข้อมูล";
    }
});

function convertBase64(file) {
    return new Promise((resolve, reject) => {
        const fileReader = new FileReader();
        fileReader.readAsDataURL(file);
        fileReader.onload = () => resolve(fileReader.result);
        fileReader.onerror = (error) => reject(error);
    });
}
