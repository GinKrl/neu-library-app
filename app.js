// 1. Import Firebase from Web (CDN)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
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
let currentUser = null;

// 5. Login Function with Profile Creation & Block Check
window.loginWithGoogle = async () => {
    try {
        const result = await signInWithPopup(auth, provider);
        const user = result.user;

        // Requirement: Domain Check
        if (!user.email.endsWith("@neu.edu.ph")) {
            alert("Non-institutional emails are rejected.");
            await auth.signOut();
            return;
        }

        // Requirement: Check Firestore users collection
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
            const userData = userSnap.data();
            
            // Requirement: Check if user is blocked
            if (userData.isBlocked) {
                alert("Access Denied! Your account has been blocked by an Admin.");
                await auth.signOut();
                return;
            }

            // Route Admin directly to Dashboard
            if (userData.role === 'admin') {
                window.location.href = "admin.html";
                return;
            }
        } else {
            // First time login: Create the user profile in Firestore
            await setDoc(userRef, {
                uid: user.uid,
                email: user.email,
                displayName: user.displayName,
                role: 'user', // Default role is normal user
                isBlocked: false,
                createdAt: serverTimestamp()
            });
        }

        // If normal user and not blocked, show the Check-in Form
        currentUser = user;
        loginSection.classList.add('hidden');
        formSection.classList.remove('hidden');

    } catch (err) {
        console.error(err);
        alert("Login error: " + err.message);
    }
};

// 6. Submit Check-in
document.getElementById('submit-btn').addEventListener('click', async () => {
    const purpose = document.getElementById('purpose').value;
    const college = document.getElementById('college').value;

    try {
        await addDoc(collection(db, "visits"), {
            userId: currentUser.uid,
            email: currentUser.email,
            purposeOfVisit: purpose,
            college: college,
            timestamp: serverTimestamp()
        });

        formSection.classList.add('hidden');
        successSection.classList.remove('hidden');
    } catch (e) {
        alert("Error during check-in: " + e.message);
    }
});

// 7. Attach events
document.getElementById('login-btn').addEventListener('click', loginWithGoogle);