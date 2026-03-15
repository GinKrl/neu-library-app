// 1. Import Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { getFirestore, collection, getDocs, query, orderBy, doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

// 2. Firebase Configuration
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

// 3. UI Elements
const tableBody = document.getElementById('visits-table-body');
const searchInput = document.getElementById('search-input');
const dateFilter = document.getElementById('date-filter');
const totalVisitsEl = document.getElementById('total-visits-count');
const topCollegeEl = document.getElementById('top-college-name');
const topPurposeEl = document.getElementById('top-purpose-name');

let allVisits = []; // Stores all data so we can filter it instantly

// 4. Security Check
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = "index.html"; 
    } else {
        // Extra check: Ensure they are actually an Admin!
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if(userDoc.exists() && userDoc.data().role === 'admin') {
            loadVisits(); 
        } else {
            alert("Unauthorized. Admins only.");
            window.location.href = "index.html";
        }
    }
});

// 5. Load Data from Firestore
async function loadVisits() {
    try {
        const q = query(collection(db, "visits"), orderBy("timestamp", "desc"));
        const querySnapshot = await getDocs(q);
        
        allVisits = [];
        querySnapshot.forEach((doc) => {
            allVisits.push({ id: doc.id, ...doc.data() });
        });
        
        renderDashboard(); // Draw the UI!
    } catch (error) {
        console.error(error);
        tableBody.innerHTML = `<tr><td colspan="5" class="text-center text-red-500 py-4">Error loading data.</td></tr>`;
    }
}

// 6. Draw the Dashboard (Stats, Filters, Table)
function renderDashboard() {
    const searchTerm = searchInput.value.toLowerCase();
    const filterDate = dateFilter.value;
    const now = new Date();

    // A. Filter Data based on Search and Dropdown
    let filteredVisits = allVisits.filter(visit => {
        const matchesSearch = visit.email.toLowerCase().includes(searchTerm);
        let matchesDate = true;
        
        if (visit.timestamp && filterDate !== 'all') {
            const visitDate = visit.timestamp.toDate();
            if (filterDate === 'today') {
                matchesDate = visitDate.toDateString() === now.toDateString();
            } else if (filterDate === 'week') {
                const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                matchesDate = visitDate >= oneWeekAgo;
            } else if (filterDate === 'month') {
                matchesDate = visitDate.getMonth() === now.getMonth() && visitDate.getFullYear() === now.getFullYear();
            }
        }
        return matchesSearch && matchesDate;
    });

    // B. Calculate Statistics
    totalVisitsEl.innerText = filteredVisits.length;

    const collegesCount = {};
    const purposeCount = {};

    filteredVisits.forEach(v => {
        collegesCount[v.college] = (collegesCount[v.college] || 0) + 1;
        purposeCount[v.purposeOfVisit] = (purposeCount[v.purposeOfVisit] || 0) + 1;
    });

    // Helper to find the highest number in our counts
    const getTop = (obj) => Object.keys(obj).length === 0 ? "-" : Object.keys(obj).reduce((a, b) => obj[a] > obj[b] ? a : b);
    
    topCollegeEl.innerText = getTop(collegesCount);
    topPurposeEl.innerText = getTop(purposeCount);

    // C. Render the HTML Table
    tableBody.innerHTML = '';
    if (filteredVisits.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="5" class="text-center py-4">No visits found.</td></tr>`;
        return;
    }

    filteredVisits.forEach((visit) => {
        const dateStr = visit.timestamp ? visit.timestamp.toDate().toLocaleString() : 'Just now';
        const tr = document.createElement('tr');
        tr.className = "border-b hover:bg-gray-50 transition";
        tr.innerHTML = `
            <td class="px-4 py-3">${dateStr}</td>
            <td class="px-4 py-3 font-medium text-blue-600">${visit.email}</td>
            <td class="px-4 py-3">${visit.college}</td>
            <td class="px-4 py-3">${visit.purposeOfVisit}</td>
            <td class="px-4 py-3">
                <button onclick="toggleBlockStatus('${visit.userId}')" class="bg-red-100 text-red-600 px-3 py-1 rounded text-sm hover:bg-red-200 transition font-bold">Toggle Block</button>
            </td>
        `;
        tableBody.appendChild(tr);
    });
}

// 7. Event Listeners for Filters (Updates instantly!)
searchInput.addEventListener('input', renderDashboard);
dateFilter.addEventListener('change', renderDashboard);

// 8. Logout
document.getElementById('logout-btn').addEventListener('click', () => {
    signOut(auth).then(() => {
        window.location.href = "index.html";
    });
});

// 9. Block User Function
window.toggleBlockStatus = async (userId) => {
    if(!confirm("Are you sure you want to block/unblock this user?")) return;
    try {
        const userRef = doc(db, "users", userId);
        const userSnap = await getDoc(userRef);
        
        if(userSnap.exists()) {
            const currentStatus = userSnap.data().isBlocked;
            await updateDoc(userRef, { isBlocked: !currentStatus });
            alert(`Success! User is now ${!currentStatus ? 'BLOCKED' : 'UNBLOCKED'}.`);
        } else {
            alert("Error: User profile not found.");
        }
    } catch(e) {
        console.error(e);
        alert("Error updating status: " + e.message);
    }
}; 