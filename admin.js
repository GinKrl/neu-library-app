import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { getFirestore, collection, getDocs, query, orderBy, doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBkManpN_uZ9e0DISxh1WP33CTjM0GLCD4",
  authDomain: "neu-library-app-7d93d.firebaseapp.com",
  projectId: "neu-library-app-7d93d",
  storageBucket: "neu-library-app-7d93d.firebasestorage.app",
  messagingSenderId: "516402250312",
  appId: "1:516402250312:web:72bda33a5fad4ecfc38e7d",
  measurementId: "G-LLBHKXZEW5"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const tableBody = document.getElementById('visits-table-body');
const searchInput = document.getElementById('search-input');
const dateFilter = document.getElementById('date-filter');
const totalVisitsEl = document.getElementById('total-visits-count');
const topCollegeEl = document.getElementById('top-college-name');
const topPurposeEl = document.getElementById('top-purpose-name');

let allVisits = [];

onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = "index.html"; 
    } else {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if(userDoc.exists() && userDoc.data().role === 'admin') {
            loadVisits(); 
        } else {
            window.location.href = "index.html";
        }
    }
});

async function loadVisits() {
    try {
        const q = query(collection(db, "visits"), orderBy("timestamp", "desc"));
        const querySnapshot = await getDocs(q);
        allVisits = [];
        querySnapshot.forEach((doc) => { 
            const data = doc.data();
            // Ensure data exists before pushing
            if (data.email) {
                allVisits.push({ id: doc.id, ...data }); 
            }
        });
        renderDashboard();
    } catch (error) {
        console.error("Firebase Error:", error);
        tableBody.innerHTML = `<tr><td colspan="5" class="text-center text-red-500 py-4">Error loading data.</td></tr>`;
    }
}

function renderDashboard() {
    const searchTerm = (searchInput.value || "").toLowerCase();
    const filterDate = dateFilter.value;
    const now = new Date();

    // 1. Filter Logic
    let filteredVisits = allVisits.filter(visit => {
        const email = (visit.email || "").toLowerCase();
        const matchesSearch = email.includes(searchTerm);
        let matchesDate = true;
        
        if (visit.timestamp && filterDate !== 'all') {
            const visitDate = visit.timestamp.toDate();
            if (filterDate === 'today') {
                matchesDate = visitDate.toDateString() === now.toDateString();
            } else if (filterDate === 'week') {
                const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                matchesDate = visitDate >= weekAgo;
            } else if (filterDate === 'month') {
                matchesDate = visitDate.getMonth() === now.getMonth() && visitDate.getFullYear() === now.getFullYear();
            }
        }
        return matchesSearch && matchesDate;
    });

    // 2. Update Total Visits
    totalVisitsEl.innerText = filteredVisits.length;

    // 3. Tally logic for Top College and Top Purpose
    const collegeCounts = {};
    const purposeCounts = {};

    filteredVisits.forEach(visit => {
        // Clean up string data to avoid "Study" vs "study" issues
        const col = (visit.college || "Unknown").trim();
        const purp = (visit.purposeOfVisit || "Unknown").trim();

        if (col !== "Unknown") collegeCounts[col] = (collegeCounts[col] || 0) + 1;
        if (purp !== "Unknown") purposeCounts[purp] = (purposeCounts[purp] || 0) + 1;
    });

    const findWinner = (obj) => {
        const keys = Object.keys(obj);
        if (keys.length === 0) return "-";
        // Sort keys by their count values and take the highest
        return keys.reduce((a, b) => obj[a] > obj[b] ? a : b);
    };

    // Update Cards
    topCollegeEl.innerText = findWinner(collegeCounts);
    topPurposeEl.innerText = findWinner(purposeCounts);

    // 4. Render Table Rows
    tableBody.innerHTML = '';
    if (filteredVisits.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="5" class="text-center py-4">No matching records.</td></tr>`;
        return;
    }

    filteredVisits.forEach((visit) => {
        const dateStr = visit.timestamp ? visit.timestamp.toDate().toLocaleString() : 'N/A';
        const tr = document.createElement('tr');
        tr.className = "border-b hover:bg-gray-50 transition";
        tr.innerHTML = `
            <td class="px-4 py-3">${dateStr}</td>
            <td class="px-4 py-3 font-medium text-blue-600">${visit.email}</td>
            <td class="px-4 py-3">${visit.college || 'N/A'}</td>
            <td class="px-4 py-3">${visit.purposeOfVisit || 'N/A'}</td>
            <td class="px-4 py-3">
                <button onclick="toggleBlockStatus('${visit.userId}')" class="bg-red-100 text-red-600 px-3 py-1 rounded text-sm hover:bg-red-200 font-bold">Block</button>
            </td>
        `;
        tableBody.appendChild(tr);
    });
}

// Event Listeners
searchInput.addEventListener('input', renderDashboard);
dateFilter.addEventListener('change', renderDashboard);

document.getElementById('logout-btn').addEventListener('click', () => {
    signOut(auth).then(() => { window.location.href = "index.html"; });
});

window.toggleBlockStatus = async (userId) => {
    if(!userId || userId === 'undefined') {
        alert("Error: User ID is missing for this record.");
        return;
    }
    if(!confirm("Toggle block status for this user?")) return;
    try {
        const userRef = doc(db, "users", userId);
        const userSnap = await getDoc(userRef);
        if(userSnap.exists()) {
            const current = userSnap.data().isBlocked || false;
            await updateDoc(userRef, { isBlocked: !current });
            alert("Account status updated!");
        } else {
            alert("User profile not found in database.");
        }
    } catch(e) { alert(e.message); }
};
