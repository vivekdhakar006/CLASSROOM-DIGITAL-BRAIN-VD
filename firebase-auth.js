/*
 * Firebase Authentication boundary for Classroom Digital Brain.
 * Firebase verifies Google credentials and manages the signed-in user session.
 * Client-side sign-in gates the local dashboard; privileged server data would
 * still need its own server-side authorization before it is added.
 */
import { initializeApp } from "https://www.gstatic.com/firebasejs/13.4.0/firebase-app.js";
import {
  browserLocalPersistence,
  getAuth,
  GoogleAuthProvider,
  getRedirectResult,
  onAuthStateChanged,
  setPersistence,
  signInWithPopup,
  signInWithRedirect,
  signOut,
} from "https://www.gstatic.com/firebasejs/13.4.0/firebase-auth.js";
import { firebaseConfig, firebaseConfigured } from "./firebase-config.js";

const signInButton = document.getElementById("google-sign-in");
const signOutButton = document.getElementById("google-sign-out");
const authNote = document.getElementById("auth-note");

function publishAuthState(user) {
  document.dispatchEvent(new CustomEvent("classroom-auth-state", { detail: { user } }));
}

if (!firebaseConfigured) {
  signInButton.disabled = true;
  signInButton.innerHTML = '<span>Google sign-in setup pending</span>';
  authNote.textContent = "Google sign-in is not configured yet. No guest or developer access is enabled.";
  publishAuthState(null);
} else {
  try {
    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });

    await setPersistence(auth, browserLocalPersistence);
    const redirectResult = await getRedirectResult(auth);
    if (redirectResult?.user) {
      publishAuthState(redirectResult.user);
      document.dispatchEvent(new Event("classroom-auth-success"));
    }
    onAuthStateChanged(auth, publishAuthState, (error) => {
      console.error("Firebase auth state error:", error);
      authNote.textContent = "Could not confirm the Google account session. Please sign in again.";
      publishAuthState(null);
    });

    signInButton.addEventListener("click", async () => {
      signInButton.disabled = true;
      authNote.textContent = "Connecting securely to Google…";
      try {
        const result = await signInWithPopup(auth, provider);
        publishAuthState(result.user);
        document.dispatchEvent(new Event("classroom-auth-success"));
      } catch (error) {
        if (error.code === "auth/popup-blocked") {
          await signInWithRedirect(auth, provider);
          return;
        }
        console.error("Firebase Google sign-in failed:", error);
        authNote.textContent = error.code === "auth/unauthorized-domain"
          ? "This website domain is not authorized in Firebase Authentication yet."
          : "Google sign-in did not complete. Please try again.";
      } finally {
        signInButton.disabled = false;
      }
    });

    signOutButton.addEventListener("click", async () => {
      signOutButton.disabled = true;
      try {
        await signOut(auth);
      } catch (error) {
        console.error("Firebase sign-out failed:", error);
        authNote.textContent = "Sign-out could not complete. Please try again.";
      } finally {
        signOutButton.disabled = false;
      }
    });
  } catch (error) {
    console.error("Firebase Authentication could not start:", error);
    signInButton.disabled = true;
    authNote.textContent = "Google sign-in setup could not start. Please refresh after Firebase is configured.";
    publishAuthState(null);
  }
}
