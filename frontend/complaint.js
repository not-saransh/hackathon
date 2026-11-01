 document.getElementById("get-gps-btn").addEventListener("click", () => {
    const btn = document.getElementById("get-gps-btn");
    const statusText = document.getElementById("gps-status");
    const locInput = document.getElementById("location");

    if (!navigator.geolocation) {
        statusText.textContent = "GPS is not supported by your browser.";
        statusText.style.color = "#991b1b";
        return;
    }

    btn.textContent = "Locating...";
    btn.disabled = true;

    navigator.geolocation.getCurrentPosition(
        (position) => {
            const lat = position.coords.latitude.toFixed(6);
            const lng = position.coords.longitude.toFixed(6);

            document.getElementById("latitude").value = lat;
            document.getElementById("longitude").value = lng;

            // Auto-fill the text box if the user hasn't typed anything yet
            if (!locInput.value) {
                locInput.value = `GPS: ${lat}, ${lng}`;
            }

            // Professional success state
            btn.textContent = "✓ Captured";
            btn.style.background = "#dcfce7";
            btn.style.color = "#166534";
            btn.style.borderColor = "#166534";
            
            statusText.textContent = "Precise coordinates saved successfully.";
            statusText.style.color = "#166534";
        },
        (error) => {
            btn.textContent = "📍 Retry GPS";
            btn.disabled = false;
            statusText.textContent = "Unable to fetch GPS. Please allow location permissions.";
            statusText.style.color = "#991b1b";
        },
        { enableHighAccuracy: true } // Forces the device to use actual GPS hardware
    );
});

const API_BASE = "http://127.0.0.1:5000";

const form = document.getElementById("complaint-form");
const imageInput = document.getElementById("hazard-image");
const imagePreview = document.getElementById("image-preview");
const message = document.getElementById("complaint-message");
const submitButton = document.getElementById("complaint-submit");

document.getElementById("reported-on").value =
    new Date().toISOString().split("T")[0];

imageInput.addEventListener("change", () => {
    const file = imageInput.files[0];

    imagePreview.style.display = "none";
    imagePreview.removeAttribute("src");

    if (!file) return;

    if (!["image/jpeg", "image/png"].includes(file.type)) {
        showMessage("Please select a JPG or PNG image.", "error");
        imageInput.value = "";
        return;
    }

    if (file.size > 8 * 1024 * 1024) {
        showMessage("Image size must be below 8 MB.", "error");
        imageInput.value = "";
        return;
    }

    imagePreview.src = URL.createObjectURL(file);
    imagePreview.style.display = "block";
    showMessage("", "");
});

form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const image = imageInput.files[0];

    if (!image) {
        showMessage("Please upload a photograph.", "error");
        return;
    }

    const title = document.getElementById("title").value.trim();
    const category = document.getElementById("category").value;
    const location = document.getElementById("location").value.trim();
    const reportedOn = document.getElementById("reported-on").value;
    const description = document.getElementById("description").value.trim();

    if (!title || !category || !location || !reportedOn) {
        showMessage("Please complete all required fields.", "error");
        return;
    }

    submitButton.disabled = true;
    submitButton.textContent = "Submitting...";

    try {
        const imageData = new FormData();
        imageData.append("image", image);

        const uploadResponse = await fetch(`${API_BASE}/upload`, {
            method: "POST",
            body: imageData
        });

        const uploadResult = await uploadResponse.json();

        if (!uploadResponse.ok) {
            throw new Error(uploadResult.error || "Image upload failed.");
        }

        const complaintResponse = await fetch(`${API_BASE}/report`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                title,
                category,
                location,
                reported_on: reportedOn,
                description,
                image_filename: uploadResult.filename
            })
        });

        const complaintResult = await complaintResponse.json();

        if (!complaintResponse.ok) {
            throw new Error(
                complaintResult.error || "Complaint submission failed."
            );
        }

        showMessage(
            "Complaint submitted successfully! Thank you for helping make roads safer.",
            "success"
        );

        form.reset();
        imagePreview.style.display = "none";
        imagePreview.removeAttribute("src");

        document.getElementById("reported-on").value =
            new Date().toISOString().split("T")[0];

    } catch (error) {
        console.error("Complaint error:", error);

        showMessage(
            error.message || "Unable to connect to the server. Please try again.",
            "error"
        );
    } finally {
        submitButton.disabled = false;
        submitButton.textContent = "Submit Complaint";
    }
});

function showMessage(text, type) {
    message.textContent = text;
    message.className = "civic-message";

    if (type) {
        message.classList.add(type);
    }
}
