// Firebase web-app settings are public identifiers, not secrets.
// Replace these values with the config shown for the Firebase web app in Firebase Console.
export const firebaseConfig = {
  apiKey: "AIzaSyAUzR5HN0xIuxj9UZWWIE6zLhQOv-_6Av0",
  authDomain: "classroom-digital-brain.firebaseapp.com",
  projectId: "classroom-digital-brain",
  appId: "1:547507105226:web:451ac5779bf219f172b333",
};

export const firebaseConfigured =
  Boolean(firebaseConfig.apiKey && firebaseConfig.appId);
