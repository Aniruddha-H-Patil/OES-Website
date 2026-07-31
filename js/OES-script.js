// ==========================================
// 1. THEME MANAGEMENT
// ==========================================
// Immediate theme apply to prevent Flash of Unstyled Content (FOUC)
(function () {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "dark") {
        document.documentElement.classList.add("dark-mode");
    }
})();

// Modern global theme switcher
function toggleTheme() {
    const isDark = document.documentElement.classList.toggle("dark-mode");
    localStorage.setItem("theme", isDark ? "dark" : "light");
}

// ==========================================
// 2. DOM CONTENT LOADED (ALL BINDINGS & LOGIC)
// ==========================================
document.addEventListener("DOMContentLoaded", () => {

    // --- A. THEME BUTTON EVENT ---
    const themeBtn = document.getElementById("THEME");
    if (themeBtn) {
        themeBtn.addEventListener("click", toggleTheme);
    }

    // --- B. LOGIN REDIRECT ---
    const loginBtn = document.getElementById("LOGIN");
    if (loginBtn) {
        loginBtn.addEventListener("click", () => {
            window.location.href = "/form";
        });
    }

    // --- C. NOTICE TAB SWITCHING & RE-POSITIONING ---
    const noticeContent = document.getElementById("noticeContent");
    const publicNotice = document.getElementById("publicNotice");
    const newsEvents = document.getElementById("newsEvents");
    const candidateActivity = document.getElementById("candidateActivity");
    const leftside = document.getElementById("leftside");
    const rightside = document.getElementById("rightside");

    if (noticeContent && publicNotice && newsEvents && candidateActivity && leftside && rightside) {
        // Cache initial DOM content safely
        const originalNoticeHTML = noticeContent.innerHTML;

        newsEvents.addEventListener("click", () => {
            noticeContent.innerHTML = '<p class="empty-notice-msg">No post to display</p>';
            if (!leftside.contains(candidateActivity)) {
                leftside.appendChild(candidateActivity);
            }
        });

        publicNotice.addEventListener("click", () => {
            noticeContent.innerHTML = originalNoticeHTML;
            if (!rightside.contains(candidateActivity)) {
                rightside.appendChild(candidateActivity);
            }
        });
    }
});

// ==========================================
// 3. PAGE INITIALIZATION & NETWORK HANDLING
// ==========================================
window.addEventListener("load", () => {

    // --- A. OFFLINE / ONLINE OVERLAY ---
    function updateOnlineStatus() {
        let offlineBanner = document.getElementById("offline-overlay");

        if (!navigator.onLine) {
            if (!offlineBanner) {
                offlineBanner = document.createElement("div");
                offlineBanner.id = "offline-overlay";
                offlineBanner.style.cssText = `
                    position: fixed; top: 0; left: 0; width: 100%; height: 100vh;
                    background: #121212; color: #fff; z-index: 10000;
                    display: flex; flex-direction: column; justify-content: center;
                    align-items: center; font-family: sans-serif; text-align: center;
                `;
                offlineBanner.innerHTML = `
                    <h1 style="font-size:2rem; margin-bottom:10px;">You are Offline</h1>
                    <p style="color:#aaa;">Please check your internet connection.</p>
                `;
                document.body.appendChild(offlineBanner);
            }
            offlineBanner.style.display = "flex";
            document.body.style.overflow = "hidden";
        } else if (offlineBanner) {
            offlineBanner.style.display = "none";
            document.body.style.overflow = "";
        }
    }

    window.addEventListener("online", updateOnlineStatus);
    window.addEventListener("offline", updateOnlineStatus);
    updateOnlineStatus();

    // --- B. LOADER & TYPEWRITER ANIMATION ---
    const loader = document.getElementById("loader");
    const typingElem = document.getElementById("typing");

    if (loader) {
        loader.classList.add("hide");

        setTimeout(() => {
            loader.style.display = "none";

            // Clean & Non-blocking Typewriter via setInterval
            if (typingElem) {
                const text = "WELCOME TO BOSS";
                let i = 0;
                typingElem.textContent = ""; 

                const timer = setInterval(() => {
                    if (i < text.length) {
                        typingElem.textContent += text.charAt(i);
                        i++;
                    } else {
                        clearInterval(timer);
                    }
                }, 100);
            }
        }, 600);
    }
});