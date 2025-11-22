import { initializeApp } from "firebase/app";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";

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
