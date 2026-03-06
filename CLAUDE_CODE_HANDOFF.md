# CLAUDE CODE HANDOFF: Stacy Bomar Construction Tracker

## What Is This Project

A residential construction inspection tracker app for Stacy Bomar Construction in Broward County, FL. Built in React (single JSX file), dark mode, with projects, inspections, punch list, and dashboard.

## Current Status

The app works perfectly in Claude.ai artifacts. We're now deploying it as a live website using:
- **Firebase Firestore** for shared database
- **Vercel** for hosting  
- **GitHub** for code storage

## What's Already Done

1. ✅ Node.js installed (v24.14.0)
2. ✅ Git installed
3. ✅ React project created at `C:\Users\sheld\sbc-inspections`
4. ✅ Firebase npm package installed
5. ✅ `src/App.js` has the tracker code (42,368 bytes)
6. ✅ `src/firebase.js` created with config
7. ✅ Firebase project "stacy-bomar-tracker" created with Firestore database in test mode
8. ❌ App crashes after login because `window.storage` (Claude artifact API) doesn't exist in regular browsers

## What Needs To Be Done

### PRIORITY 1: Fix window.storage → localStorage

The app uses `window.storage.get()`, `window.storage.set()`, `window.storage.delete()` which is Claude's artifact storage API. These need to be replaced with `localStorage` equivalents for browser deployment.

**Find and replace ALL instances:**

| Find | Replace With |
|------|-------------|
| `await window.storage.get(k);return r?JSON.parse(r.value):f;` | `localStorage.getItem(k);return r?JSON.parse(r):f;` |
| `await window.storage.set(k,JSON.stringify(v))` | `localStorage.setItem(k,JSON.stringify(v))` |
| `await window.storage.get("sbc-auth")` | `localStorage.getItem("sbc-auth")` |
| `r&&r.value===APP_PW` | `r===APP_PW` |
| `window.storage.set("sbc-auth",pwInput).catch(()=>{})` | `localStorage.setItem("sbc-auth",pwInput)` |
| `window.storage.delete(` | `localStorage.removeItem(` |

Also remove any `.catch(()=>{})` that was chained on the old `window.storage` calls since `localStorage` is synchronous and doesn't return promises.

Make sure the `ld` and `sv` functions work synchronously:
```javascript
const ld=async(k,f)=>{try{const r=localStorage.getItem(k);return r?JSON.parse(r):f;}catch{return f;}};
const sv=async(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v));}catch{}};
```

### PRIORITY 2: Remove import './App.css'

If `src/App.js` has `import './App.css';` at the top, delete that line. The app uses inline styles only.

### PRIORITY 3: Test locally

Run `npm start` and verify:
1. Password screen appears (password is: Papasauce@811)
2. After login, dashboard loads with dark mode
3. Projects tab shows 32 pre-loaded jobs alphabetically
4. Can schedule inspections
5. Data persists after page refresh

### PRIORITY 4: Push to GitHub

```bash
cd C:\Users\sheld\sbc-inspections
git init
git add .
git commit -m "initial deploy"
git branch -M main
git remote add origin https://github.com/USERNAME/sbc-inspections.git
git push -u origin main
```

(User needs to create the GitHub repo first and replace USERNAME)

### PRIORITY 5: Deploy on Vercel

1. Go to vercel.com, sign in with GitHub
2. Import sbc-inspections repo
3. Deploy

### PRIORITY 6: Update Firebase security rules

Replace Firestore rules with:
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

## Firebase Config (already in src/firebase.js)

```
apiKey: "AIzaSyDFnNEBCo-B1k0RiB4Dg0Y1Ei_ZMiXb6-Q"
authDomain: "stacy-bomar-tracker.firebaseapp.com"
projectId: "stacy-bomar-tracker"
storageBucket: "stacy-bomar-tracker.firebasestorage.app"
messagingSenderId: "937797571947"
appId: "1:937797571947:web:db3cc79651e62bbb46282e"
```

## App Features

- **Password protection:** Papasauce@811
- **Dashboard:** Job Scope Matrix (spreadsheet-style table), stat cards, jobs by city/permit status/phase
- **Inspection Sheet:** Weekly view with daily breakdown, searchable inspection types with prefix format (S- Structural, P- Plumbing, E- Electrical, M- Mechanical, R- Roofing, W- Windows), custom type support
- **Projects:** 32 pre-loaded jobs with addresses, disciplines, HOA flags, permit status, scope notes, comments/notes, file links (Google Drive URLs)
- **Punch List:** Priority-based (Critical/Major/Minor) with trade assignment
- **Dark mode:** BG #0F1419, Cards #1A2332, Blue #3B8BF5, Green #4ADE80, Red #F87171

## File Structure

```
C:\Users\sheld\sbc-inspections\
├── src\
│   ├── App.js          ← The tracker (42KB, was stacy-bomar-tracker.jsx)
│   ├── firebase.js     ← Firebase config
│   └── index.js        ← Default React entry point (don't touch)
├── public\
│   └── index.html      ← Default (don't touch)
├── package.json
└── node_modules\
```

## Future Plans

- Eventually swap localStorage for Firebase Firestore for real-time team sync
- Separate financial analytics tool being built in another Claude chat
- May add real file upload via Firebase Storage later
- Custom domain possible via Vercel
