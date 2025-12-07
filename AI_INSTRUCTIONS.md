# PROJECT GUIDELINES (STRICT)

## 1. TECH STACK
- **Frontend:** React + Vite
- **Backend/Database:** Firebase (Firestore, Auth, Functions)
- **Deployment:** GitHub Actions -> Firebase Hosting

## 2. DEPLOYMENT RULES
- **DO NOT** suggest or configure Netlify, Vercel, or "Bolt Hosting".
- **DO NOT** modify the `.github/workflows` folder.
- **DO NOT** modify `firebase.json` unless explicitly instructed to change build paths.
- We have a working CI/CD pipeline. Deployment is automated via Git Push.

## 3. DATABASE
- **DO NOT** install Supabase or other SQL clients.
- Use ONLY Firebase SDK for data handling.