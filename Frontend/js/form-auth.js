// Strict wrapper taaki global context crash na ho
const registrationForm = document.getElementById('regform');
const API_BASE_URL = 'https://oes-website.onrender.com';

// Helper function: Blob/File ko Base64 string mein convert karne ke liye
function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

// Email format regex check helper
function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Temporary storage review confirmation ke liye
let pendingFormData = null;
let pendingFileToUpload = null;
let activeObjectURL = null; // Tracked object URL to prevent memory leaks

if (registrationForm) {
    registrationForm.addEventListener('submit', async function (e) {
        e.preventDefault(); // Prevent default submission & page reload

        // 1. Input fields value extraction & trim
        const name = document.getElementById('name')?.value.trim() || "";
        const mobile = document.getElementById('phone')?.value.trim() || "";
        const email = document.getElementById('email')?.value.trim() || "";
        const rawDob = document.getElementById('Bday')?.value || ""; // Format: YYYY-MM-DD
        const gender = document.getElementById('gender')?.value || "-1";
        const category = document.getElementById('Category')?.value || "-1";
        const password = document.getElementById('pws')?.value || "";

        // 2. Front-end Validations
        if (!name || !mobile || !email || !rawDob || !password) {
            alert("Bhai, saare required fields bharna zaroori hai!");
            return;
        }

        if (gender === "-1" || category === "-1") {
            alert("Bhai, Gender aur Category select karna mandatory hai!");
            return;
        }

        // Email validation
        if (!isValidEmail(email)) {
            alert("Bhai, proper valid email ID enter kar!");
            return;
        }

        // Mobile number validation (10 digits only)
        if (mobile.length !== 10 || isNaN(mobile)) {
            alert("Bhai, valid 10-digit mobile number enter kar!");
            return;
        }

        // 3. Photo selection check
        let fileToUpload = null;
        const currentMode = window.activeMode;
        const currentBlob = window.capturedBlob;
        const fileInput = document.getElementById('photoFile');

        if (currentMode === 'upload' && fileInput && fileInput.files && fileInput.files[0]) {
            fileToUpload = fileInput.files[0];
        } else if (currentMode === 'camera' && currentBlob) {
            fileToUpload = currentBlob;
        } else {
            alert("Bhai, photo upload kar ya live camera se snapshot le!");
            return;
        }

        // Date validation (YYYY-MM-DD to DDMMYYYY)
        const dateParts = rawDob.split('-');
        if (dateParts.length !== 3 || !dateParts[0] || !dateParts[1] || !dateParts[2]) {
            alert("Bhai, Date of Birth ka format sahi nahi hai!");
            return;
        }
        const exam_password = `${dateParts[2]}${dateParts[1]}${dateParts[0]}`;

        // Dynamic IDs generation (Ensured String context)
        const uniqueId = Math.floor(100000 + Math.random() * 900000).toString();
        const app_no = "26" + uniqueId;
        const roll_no = uniqueId;

        // Pending state for final modal submit
        pendingFormData = {
            app_no,
            roll_no,
            name,
            mobile,
            personal_email: email,
            gender,
            category,
            dob: rawDob,
            exam_password,
            password
        };
        pendingFileToUpload = fileToUpload;

        // Populate Review Modal
        if (document.getElementById('revName')) document.getElementById('revName').innerText = name;
        if (document.getElementById('revMobile')) document.getElementById('revMobile').innerText = mobile;
        if (document.getElementById('revEmail')) document.getElementById('revEmail').innerText = email;
        if (document.getElementById('revDob')) document.getElementById('revDob').innerText = rawDob;
        if (document.getElementById('revGender')) document.getElementById('revGender').innerText = gender;
        if (document.getElementById('revCategory')) document.getElementById('revCategory').innerText = category;

        const revPhoto = document.getElementById('revPhoto');
        if (revPhoto) {
            if (activeObjectURL) URL.revokeObjectURL(activeObjectURL); // Clean old references
            activeObjectURL = URL.createObjectURL(fileToUpload);
            revPhoto.src = activeObjectURL;
        }

        // Show Review Modal
        const reviewModal = document.getElementById('reviewModal');
        if (reviewModal) {
            reviewModal.classList.remove('hidden-element');
            reviewModal.style.display = 'flex';
        }
    });
}

// --- REVIEW MODAL CONTROLS --- //
const btnEditReview = document.getElementById('btnEditReview');
const btnCloseModalX = document.getElementById('btnCloseModalX');
const btnConfirmSubmit = document.getElementById('btnConfirmSubmit');
const reviewModal = document.getElementById('reviewModal');

function closeReviewModal() {
    if (reviewModal) {
        reviewModal.style.display = 'none';
        reviewModal.classList.add('hidden-element');
    }
    if (activeObjectURL) {
        URL.revokeObjectURL(activeObjectURL);
        activeObjectURL = null;
    }
}

if (btnEditReview) btnEditReview.addEventListener('click', closeReviewModal);
if (btnCloseModalX) btnCloseModalX.addEventListener('click', closeReviewModal);

// FINAL CONFIRM SUBMISSION TO BACKEND
if (btnConfirmSubmit) {
    btnConfirmSubmit.addEventListener('click', async function () {
        if (!pendingFormData || !pendingFileToUpload) {
            alert("Data validation issue! Form dobara submit karo.");
            closeReviewModal();
            return;
        }

        const subBtn = document.getElementById('sub');
        btnConfirmSubmit.innerText = "PROCESSING...";
        btnConfirmSubmit.disabled = true;
        if (subBtn) subBtn.innerText = "PROCESSING...";

        let fetchSuccessful = false;

        try {
            // Photo Blob to Base64 conversion
            const photoBase64 = await blobToBase64(pendingFileToUpload);
            pendingFormData.photo_base64 = photoBase64;

            // Backend API hit
            const response = await fetch('${API_BASE_URL}/api/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(pendingFormData)
            });

            const result = await response.json();
            fetchSuccessful = true;

            if (response.ok && result.success) {
                closeReviewModal();

                // Slip/Modal field populations
                const slipPhoto = document.getElementById('slipPhoto');
                if (slipPhoto) {
                    slipPhoto.src = result.photo_link || (pendingFileToUpload ? URL.createObjectURL(pendingFileToUpload) : '/Frontend/assets/default-avatar.png');
                }
                if (document.getElementById('slipName')) document.getElementById('slipName').innerText = pendingFormData.name;
                if (document.getElementById('slipAppNo')) document.getElementById('slipAppNo').innerText = pendingFormData.app_no;
                if (document.getElementById('slipRollNo')) document.getElementById('slipRollNo').innerText = pendingFormData.roll_no;
                if (document.getElementById('slipDob')) document.getElementById('slipDob').innerText = pendingFormData.exam_password;

                // Form Native Reset
                HTMLFormElement.prototype.reset.call(registrationForm);

                // Photo UI cleanup
                if (typeof stopWebcam === 'function') stopWebcam();

                const finalPhotoPreview = document.getElementById('finalPhotoPreview');
                const noPhotoText = document.getElementById('noPhotoText');

                if (finalPhotoPreview) finalPhotoPreview.classList.add('hidden-element');
                if (noPhotoText) noPhotoText.classList.remove('hidden-element');

                // Clear global states safely
                window.capturedBlob = null;
                window.activeMode = null;

                const eyeIcon = document.getElementById("eye");
                const passwordInput = document.getElementById("pws");
                if (eyeIcon) eyeIcon.classList.add("hidden-element");
                if (passwordInput) passwordInput.type = "password";

                if (subBtn) subBtn.innerText = "SUBMIT";

                // Success Modal Display & Redirect Event Binding
                const successModal = document.getElementById('successModal');
                if (successModal) {
                    successModal.classList.remove('hidden-element');
                    successModal.style.display = 'flex';

                    const proceedBtn = document.getElementById('modalProceedBtn');
                    if (proceedBtn) {
                        proceedBtn.onclick = function () {
                            window.location.href = "/OES";
                        };
                    }
                } else {
                    alert(`🎉 Registration Successful!\n\nApplication No: ${pendingFormData?.app_no}\nRoll No: ${pendingFormData?.roll_no}`);
                    window.location.href = "/OES";
                }
            } else {
                alert("Database Insertion Error: " + (result.error || result.message || "Unknown server error"));
                btnConfirmSubmit.innerText = "CONFIRM & FINAL SUBMIT";
                btnConfirmSubmit.disabled = false;
                if (subBtn) subBtn.innerText = "SUBMIT";
            }
        } catch (error) {
            btnConfirmSubmit.innerText = "CONFIRM & FINAL SUBMIT";
            btnConfirmSubmit.disabled = false;
            if (subBtn) subBtn.innerText = "SUBMIT";

            if (fetchSuccessful) {
                console.error("Local UI Script Error Post-Submit:", error);
                window.location.href = "/OES";
            } else {
                console.error("Server Connection Failure:", error);
                alert("Backend server se connection fail ho gaya! Check kar ki server running hai.");
            }
        }
    });
}

// --- SUCCESS SLIP ACTION BUTTONS (COPY & PRINT) --- //
const btnCopySlip = document.getElementById('btnCopySlip');
if (btnCopySlip) {
    btnCopySlip.addEventListener('click', () => {
        const name = document.getElementById('slipName')?.innerText || '';
        const appNo = document.getElementById('slipAppNo')?.innerText || '';
        const rollNo = document.getElementById('slipRollNo')?.innerText || '';
        const dob = document.getElementById('slipDob')?.innerText || '';

        const textToCopy = `--- OES REGISTRATION DETAILS ---\nName: ${name}\nApplication No: ${appNo}\nRoll No: ${rollNo}\nExam Password: ${dob}\n--------------------------------`;

        navigator.clipboard.writeText(textToCopy).then(() => {
            const originalText = btnCopySlip.innerText;
            btnCopySlip.innerText = "✅ Copied!";
            setTimeout(() => {
                btnCopySlip.innerText = originalText;
            }, 2000);
        }).catch(err => {
            alert("Copy karne me error aaya: " + err);
        });
    });
}

const btnPrintSlip = document.getElementById('btnPrintSlip');
if (btnPrintSlip) {
    btnPrintSlip.addEventListener('click', () => {
        window.print();
    });
}