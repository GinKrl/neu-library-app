import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { getFirestore, collection, doc, getDoc, setDoc, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

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
const provider = new GoogleAuthProvider();
const db = getFirestore(app);

const loginSection = document.getElementById('login-section');
const formSection = document.getElementById('form-section');
const successSection = document.getElementById('success-section');
const adminLink = document.getElementById('admin-link'); 
const adminLinkSuccess = document.getElementById('admin-link-success'); 
let errorMessage = document.getElementById('error-message');
let currentUser = null;

async function handleUserRouting(user) {
    if (errorMessage) errorMessage.classList.add('hidden');

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

    if (userRole === 'admin' && !isUserMode) {
        window.location.href = "admin.html";
        return;
    }

    currentUser = user;
    if(loginSection) loginSection.classList.add('hidden');
    if(formSection) formSection.classList.remove('hidden');
    
    if (userRole === 'admin') {
        if (adminLink) adminLink.classList.remove('hidden');
        if (adminLinkSuccess) adminLinkSuccess.classList.remove('hidden');
    }
}

onAuthStateChanged(auth, (user) => {
    const urlParams = new URLSearchParams(window.location.search);
    if (user && urlParams.get('mode') === 'user') {
        handleUserRouting(user);
    }
});

window.loginWithGoogle = async () => {
    try {
        const result = await signInWithPopup(auth, provider);
        await handleUserRouting(result.user);
    } catch (err) {
        console.error(err);
    }
};

const submitBtn = document.getElementById('submit-btn');
if(submitBtn) {
    submitBtn.addEventListener('click', async () => {
        if (!currentUser) return;
        
        // Check if they selected a User Type!
        const selectedType = document.getElementById('userType').value;
        if (!selectedType) {
            alert("Please select a User Type (Student, Teacher, or Staff).");
            return;
        }

        try {
            await addDoc(collection(db, "visits"), {
                userId: currentUser.uid,
                email: currentUser.email,
                userType: selectedType, // <--- Saves the new User Type here
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
}

const loginBtn = document.getElementById('login-btn');
if(loginBtn) loginBtn.addEventListener('click', loginWithGoogle);
