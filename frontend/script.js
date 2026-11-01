
const API_BASE = "http://127.0.0.1:5000";
const REPORTS_URL = `${API_BASE}/reports`;

const allowedCategories = [
    "pothole",
    "open-manhole",
    "waterlogging",
    "road-construction",
    "blocked-drainage",
    "other"
];

const allowedStatuses = [
    "open",
    "reported",
    "assigned",
    "in-progress",
    "resolved"
];

const categoryLabels = {
    "pothole": "Pothole",
    "open-manhole": "Open Manhole",
    "waterlogging": "Water Logging",
    "road-construction": "Road Construction",
    "blocked-drainage": "Blocked Drainage",
    "other": "Other"
};

const statusLabels = {
    "open": "Open",
    "reported": "Reported",
    "assigned": "Assigned",
    "in-progress": "Work In Progress",
    "resolved": "Resolved"
};

let complaints = [];
let currentPage = 1;
const cardsPerPage = 3;

const complaintList = document.getElementById("complaint-list");
const complaintMessage = document.getElementById("complaint-message");
const categoryFilter = document.getElementById("category-filter");
const statusFilter = document.getElementById("status-filter");
const searchInput = document.getElementById("search-input");

const pagination = document.getElementById("pagination");
const prevPage = document.getElementById("prevPage");
const nextPage = document.getElementById("nextPage");
const pageNumbers = document.getElementById("pageNumbers");

function safeText(value, fallback = "") {
    return typeof value === "string" ? value : fallback;
}

function isValidImageFilename(filename) {
    return (
        typeof filename === "string" &&
        /^[a-zA-Z0-9_-][a-zA-Z0-9._-]*\.(png|jpg|jpeg|webp|gif)$/i.test(filename)
    );
}

function createComplaintCard(complaint) {
    const card = document.createElement("article");
    card.className = "complaint-card";

    const imageFilename = complaint.image_filename;

    if (isValidImageFilename(imageFilename)) {
        const image = document.createElement("img");

        image.src = `${API_BASE}/uploads/${encodeURIComponent(imageFilename)}`;

        image.alt = safeText(complaint.title, "Complaint image");
        image.className = "complaint-image";
        image.loading = "lazy";

        image.addEventListener("error", () => {
            image.remove();
        });

        card.appendChild(image);
    }

    const info = document.createElement("div");
    info.className = "complaint-info";

    const title = document.createElement("h2");
    title.textContent = safeText(
        complaint.title,
        "Untitled complaint"
    );

    const description = document.createElement("p");
    description.className = "complaint-description";
    description.textContent = safeText(
        complaint.description,
        "No description provided."
    );

    const location = document.createElement("p");
    location.className = "complaint-location";

    const locationLabel = document.createElement("strong");
    locationLabel.textContent = "Location: ";

    const locationText = document.createTextNode(
        safeText(complaint.location, "Location unavailable")
    );

    location.appendChild(locationLabel);
    location.appendChild(locationText);

    const category = document.createElement("p");
    category.className = "complaint-category";

    const categoryLabel = document.createElement("strong");
    categoryLabel.textContent = "Category: ";

    const receivedCategory = safeText(complaint.category).toLowerCase();

    const categoryText = document.createTextNode(
        allowedCategories.includes(receivedCategory)
            ? categoryLabels[receivedCategory]
            : "Other"
    );

    category.appendChild(categoryLabel);
    category.appendChild(categoryText);

    const status = document.createElement("span");
    status.className = "complaint-status";

    const receivedStatus = safeText(complaint.status).toLowerCase();

    if (allowedStatuses.includes(receivedStatus)) {
        status.classList.add(`status-${receivedStatus}`);
        status.textContent = statusLabels[receivedStatus];
    } else {
        status.classList.add("status-unknown");
        status.textContent = "Status unavailable";
    }

    info.appendChild(title);
    info.appendChild(description);
    info.appendChild(location);
    info.appendChild(category);
    info.appendChild(status);

    card.appendChild(info);

    return card;
}

function getFilteredComplaints() {
    const selectedCategory = categoryFilter.value;
    const selectedStatus = statusFilter.value;
    const searchValue = searchInput.value.trim().toLowerCase();

    return complaints.filter((complaint) => {
        const category = safeText(complaint.category).toLowerCase();
        const status = safeText(complaint.status).toLowerCase();

        const title = safeText(complaint.title).toLowerCase();
        const description = safeText(complaint.description).toLowerCase();
        const location = safeText(complaint.location).toLowerCase();

        const matchesCategory =
            selectedCategory === "all" ||
            category === selectedCategory;

        const matchesStatus =
            selectedStatus === "all" ||
            status === selectedStatus;

        const matchesSearch =
            title.includes(searchValue) ||
            description.includes(searchValue) ||
            location.includes(searchValue);

        return matchesCategory && matchesStatus && matchesSearch;
    });
}

function displayPagination(totalPages) {
    pageNumbers.replaceChildren();

    pagination.style.display =
        totalPages <= 1 ? "none" : "flex";

    prevPage.disabled = currentPage === 1;
    nextPage.disabled = currentPage === totalPages;

    for (let i = 1; i <= totalPages; i++) {
        const button = document.createElement("button");

        button.type = "button";
        button.textContent = i;
        button.className = i === currentPage ? "active" : "";

        button.addEventListener("click", () => {
            currentPage = i;
            displayComplaints();
        });

        pageNumbers.appendChild(button);
    }
}

function displayComplaints() {
    complaintList.replaceChildren();

    const filteredComplaints = getFilteredComplaints();

    if (filteredComplaints.length === 0) {
        complaintMessage.textContent = complaints.length === 0
            ? "No complaints are available yet."
            : "No complaints match your filters.";

        pagination.style.display = "none";
        pageNumbers.replaceChildren();

        return;
    }

    const totalPages = Math.ceil(
        filteredComplaints.length / cardsPerPage
    );

    currentPage = Math.min(currentPage, totalPages);

    const startIndex = (currentPage - 1) * cardsPerPage;
    const endIndex = startIndex + cardsPerPage;

    const complaintsToShow = filteredComplaints.slice(
        startIndex,
        endIndex
    );

    complaintsToShow.forEach((complaint) => {
        complaintList.appendChild(createComplaintCard(complaint));
    });

    complaintMessage.textContent =
        `Showing ${startIndex + 1}-${Math.min(endIndex, filteredComplaints.length)} of ${filteredComplaints.length} complaint(s).`;

    displayPagination(totalPages);
}

async function fetchComplaints() {
    complaintMessage.textContent = "Loading complaints...";
    complaintList.replaceChildren();
    pagination.style.display = "none";

    try {
        const response = await fetch(REPORTS_URL);

        if (!response.ok) {
            throw new Error(`Server responded with status ${response.status}`);
        }

        const data = await response.json();

        if (!Array.isArray(data)) {
            throw new Error("The server response was not a complaint list.");
        }

        complaints = data;
        currentPage = 1;
        displayComplaints();

    } catch (error) {
        console.error("Error loading complaints:", error);

        complaints = [];
        complaintList.replaceChildren();
        pageNumbers.replaceChildren();

        pagination.style.display = "none";

        complaintMessage.textContent =
            "Unable to load complaints. Please try again later.";
    }
}

prevPage.addEventListener("click", () => {
    if (currentPage > 1) {
        currentPage--;
        displayComplaints();
    }
});

nextPage.addEventListener("click", () => {
    const totalPages = Math.ceil(
        getFilteredComplaints().length / cardsPerPage
    );

    if (currentPage < totalPages) {
        currentPage++;
        displayComplaints();
    }
});

categoryFilter.addEventListener("change", () => {
    currentPage = 1;
    displayComplaints();
});

statusFilter.addEventListener("change", () => {
    currentPage = 1;
    displayComplaints();
});

searchInput.addEventListener("input", () => {
    currentPage = 1;
    displayComplaints();
});

fetchComplaints();
