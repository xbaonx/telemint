import { initializeApp } from "firebase/app";
import { getStorage, ref, uploadBytes } from "firebase/storage";
import { getAnalytics, logEvent } from "firebase/analytics";
import { getFirestore, doc, setDoc, serverTimestamp } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDEpYVturfJb_5W-WeERRr8uIzv-oIcnjA",
  authDomain: "telemint-storage.firebaseapp.com",
  projectId: "telemint-storage",
  storageBucket: "telemint-storage.firebasestorage.app",
  messagingSenderId: "375370707608",
  appId: "1:375370707608:web:67631c7c4680a8602296ed",
  measurementId: "G-KBZTSEW89F"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const storage = getStorage(app);
export const analytics = getAnalytics(app);
export const db = getFirestore(app);
export { logEvent };

/**
 * Save or Update Telegram User to Firestore
 */
export async function saveUserToFirestore(user: any, walletAddress?: string) {
    if (!user || !user.id) return;

    try {
        const userRef = doc(db, "users", user.id.toString());
        const userData: any = {
            id: user.id,
            first_name: user.first_name || "",
            last_name: user.last_name || "",
            username: user.username || "",
            language_code: user.language_code || "en",
            is_premium: user.is_premium || false,
            last_seen: serverTimestamp(), // Auto server time
            app_opened_count: 1 // We will increment this ideally, but set/merge works for now
        };

        if (walletAddress) {
            userData.wallet_address = walletAddress;
        }

        // Merge: true allows updating existing docs without overwriting missing fields
        await setDoc(userRef, userData, { merge: true });
        console.log("💾 User saved to Firestore:", user.id);
    } catch (error) {
        console.error("❌ Error saving user to Firestore:", error);
    }
}

/**
 * Upload a file (image) to Firebase Storage
 */
export async function uploadFileToFirebase(file: File): Promise<string> {
    // Create a unique filename: timestamp_filename
    const filename = `${Date.now()}_${file.name}`;
    const storageRef = ref(storage, `images/${filename}`);
    
    const snapshot = await uploadBytes(storageRef, file);
    
    // Construct "clean" public URL (no token)
    // Format: https://firebasestorage.googleapis.com/v0/b/[BUCKET]/o/[PATH]?alt=media
    const bucket = snapshot.metadata.bucket;
    const path = encodeURIComponent(snapshot.metadata.fullPath);
    return `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${path}?alt=media`;
}

/**
 * Upload JSON Metadata to Firebase Storage
 */
export async function uploadMetadataToFirebase(metadata: any): Promise<string> {
    const filename = `${Date.now()}_metadata.json`;
    const storageRef = ref(storage, `metadata/${filename}`);
    
    const jsonString = JSON.stringify(metadata);
    const blob = new Blob([jsonString], { type: "application/json" });
    
    const snapshot = await uploadBytes(storageRef, blob);
    
    // Construct "clean" public URL (no token)
    const bucket = snapshot.metadata.bucket;
    const path = encodeURIComponent(snapshot.metadata.fullPath);
    return `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${path}?alt=media`;
}
