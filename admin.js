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

// AUTH PROTECTION
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
        querySnapshot.forEach((doc) => { allVisits.push({ id: doc.id, ...doc.data() }); });
        renderDashboard();
    } catch (error) {
        tableBody.innerHTML = `<tr><td colspan="5" class="text-center text-red-500 py-4">Error loading data.</td></tr>`;
    }
}

function renderDashboard() {
    const searchTerm = searchInput.value.toLowerCase();
    const filterDate = dateFilter.value;
    const now = new Date();

    let filteredVisits = allVisits.filter(visit => {
        const matchesSearch = visit.email.toLowerCase().includes(searchTerm);
        let matchesDate = true;
        if (visit.timestamp && filterDate !== 'all') {
            const visitDate = visit.timestamp.toDate();
            if (filterDate === 'today') matchesDate = visitDate.toDateString() === now.toDateString();
            else if (filterDate === 'week') matchesDate = visitDate >= new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            else if (filterDate === 'month') matchesDate = visitDate.getMonth() === now.getMonth();
        }
        return matchesSearch && matchesDate;
    });

    totalVisitsEl.innerText = filteredVisits.length;
    const getTop = (obj) => Object.keys(obj).length === 0 ? "-" : Object.keys(obj).reduce((a, b) => obj[a] > obj[b] ? a : b);
    
    tableBody.innerHTML = '';
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
                <button onclick="toggleBlockStatus('${visit.userId}')" class="bg-red-100 text-red-600 px-3 py-1 rounded text-sm hover:bg-red-200 font-bold">Block</button>
            </td>
        `;
        tableBody.appendChild(tr);
    });
}

searchInput.addEventListener('input', renderDashboard);
dateFilter.addEventListener('change', renderDashboard);

document.getElementById('logout-btn').addEventListener('click', () => {
    signOut(auth).then(() => { window.location.href = "index.html"; });
});

window.toggleBlockStatus = async (userId) => {
    if(!confirm("Toggle block status?")) return;
    try {
        const userRef = doc(db, "users", userId);
        const userSnap = await getDoc(userRef);
        if(userSnap.exists()) {
            await updateDoc(userRef, { isBlocked: !userSnap.data().isBlocked });
            alert("Status Updated!");
        }
    } catch(e) { alert(e.message); }
};
