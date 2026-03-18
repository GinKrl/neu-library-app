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
const totalVisitsEl = document.getElementById('total-visits-count');
const topCollegeEl = document.getElementById('top-college-name');
const topPurposeEl = document.getElementById('top-purpose-name');

let allVisits = [];
let userStatusCache = {}; 

onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = "index.html"; 
    } else {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if(userDoc.exists() && userDoc.data().role === 'admin') {
            loadData(); 
        } else {
            window.location.href = "index.html";
        }
    }
});

async function loadData() {
    try {
        const userSnap = await getDocs(collection(db, "users"));
        userSnap.forEach(doc => {
            userStatusCache[doc.id] = doc.data().isBlocked || false;
        });

        const q = query(collection(db, "visits"), orderBy("timestamp", "desc"));
        const querySnapshot = await getDocs(q);
        allVisits = [];
        querySnapshot.forEach((doc) => {
            allVisits.push({ id: doc.id, ...doc.data() });
        });
        renderDashboard();
    } catch (error) {
        console.error("Fetch Error:", error);
    }
}

function renderDashboard() {
    const searchInput = document.getElementById('search-input');
    const dateFilter = document.getElementById('date-filter');
    if(!searchInput || !dateFilter) return; // Prevent crashes if elements are missing

    const searchTerm = searchInput.value.toLowerCase();
    const filterDate = dateFilter.value;
    const now = new Date();

    let filtered = allVisits.filter(v => {
        const email = (v.email || "").toLowerCase();
        const matchesSearch = email.includes(searchTerm);
        let matchesDate = true;
        if (v.timestamp && filterDate !== 'all') {
            const vDate = v.timestamp.toDate();
            if (filterDate === 'today') matchesDate = vDate.toDateString() === now.toDateString();
            else if (filterDate === 'week') matchesDate = vDate >= new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            else if (filterDate === 'month') matchesDate = vDate.getMonth() === now.getMonth();
        }
        return matchesSearch && matchesDate;
    });

    totalVisitsEl.innerText = filtered.length;

    const collegeMap = {};
    const purposeMap = {};

    filtered.forEach(v => {
        const pValue = v.purposeOfVisit || v.purpose || v.Purpose || "Unknown";
        const cValue = v.college || v.College || v.department || "Unknown";
        if (cValue !== "Unknown") collegeMap[cValue] = (collegeMap[cValue] || 0) + 1;
        if (pValue !== "Unknown") purposeMap[pValue] = (purposeMap[pValue] || 0) + 1;
    });

    const getTop = (map) => {
        const keys = Object.keys(map);
        return keys.length > 0 ? keys.reduce((a, b) => map[a] > map[b] ? a : b) : "-";
    };

    topCollegeEl.innerText = getTop(collegeMap);
    topPurposeEl.innerText = getTop(purposeMap);

    tableBody.innerHTML = '';
    filtered.forEach(v => {
        const isBlocked = userStatusCache[v.userId] || false;
        const time = v.timestamp ? v.timestamp.toDate().toLocaleString() : 'N/A';
        
        const tr = document.createElement('tr');
        tr.className = `border-b transition ${isBlocked ? 'bg-red-50' : 'hover:bg-gray-50'}`;
        tr.innerHTML = `
            <td class="px-4 py-3">${time}</td>
            <td class="px-4 py-3 text-blue-600 font-medium">${v.email}</td>
            <td class="px-4 py-3">${v.college || 'N/A'}</td>
            <td class="px-4 py-3">${v.purposeOfVisit || v.purpose || 'N/A'}</td>
            <td class="px-4 py-3">
                <button onclick="toggleBlock('${v.userId}', ${isBlocked})" 
                    class="px-3 py-1 rounded text-sm font-bold transition ${isBlocked ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-red-100 text-red-600 hover:bg-red-200'}">
                    ${isBlocked ? 'Unblock' : 'Block'}
                </button>
            </td>
        `;
        tableBody.appendChild(tr);
    });
}

window.toggleBlock = async (uid, currentStatus) => {
    if(!uid) return;

    const action = currentStatus ? "unblock" : "block";
    
    // Trigger the centered SweetAlert pop-up
    const result = await Swal.fire({
        title: `Are you sure?`,
        text: `Do you want to ${action} this user?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: currentStatus ? '#d33' : '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: `Yes, ${action} them!`
    });

    if (result.isConfirmed) {
        try {
            await updateDoc(doc(db, "users", uid), { isBlocked: !currentStatus });
            
            userStatusCache[uid] = !currentStatus;
            renderDashboard();

            Swal.fire({
                title: 'Updated!',
                text: `User has been ${action}ed successfully.`,
                icon: 'success',
                timer: 1500,
                showConfirmButton: false
            });
        } catch (e) {
            Swal.fire('Error', e.message, 'error');
        }
    }
};

const searchInput = document.getElementById('search-input');
const dateFilter = document.getElementById('date-filter');
const logoutBtn = document.getElementById('logout-btn');

if(searchInput) searchInput.addEventListener('input', renderDashboard);
if(dateFilter) dateFilter.addEventListener('change', renderDashboard);
if(logoutBtn) logoutBtn.addEventListener('click', () => signOut(auth));
