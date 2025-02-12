const $ = (x) => document.querySelector(x);
const $$ = (x) => document.querySelectorAll(x);
const esc = (x) => {
    const txt = document.createTextNode(x);
    const p = document.createElement("p");
    p.appendChild(txt);
    return p.innerHTML;
};

// Initialize WebSocket for real-time updates
const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
const ws = new WebSocket(`${protocol}//${window.location.host}`);

// WebSocket connection handling
ws.onopen = () => {
    console.log('Connected to server');
    // Request initial online count
    ws.send(JSON.stringify({ channel: 'peopleOnline', data: null }));
};

ws.onerror = (error) => {
    console.error('WebSocket error:', error);
    // Fall back to polling on WebSocket error
    getPeopleOnline();
};

ws.onclose = () => {
    console.log('WebSocket connection closed');
    // Fall back to polling when connection closes
    getPeopleOnline();
    // Try to reconnect after 5 seconds
    setTimeout(() => {
        window.location.reload();
    }, 5000);
};

// Get base from localStorage instead of sessionStorage for persistence
let base = localStorage.getItem("peopleOnline") 
    ? +localStorage.getItem("peopleOnline") 
    : Math.floor(Math.random() * 50 + 30);
localStorage.setItem("peopleOnline", base);

const noise = Math.floor(Math.random() * 10 - 5);
let allTags = [];

if (!localStorage.getItem("peopleOnline")) {
    localStorage.setItem("peopleOnline", base);
} else {
    base = +localStorage.getItem("peopleOnline");
}

function updateURL(tags) {
    const url = new URL(window.location.href);
    url.searchParams.set("tags", tags.join(","));
    window.history.pushState({}, "", url);
}

function initTagsFromURL() {
    const url = new URL(window.location.href);
    const tags = url.searchParams.get("tags");
    const $tags = $("#tag-container");
    if (tags) {
        let t = tags.split(",");
        allTags = t;
        t.forEach((value) => {
            const tag = document.createElement("div");
            tag.id = "tag";
            tag.innerHTML = `<p><span>${esc(value)}</span> ×</p>`;
            tag.style = "cursor: pointer";

            tag.onclick = () => {
                tag.remove();
                allTags = allTags.filter((x) => x !== tag.getElementsByTagName("span")[0].innerText);
                updateURL(allTags);
            };
            $tags.appendChild(tag);
        });
    }
}

function configureTags() {
    const $input = $("#interest-container input");
    const $tags = $("#tag-container");
    const $textBtn = $("#text-btn");
    const $videoBtn = $("#video-btn");

    $input.addEventListener("keydown", (e) => {
        if (e.key !== "Enter" && e.key !== ",") return;

        const value = $input.value.trim();
        if (!value) return;

        allTags.push(value);
        updateURL(allTags);
        const tag = document.createElement("div");
        tag.id = "tag";
        tag.innerHTML = `<p><span>${esc(value)}</span> ×</p>`;
        tag.style = "cursor: pointer";

        tag.onclick = () => {
            tag.remove();
            allTags = allTags.filter((x) => x !== tag.getElementsByTagName("span")[0].innerText);
            updateURL(allTags);
        };
        $tags.appendChild(tag);

        $input.value = "";

        e.preventDefault();
    });

    $textBtn.addEventListener("click", () => {
        const interests = Array.from($$("#tag p span")).map((x) => x.innerText);
        window.location.href = "/chat?" + new URLSearchParams({ interests });
    });

    $videoBtn.addEventListener("click", () => {
        allTags = [];
        const interests = Array.from($$("#tag p span")).map((x) => x.innerText);
        window.location.href = "/video?" + new URLSearchParams({ interests });
    });
}

async function getPeopleOnline() {
    const $peopleOnline = $("#peopleOnline p span");
    try {
        const res = await fetch("/online");
        if (!res.ok) {
            throw new Error("Couldn't fetch GET /online");
        }
        const { online } = await res.json();
        const totalOnline = base + noise + +online;
        $peopleOnline.innerHTML = totalOnline;
        
        // Update every 30 seconds if WebSocket is not connected
        if (ws.readyState !== WebSocket.OPEN) {
            setTimeout(getPeopleOnline, 30000);
        }
    } catch (error) {
        console.error("Error fetching online count:", error);
        setTimeout(getPeopleOnline, 5000); // Retry after 5 seconds if failed
    }
}

// Listen for real-time updates
ws.onmessage = (event) => {
    try {
        const { channel, data } = JSON.parse(event.data);
        if (channel === 'peopleOnline') {
            const $peopleOnline = $("#peopleOnline p span");
            const totalOnline = base + noise + +data;
            $peopleOnline.innerHTML = totalOnline;
        }
    } catch (error) {
        console.error("Error processing WebSocket message:", error);
    }
};

configureTags();
window.addEventListener("load", initTagsFromURL);
getPeopleOnline();
