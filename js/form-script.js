// Strict Global State Bindings
const passwordInput = document.getElementById("pws");
const eyeIcon = document.getElementById("eye");
const form = document.getElementById("regform");
const resetBtn = document.getElementById("btnReset") || document.getElementById("reset");

// --- PHOTO UI DOM ELEMENTS --- //
const photoFile = document.getElementById('photoFile');
const btnUpload = document.getElementById('btnUpload');
const btnLiveCapture = document.getElementById('btnLiveCapture');

const previewBox = document.getElementById('photoPreviewBox');
const noPhotoText = document.getElementById('noPhotoText');
const finalPhotoPreview = document.getElementById('finalPhotoPreview');
const webcam = document.getElementById('webcam');
const photoCanvas = document.getElementById('photoCanvas');

const mainPhotoBtns = document.getElementById('mainPhotoBtns');
const camControls = document.getElementById('camControls');
const btnCaptureFrame = document.getElementById('btnCaptureFrame');
const btnCancelCam = document.getElementById('btnCancelCam');

// Global Shared States
window.mediaStream = null;
window.capturedBlob = null;
window.activeMode = null; // 'upload' or 'camera'

// 1. Password Visibility Logic
if (passwordInput && eyeIcon) {
    passwordInput.addEventListener("input", () => {
        if (passwordInput.value.length > 0) {
            eyeIcon.classList.remove("hidden-element");
        } else {
            eyeIcon.classList.add("hidden-element");
        }
    });

    eyeIcon.addEventListener("click", () => {
        passwordInput.type = passwordInput.type === "password" ? "text" : "password";
    });
}

// 2. Reset Button Pipeline Function
function empty(event) {
    if (event) event.preventDefault(); 
     
    if (confirm("ARE YOU SURE!\nYOU WANT TO RESET THIS FORM?")) {
        if (form) {
            // Shadowing Bypass: Native Form Reset Call
            HTMLFormElement.prototype.reset.call(form);
            
            if (eyeIcon) eyeIcon.classList.add("hidden-element"); 
            if (passwordInput) passwordInput.type = "password";

            // Photo UI & Webcam Reset Logic
            stopWebcam();
            
            if (photoFile) photoFile.value = ""; // Force clear file input
            
            if (finalPhotoPreview) {
                finalPhotoPreview.classList.add('hidden-element');
                finalPhotoPreview.src = "";
            }
            if (noPhotoText) noPhotoText.classList.remove('hidden-element');
            if (webcam) webcam.classList.add('hidden-element');
            if (camControls) camControls.classList.add('hidden-element');
            if (mainPhotoBtns) mainPhotoBtns.classList.remove('hidden-element');
            if (btnLiveCapture) btnLiveCapture.innerText = "📸 Live Capture";
               
            window.capturedBlob = null;
            window.activeMode = null;
        }
    }
}

// Explicit Event Listener for Reset Button
if (resetBtn) {
    resetBtn.addEventListener('click', empty);
}

// Global scope binding
window.empty = empty;

// Helper to revoke old Object URLs (Memory Leak Prevention)
function safePreviewSet(url) {
    if (finalPhotoPreview) {
        if (finalPhotoPreview.src && finalPhotoPreview.src.startsWith('blob:')) {
            URL.revokeObjectURL(finalPhotoPreview.src);
        }
        finalPhotoPreview.src = url;
    }
}

// --- PHOTO UI LOGIC START --- //

// 1. Upload Button Trigger
if (btnUpload) {
    btnUpload.addEventListener('click', () => {
        if (photoFile) photoFile.click();
    });
}

// File Selected Event
if (photoFile) {
    photoFile.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
            stopWebcam();

            window.activeMode = 'upload';
            window.capturedBlob = null;
            
            const file = e.target.files[0];
            safePreviewSet(URL.createObjectURL(file));
            
            // UI Adjustments using Classes
            if (noPhotoText) noPhotoText.classList.add('hidden-element');
            if (webcam) webcam.classList.add('hidden-element');
            if (camControls) camControls.classList.add('hidden-element');
            if (mainPhotoBtns) mainPhotoBtns.classList.remove('hidden-element');
            if (finalPhotoPreview) finalPhotoPreview.classList.remove('hidden-element');
        }
    });
}

// 2. Live Capture Trigger
if (btnLiveCapture) {
    btnLiveCapture.addEventListener('click', async () => {
        try {
            window.mediaStream = await navigator.mediaDevices.getUserMedia({ 
                video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" } 
            });
            if (webcam) webcam.srcObject = window.mediaStream;
            
            // UI Adjustments using Classes
            if (noPhotoText) noPhotoText.classList.add('hidden-element');
            if (finalPhotoPreview) finalPhotoPreview.classList.add('hidden-element');
            if (webcam) webcam.classList.remove('hidden-element');
            
            if (mainPhotoBtns) mainPhotoBtns.classList.add('hidden-element');
            if (camControls) camControls.classList.remove('hidden-element');
        } catch (err) {
            alert("Camera permission denied ya camera nahi mila!");
        }
    });
}

// 3. Click Photo from Webcam
if (btnCaptureFrame) {
    btnCaptureFrame.addEventListener('click', () => {
        if (!webcam || !webcam.srcObject) return;

        photoCanvas.width = webcam.videoWidth || 640;
        photoCanvas.height = webcam.videoHeight || 480;
        const ctx = photoCanvas.getContext('2d');
        
        ctx.translate(photoCanvas.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(webcam, 0, 0, photoCanvas.width, photoCanvas.height);

        photoCanvas.toBlob((blob) => {
            if (!blob) {
                alert("Photo capture karne me dikkat aayi!");
                return;
            }

            window.capturedBlob = blob;
            window.activeMode = 'camera';
            if (photoFile) photoFile.value = "";
            
            safePreviewSet(URL.createObjectURL(blob));
            
            stopWebcam();
            if (webcam) webcam.classList.add('hidden-element');
            if (finalPhotoPreview) finalPhotoPreview.classList.remove('hidden-element');
            
            if (camControls) camControls.classList.add('hidden-element');
            if (mainPhotoBtns) mainPhotoBtns.classList.remove('hidden-element');
            if (btnLiveCapture) btnLiveCapture.innerText = "🔄 Retake Photo";
        }, 'image/jpeg', 0.95);
    });
}

// 4. Cancel Cam
if (btnCancelCam) {
    btnCancelCam.addEventListener('click', () => {
        stopWebcam();
        if (webcam) webcam.classList.add('hidden-element');
        if (camControls) camControls.classList.add('hidden-element');
        if (mainPhotoBtns) mainPhotoBtns.classList.remove('hidden-element');
        
        if (window.activeMode && finalPhotoPreview && finalPhotoPreview.src) {
            finalPhotoPreview.classList.remove('hidden-element');
        } else {
            if (noPhotoText) noPhotoText.classList.remove('hidden-element');
            if (finalPhotoPreview) finalPhotoPreview.classList.add('hidden-element');
        }
    });
}

function stopWebcam() {
    if (window.mediaStream) {
        window.mediaStream.getTracks().forEach(track => track.stop());
        window.mediaStream = null;
    }
}
// --- PHOTO UI LOGIC END --- //