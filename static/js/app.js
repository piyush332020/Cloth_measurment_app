document.addEventListener("DOMContentLoaded", () => {

    // =========================================================
    // DOM ELEMENTS
    // =========================================================

    const categorySelect = document.getElementById("category-select");
    const genderSelect = document.getElementById("gender-select");

    const categorySection = document.getElementById("category-section");
    const measurementSection = document.getElementById("measurement-section");
    const resultSection = document.getElementById("result-section");
    const recommendationsSection = document.getElementById("recommendations-section");

    const startCameraBtn = document.getElementById("start-camera-btn");
    const stopCameraBtn = document.getElementById("stop-camera-btn");
    const manualCaptureBtn = document.getElementById("manual-capture-btn");
    const measureAgainBtn = document.getElementById("measure-again-btn");
    const changeCategoryBtn = document.getElementById("change-category-btn");
    const findClothesBtn = document.getElementById("find-clothes-btn");

    const video = document.getElementById("webcam");
    const captureCanvas = document.getElementById("capture-canvas");
    const captureCtx = captureCanvas.getContext("2d");

    const statusText = document.getElementById("status-text");
    const liveSize = document.getElementById("live-size");
    const liveDistance = document.getElementById("live-distance");

    const lockTimerText = document.getElementById("lock-timer-text");
    const progressFill = document.getElementById("progress-fill");

    const lockedSizeDisplay = document.getElementById("locked-size-display");
    const lockedCategoryDisplay = document.getElementById("locked-category-display");
    const lockedGenderDisplay = document.getElementById("locked-gender-display");

    const searchSizeSelect = document.getElementById("search-size-select");
    const reminderMeasuredSize = document.getElementById("reminder-measured-size");
    const loadingRecommendations = document.getElementById("loading-recommendations");
    const productGrid = document.getElementById("product-grid");


    // =========================================================
    // STATE VARIABLES
    // =========================================================

    let stream = null;
    let measuringInterval = null;
    let progressInterval = null;
    let isMeasuring = false;
    let requestInProgress = false;

    let currentStableSize = null;
    let stableStartTime = 0;
    const LOCK_TIME_MS = 3000;


    // =========================================================
    // LOCAL STORAGE
    // =========================================================

    initFromStorage();

    function initFromStorage() {
        if (categorySelect) {
            const savedCategory = localStorage.getItem("cloth_category");
            if (savedCategory) categorySelect.value = savedCategory;
        }

        if (genderSelect) {
            const savedGender = localStorage.getItem("cloth_gender");
            if (savedGender) genderSelect.value = savedGender;
        }
    }

    function saveToStorage() {
        if (categorySelect) localStorage.setItem("cloth_category", categorySelect.value);
        if (genderSelect) localStorage.setItem("cloth_gender", genderSelect.value);
    }


    // =========================================================
    // EVENT LISTENERS
    // =========================================================

    if (startCameraBtn) {
        startCameraBtn.addEventListener("click", () => {
            saveToStorage();
            startCamera();
        });
    }

    if (stopCameraBtn) stopCameraBtn.addEventListener("click", stopCameraAndReset);

    if (manualCaptureBtn) {
        manualCaptureBtn.addEventListener("click", () => {
            if (currentStableSize && isMeasuring) {
                lockSize(currentStableSize);
            }
        });
    }

    if (measureAgainBtn) {
        measureAgainBtn.addEventListener("click", () => {
            resultSection.classList.add("hidden");
            recommendationsSection.classList.add("hidden");
            startCamera();
        });
    }

    if (changeCategoryBtn) {
        changeCategoryBtn.addEventListener("click", () => {
            resultSection.classList.add("hidden");
            recommendationsSection.classList.add("hidden");
            categorySection.classList.remove("hidden");
        });
    }

    if (findClothesBtn) {
        findClothesBtn.addEventListener("click", () => {
            const size = lockedSizeDisplay.textContent.trim();
            const category = categorySelect.value;
            const gender = genderSelect.value;

            if (!size || size === "-") {
                console.error("No valid locked size found.");
                return;
            }

            if (searchSizeSelect) searchSizeSelect.value = size;
            if (reminderMeasuredSize) reminderMeasuredSize.textContent = size;

            fetchRecommendations(category, size, gender);
        });
    }

    if (searchSizeSelect) {
        searchSizeSelect.addEventListener("change", (event) => {
            const selectedSize = event.target.value;
            fetchRecommendations(
                categorySelect.value,
                selectedSize,
                genderSelect.value
            );
        });
    }


    // =========================================================
    // CAMERA
    // =========================================================

    async function startCamera() {
        if (categorySection) categorySection.classList.add("hidden");
        if (measurementSection) measurementSection.classList.remove("hidden");

        isMeasuring = false;
        clearInterval(measuringInterval);
        cancelAnimationFrame(progressInterval);
        resetLockTimer();

        // Initial UI resets
        if (statusText) statusText.textContent = "Detecting...";
        if (liveSize) liveSize.textContent = "-";
        if (liveDistance) liveDistance.textContent = "-";

        try {
            stream = await navigator.mediaDevices.getUserMedia({
                video: { width: 640, height: 480, facingMode: "user" },
                audio: false
            });

            video.srcObject = stream;

            video.onloadedmetadata = () => {
                video.play();
                captureCanvas.width = video.videoWidth || 640;
                captureCanvas.height = video.videoHeight || 480;

                isMeasuring = true;
                resetLockTimer();

                measuringInterval = setInterval(processFrame, 1000);
                progressInterval = requestAnimationFrame(updateProgress);
            };
        } catch (error) {
            console.error("Camera error:", error);
            alert("Could not access camera. Please allow camera permission.");
            if (categorySection) categorySection.classList.remove("hidden");
            if (measurementSection) measurementSection.classList.add("hidden");
        }
    }

    function stopCameraAndReset() {
        isMeasuring = false;
        clearInterval(measuringInterval);
        cancelAnimationFrame(progressInterval);
        resetLockTimer();

        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            stream = null;
        }

        if (measurementSection) measurementSection.classList.add("hidden");
        if (categorySection) categorySection.classList.remove("hidden");
    }


    // =========================================================
    // FRAME PROCESSING
    // =========================================================

    async function processFrame() {
        if (!isMeasuring || requestInProgress) return;
        if (!video.videoWidth || !video.videoHeight) return;

        requestInProgress = true;

        try {
            captureCtx.drawImage(video, 0, 0, captureCanvas.width, captureCanvas.height);
            const dataURL = captureCanvas.toDataURL("image/jpeg", 0.6);

            const response = await fetch("/api/measure", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ image: dataURL })
            });

            if (!response.ok) {
                throw new Error(`Measurement HTTP error: ${response.status}`);
            }

            const data = await response.json();
            updateUI(data);
            handleLockLogic(data);
        } catch (error) {
            console.error("Error sending frame:", error);
            if (statusText) statusText.textContent = "Processing error";
        } finally {
            requestInProgress = false;
        }
    }


    // =========================================================
    // UPDATE MEASUREMENT UI
    // =========================================================

    function updateUI(data) {
        if (!data) return;

        if (!data.success) {
            if (statusText) statusText.textContent = data.status || "Measurement failed";
            if (manualCaptureBtn) manualCaptureBtn.disabled = true;
            return;
        }

        if (liveSize) liveSize.textContent = data.size || "-";
        if (liveDistance) {
            liveDistance.textContent = (data.distance_cm !== null && data.distance_cm !== undefined) 
                ? `${data.distance_cm} cm` 
                : "-";
        }

        if (statusText) {
            statusText.textContent = data.status || "Detecting...";
            statusText.className = "status-badge";

            if (data.status === "Perfect Distance") {
                statusText.classList.add("perfect");
            } else if (data.status && data.status.includes("Move")) {
                statusText.classList.add("warning");
            } else if (data.status === "Person not detected") {
                statusText.classList.add("error");
            }
        }

        if (manualCaptureBtn) {
            manualCaptureBtn.disabled = !(data.ready && data.size);
        }
    }


    // =========================================================
    // 3 SECOND LOCK
    // =========================================================

    function handleLockLogic(data) {
        if (!data || !data.ready || !data.size) {
            resetLockTimer();
            return;
        }

        const detectedSize = data.size;

        if (currentStableSize === detectedSize) {
            if (stableStartTime === 0) {
                stableStartTime = Date.now();
            }

            const elapsed = Date.now() - stableStartTime;
            if (elapsed >= LOCK_TIME_MS) {
                lockSize(detectedSize);
            }
        } else {
            currentStableSize = detectedSize;
            stableStartTime = Date.now();
        }
    }

    function resetLockTimer() {
        currentStableSize = null;
        stableStartTime = 0;
        if (progressFill) progressFill.style.width = "0%";
        if (lockTimerText) lockTimerText.textContent = "Hold steady to lock size...";
    }

    function updateProgress() {
        if (!isMeasuring) return;

        if (stableStartTime > 0 && currentStableSize) {
            const elapsed = Date.now() - stableStartTime;
            let percentage = (elapsed / LOCK_TIME_MS) * 100;
            if (percentage > 100) percentage = 100;

            if (progressFill) progressFill.style.width = `${percentage}%`;
            if (lockTimerText) {
                lockTimerText.textContent = `Holding size ${currentStableSize}... ${(elapsed / 1000).toFixed(1)}s`;
            }
        } else {
            if (progressFill) progressFill.style.width = "0%";
            if (lockTimerText) lockTimerText.textContent = "Hold steady to lock size...";
        }

        if (isMeasuring) {
            progressInterval = requestAnimationFrame(updateProgress);
        }
    }


    // =========================================================
    // LOCK SIZE
    // =========================================================

    function lockSize(size) {
        if (!size) return;

        isMeasuring = false;
        clearInterval(measuringInterval);
        cancelAnimationFrame(progressInterval);

        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            stream = null;
        }

        if (measurementSection) measurementSection.classList.add("hidden");
        if (resultSection) resultSection.classList.remove("hidden");

        if (lockedSizeDisplay) lockedSizeDisplay.textContent = size;
        if (lockedCategoryDisplay) lockedCategoryDisplay.textContent = categorySelect ? categorySelect.value : "";
        if (lockedGenderDisplay) lockedGenderDisplay.textContent = genderSelect ? genderSelect.value : "";
        if (reminderMeasuredSize) reminderMeasuredSize.textContent = size;
    }


    // =========================================================
    // PRODUCT RECOMMENDATIONS
    // =========================================================

    async function fetchRecommendations(category, size, gender) {
        if (recommendationsSection) recommendationsSection.classList.remove("hidden");
        if (productGrid) productGrid.innerHTML = "";
        if (loadingRecommendations) loadingRecommendations.classList.remove("hidden");
        if (recommendationsSection) recommendationsSection.scrollIntoView({ behavior: "smooth" });

        try {
            const response = await fetch("/api/recommend", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ category, size, gender })
            });

            if (!response.ok) {
                throw new Error(`Recommendation HTTP error: ${response.status}`);
            }
                
            const data = await response.json();
            if (loadingRecommendations) loadingRecommendations.classList.add("hidden");

            if (data.success && Array.isArray(data.products) && data.products.length > 0) {
                renderProducts(data.products);
            } else if (productGrid) {
                productGrid.innerHTML = `
                    <div class="no-products">
                        <h3>No products found</h3>
                        <p>No products were returned for ${gender} ${category} in size ${size}.</p>
                    </div>
                `;
            }
        } catch (error) {
            console.error("Recommendation error:", error);
            if (loadingRecommendations) loadingRecommendations.classList.add("hidden");
            if (productGrid) {
                productGrid.innerHTML = `
                    <div class="no-products">
                        <h3>Unable to load products</h3>
                        <p>Please try again in a few seconds.</p>
                    </div>
                `;
            }
        }
    }


    // =========================================================
    // RENDER PRODUCTS
    // =========================================================

    function renderProducts(products) {
        if (!productGrid) return;
        productGrid.innerHTML = "";

        const svgPlaceholder = "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(`
            <svg xmlns="http://www.w3.org/2000/svg" width="400" height="500">
                <rect width="100%" height="100%" fill="#eeeeee"/>
                <text x="50%" y="50%" text-anchor="middle" font-size="20" fill="#666666">
                    No Image
                </text>
            </svg>
        `);

        products.forEach(product => {
            const card = document.createElement("div");
            card.className = "product-card";

            let sizeText = `Recommended Size: ${product.size}`;
            if (product.size_verified === true) {
                sizeText = `✅ Size ${product.size} available`;
            } else if (product.size_verified === false) {
                sizeText = `❌ Size ${product.size} unavailable`;
            } else {
                sizeText = `⚠️ Check Size ${product.size}`;
            }

            let imageUrl = product.image || svgPlaceholder;
            const productUrl = product.url || "#";
            const website = product.website || "Retailer";

            card.innerHTML = `
                <img
                    class="product-image"
                    src="${imageUrl}"
                    alt="${product.title || "Product"}"
                    loading="lazy"
                    onerror="this.onerror=null; this.src='${svgPlaceholder}';"
                >
                <div class="product-info">
                    <h3 class="product-title">${product.title || "Unknown Product"}</h3>
                    <div class="product-price">${product.price || "Check Price"}</div>
                    <div class="product-meta">
                        <span>Website: <strong>${website}</strong></span>
                        <span class="rec-size">${sizeText}</span>
                        <span>Category: ${product.category || ""}</span>
                    </div>
                    <a href="${productUrl}" target="_blank" rel="noopener noreferrer" class="btn primary-btn">
                        View on ${website}
                    </a>
                </div>
            `;

            productGrid.appendChild(card);
        });
    }

});