import {
    createDecartClient,
    models
} from "https://esm.sh/@decartai/sdk@0.2.2";


document.addEventListener("DOMContentLoaded", () => {

    // =========================================================
    // DOM ELEMENTS
    // =========================================================

    const trialRoomSection =
        document.getElementById("trial-room-section");

    const trialOutput =
        document.getElementById("trial-output");

    const trialStatus =
        document.getElementById("trial-status");

    const garmentUpload =
        document.getElementById("garment-upload");

    const garmentPreview =
        document.getElementById("garment-preview");

    const applyGarmentBtn =
        document.getElementById("apply-garment-btn");

    const stopTrialBtn =
        document.getElementById("stop-trial-btn");

    const closeTrialBtn =
        document.getElementById("close-trial-btn");

    const trialRoomBtn =
        document.getElementById("trial-room-btn");


    // =========================================================
    // STATE
    // =========================================================

    let realtimeClient = null;
    let cameraStream = null;

    let selectedGarmentBlob = null;
    let selectedGarmentName = "";

    let currentCategory = "T-Shirt";
    let currentProductTitle = "";

    let trialStarting = false;


    if (!trialRoomSection) {
        return;
    }


    // =========================================================
    // TRIAL ROOM BUTTON FROM MEASURED SIZE SCREEN
    // =========================================================

    if (trialRoomBtn) {

    trialRoomBtn.addEventListener("click", () => {

        currentCategory =
            document.getElementById("category-select")?.value ||
            "T-Shirt";

        currentProductTitle = "";
        selectedGarmentBlob = null;
        selectedGarmentName = "";

        garmentPreview.src = "";
        garmentPreview.classList.add("hidden");

        // Do NOT start Decart yet.
        applyGarmentBtn.disabled = true;

        stopTrialRoom();

        openTrialRoom();

        setStatus(
            "Select a garment, then click Apply Garment.",
            "idle"
        );
    });
}


    // =========================================================
    // TRY IT ON BUTTON
    // =========================================================

    document.addEventListener("click", async (event) => {

        const button = event.target.closest(".try-on-btn");

        if (!button) {
            return;
        }

        const imageUrl =
            decodeURIComponent(button.dataset.image || "");

        currentCategory =
            decodeURIComponent(
                button.dataset.category || "T-Shirt"
            );

        currentProductTitle =
            decodeURIComponent(
                button.dataset.title || ""
            );

        if (
            !imageUrl ||
            imageUrl.startsWith("data:image/svg+xml")
        ) {
            openTrialRoom();

            setStatus(
                "This product does not have a usable garment image.",
                "error"
            );

            return;
        }

        // Stop any previous trial
        stopTrialRoom();

        // Open Trial Room
        openTrialRoom();

        setStatus(
            "Loading selected garment...",
            "loading"
        );

        try {

            // Download product image
            let rawBlob = await imageUrlToBlob(imageUrl);

            selectedGarmentName =
                currentProductTitle ||
                "Recommended garment";

            selectedGarmentBlob = new File(
                [rawBlob],
                selectedGarmentName + ".jpg",
                { type: rawBlob.type || "image/jpeg" }
            );

            try {
                const dt = new DataTransfer();
                dt.items.add(selectedGarmentBlob);
                garmentUpload.files = dt.files;
            } catch (e) {
                console.error("Could not set file input:", e);
            }

            // Show product image in preview
            showGarmentPreview(
                selectedGarmentBlob
            );

            // Enable Apply Garment button
            applyGarmentBtn.disabled = false;

            // IMPORTANT:
            // Do NOT start Decart here.
            // Do NOT apply garment here.

            setStatus(
                "Garment loaded. Click Apply Garment to start the AI trial room.",
                "idle"
            );

        } catch (error) {

            console.error(
                "Try-on image error:",
                error
            );

            selectedGarmentBlob = null;
            applyGarmentBtn.disabled = true;

            setStatus(
                error.message ||
                "Could not load the product image.",
                "error"
            );
        }
    });;


    // =========================================================
    // UPLOAD YOUR OWN GARMENT
    // =========================================================

        garmentUpload.addEventListener(
            "change",
            async (event) => {

                const file =
                    event.target.files?.[0];

                if (!file) {
                    return;
                }

                if (!file.type.startsWith("image/")) {

                    setStatus(
                        "Please select an image file.",
                        "error"
                    );

                    return;
                }

                selectedGarmentBlob = file;

                selectedGarmentName = file.name;

                currentProductTitle =
                    file.name.replace(
                        /\.[^/.]+$/,
                        ""
                    );

                showGarmentPreview(file);

                // Open Trial Room but DON'T start Decart
                openTrialRoom();

                // Enable Apply button
                applyGarmentBtn.disabled = false;

                setStatus(
                    "Garment selected. Click Apply Garment to start the AI trial room.",
                    "idle"
                );
            }
        );


    // =========================================================
    // APPLY GARMENT BUTTON
    // =========================================================

    applyGarmentBtn.addEventListener(
        "click",
        async () => {

            if (!selectedGarmentBlob) {

                setStatus(
                    "Please select a garment first.",
                    "error"
                );

                return;
            }


            try {

                await startTrialRoom();

                await applyGarment(
                    selectedGarmentBlob,
                    currentProductTitle,
                    currentCategory
                );

            } catch (error) {

                console.error(
                    "Apply garment error:",
                    error
                );

                setStatus(
                    error.message ||
                    "Could not apply garment.",
                    "error"
                );
            }
        }
    );


    // =========================================================
    // STOP / CLOSE
    // =========================================================

    stopTrialBtn.addEventListener(
        "click",
        stopTrialRoom
    );


    closeTrialBtn.addEventListener(
        "click",
        () => {

            stopTrialRoom();

            trialRoomSection.classList.add(
                "hidden"
            );
        }
    );


    // =========================================================
    // START DECART SESSION
    // =========================================================

    async function startTrialRoom() {

        if (realtimeClient) {
            return;
        }


        if (trialStarting) {
            return;
        }


        trialStarting = true;


        try {

            setStatus(
                "Requesting secure Decart session...",
                "loading"
            );


            // Get short-lived token from Flask
            const tokenResponse =
                await fetch(
                    "/api/decart/token",
                    {
                        method: "POST",
                        headers: {
                            "Content-Type":
                                "application/json"
                        }
                    }
                );


            const tokenData =
                await tokenResponse.json();


            if (
                !tokenResponse.ok ||
                !tokenData.success ||
                !tokenData.apiKey
            ) {

                throw new Error(
                    tokenData.error ||
                    "Could not create Decart client token."
                );
            }


            // -------------------------------------------------
            // CAMERA
            // -------------------------------------------------

            setStatus(
                "Opening camera...",
                "loading"
            );


            cameraStream =
                await navigator.mediaDevices.getUserMedia({

                    video: {
                        facingMode: "user",
                        width: 1280,
                        height: 720
                    },

                    audio: false
                });


            // -------------------------------------------------
            // DECART CLIENT
            // -------------------------------------------------

            const client =
                createDecartClient({
                    apiKey: tokenData.apiKey
                });


            const model =
                models.realtime(
                    "lucy-vton-latest"
                );


            setStatus(
                "Connecting to AI try-on...",
                "loading"
            );


            // -------------------------------------------------
            // CONNECT REALTIME
            // -------------------------------------------------

            realtimeClient =
                await client.realtime.connect(
                    cameraStream,
                    {
                        model,

                        mirror: "auto",

                        onRemoteStream:
                            (remoteStream) => {

                                trialOutput.srcObject =
                                    remoteStream;

                                trialOutput
                                    .play()
                                    .catch(() => {});


                                setStatus(
                                    "AI trial room is live",
                                    "success"
                                );
                            }
                    }
                );


            stopTrialBtn.disabled = false;

            applyGarmentBtn.disabled =
                !selectedGarmentBlob;

        } finally {

            trialStarting = false;
        }
    }


    // =========================================================
    // APPLY GARMENT
    // =========================================================

    async function applyGarment(
        blob,
        title,
        category
    ) {

        if (!realtimeClient) {
            await startTrialRoom();
        }


        if (!realtimeClient) {

            throw new Error(
                "AI trial room is not connected."
            );
        }


        setStatus(
            "Applying garment...",
            "loading"
        );


        applyGarmentBtn.disabled = true;


        const prompt =
            buildTryOnPrompt(
                title,
                category
            );


        try {

            await realtimeClient.setImage(
                blob,
                {
                    prompt,
                    enhance: true
                }
            );


            setStatus(
                "Garment applied. Move naturally in front of the camera.",
                "success"
            );

        } finally {

            applyGarmentBtn.disabled = false;
        }
    }


    // =========================================================
    // TRY-ON PROMPT
    // =========================================================

    function buildTryOnPrompt(
        title,
        category
    ) {

        const cleanTitle =
            title?.trim();

        const cleanCategory =
            category || "top";


        if (cleanTitle) {

            return `
                Substitute the current ${cleanCategory.toLowerCase()}
                with this garment: ${cleanTitle}.
                Preserve the person's body, face, pose, skin,
                hair, and background.
                Keep the garment's color, material, pattern,
                shape, and fit realistic.
            `;
        }


        return `
            Substitute the current ${cleanCategory.toLowerCase()}
            with the uploaded garment.
            Preserve the person's body, face, pose, skin,
            hair, and background.
            Keep the garment's color, material, pattern,
            shape, and fit realistic.
        `;
    }


    // =========================================================
    // PRODUCT IMAGE → BLOB
    // =========================================================

async function imageUrlToBlob(url) {
    console.log("Product image URL:", url);

    const proxyUrl = url.startsWith("/api/image-proxy")
        ? url
        : `/api/image-proxy?url=${encodeURIComponent(url)}`;

    console.log("Proxy URL:", proxyUrl);

    const response = await fetch(proxyUrl);

    console.log(
        "Image proxy response:",
        response.status,
        response.headers.get("content-type")
    );

    if (!response.ok) {
        throw new Error(`Could not load product image. HTTP ${response.status}`);
    }

    const contentType = response.headers.get("content-type") || "";

    if (!contentType.startsWith("image/")) {
        throw new Error("The product URL did not return an image.");
    }

    const blob = await response.blob();

    console.log("Garment image loaded:", blob.type, blob.size);

    return blob;
}

    // =========================================================
    // GARMENT PREVIEW
    // =========================================================

    function showGarmentPreview(blob) {

        if (!blob) {
            return;
        }

        const objectUrl =
            URL.createObjectURL(blob);

        garmentPreview.src = objectUrl;

        garmentPreview.classList.remove("hidden");

        garmentPreview.onload = () => {
            URL.revokeObjectURL(objectUrl);
        };
    }


    // =========================================================
    // OPEN TRIAL ROOM
    // =========================================================

    function openTrialRoom() {

        trialRoomSection.classList.remove(
            "hidden"
        );


        trialRoomSection.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });
    }


    // =========================================================
    // STATUS
    // =========================================================

    function setStatus(
        message,
        type = "loading"
    ) {

        trialStatus.textContent =
            message;

        trialStatus.className =
            `trial-status ${type}`;
    }


    // =========================================================
    // STOP TRIAL ROOM
    // =========================================================

    function stopTrialRoom() {

        if (realtimeClient) {

            try {

                realtimeClient.disconnect();

            } catch (error) {

                console.error(
                    "Decart disconnect error:",
                    error
                );
            }

            realtimeClient = null;
        }


        if (cameraStream) {

            cameraStream
                .getTracks()
                .forEach(
                    track => track.stop()
                );

            cameraStream = null;
        }


        trialOutput.srcObject = null;

        stopTrialBtn.disabled = true;

        applyGarmentBtn.disabled =
            !selectedGarmentBlob;


        setStatus(
            "Trial room stopped.",
            "idle"
        );
    }


    // =========================================================
    // CLEANUP
    // =========================================================

    window.addEventListener(
        "beforeunload",
        stopTrialRoom
    );
});