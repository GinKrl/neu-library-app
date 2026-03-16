// 1. Import Firebase from Web (CDN)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { getFirestore, collection, doc, getDoc, setDoc, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

// 2. Your Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyBkManpN_uZ9e0DISxh1WP33CTjM0GLCD4",
  authDomain: "neu-library-app-7d93d.firebaseapp.com",
  projectId: "neu-library-app-7d93d",
  storageBucket: "neu-library-app-7d93d.firebasestorage.app",
  messagingSenderId: "516402250312",
  appId: "1:516402250312:web:72bda33a5fad4ecfc38e7d",
  measurementId: "G-LLBHKXZEW5"
};

// 3. Initialize Firebase services
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
const db = getFirestore(app);

// 4. Get UI Elements
const loginSection = document.getElementById('login-section');
const formSection = document.getElementById('form-section');
const successSection = document.getElementById('success-section');
const adminLink = document.getElementById('admin-link'); 
let errorMessage = document.getElementById('error-message');
let currentUser = null;

// 5. THE CORE ROUTING LOGIC
async function handleUserRouting(user) {
    if (errorMessage) errorMessage.classList.add('hidden');

    // STRICT DOMAIN CHECK (Red Error Sign logic)
    if (!user.email.endsWith("@neu.edu.ph")) {
        if (!errorMessage) {
            errorMessage = document.createElement('div');
            errorMessage.id = 'error-message';
            errorMessage.className = 'mt-4 p-3 bg-red-100 border border-red-400 text-red-700 text-sm rounded';
            loginSection.appendChild(errorMessage);
        }
        errorMessage.innerText = "Access Denied! Please use your @neu.edu.ph institutional email.";
        errorMessage.classList.remove('hidden');
        await auth.signOut();
        return;
    }

    const urlParams = new URLSearchParams(window.location.search);
    const isUserMode = urlParams.get('mode') === 'user';

    // Database Check
    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);
    let userRole = 'user';

    if (userSnap.exists()) {
        const userData = userSnap.data();
        userRole = userData.role;
        if (userData.isBlocked) {
            alert("This account has been blocked by an Admin.");
            await auth.signOut();
            return;
        }
    } else {
        const adminEmails = ["jcesperanza@neu.edu.ph", "giankarl.minglana@neu.edu.ph"];
        userRole = adminEmails.includes(user.email) ? 'admin' : 'user';
        await setDoc(userRef, { uid: user.uid, email: user.email, displayName: user.displayName, role: userRole, isBlocked: false, createdAt: serverTimestamp() });
    }

    // REDIRECT TO ADMIN ONLY IF: Not in Switch Mode
    if (userRole === 'admin' && !isUserMode) {
        window.location.href = "admin.html";
        return;
    }

    // SHOW VISITOR FORM
    currentUser = user;
    loginSection.classList.add('hidden');
    formSection.classList.remove('hidden');
    if (userRole === 'admin' && adminLink) adminLink.classList.remove('hidden');
}

// 6. THE AUTO-SKIPPER: Runs when page opens
onAuthStateChanged(auth, (user) => {
    const urlParams = new URLSearchParams(window.location.search);
    // If logged in and URL says mode=user, skip the login UI and show the form
    if (user && urlParams.get('mode') === 'user') {
        handleUserRouting(user);
    }
});

// 7. Manual Login Function
window.loginWithGoogle = async () => {
    try {
        const result = await signInWithPopup(auth, provider);
        await handleUserRouting(result.user);
    } catch (err) {
        console.error(err);
    }
};

// 8. Submit Check-in
document.getElementById('submit-btn').addEventListener('click', async () => {
    if (!currentUser) return;
    try {
        await addDoc(collection(db, "visits"), {
            userId: currentUser.uid,
            email: currentUser.email,
            purposeOfVisit: document.getElementById('purpose').value,
            college: document.getElementById('college').value,
            timestamp: serverTimestamp()
        });
        formSection.classList.add('hidden');
        successSection.classList.remove('hidden');
    } catch (e) {
        alert("Error: " + e.message);
    }
});

document.getElementById('login-btn').addEventListener('click', loginWithGoogle);
