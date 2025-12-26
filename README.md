# 🌊 Shorebreak.AI v2 - Guide d'Installation Complet

## 📋 Ce dont tu as besoin AVANT de commencer

1. **Un ordinateur** (Mac ou Windows)
2. **Ton projet Supabase** déjà créé (tu l'as fait !)
3. **15-20 minutes** de ton temps

---

## 🔧 ÉTAPE 1 : Installer Node.js

Node.js est le "moteur" qui fait tourner l'application.

### Sur Mac :

1. Va sur **https://nodejs.org/**
2. Clique sur le gros bouton vert **"LTS"** (version recommandée)
3. Un fichier `.pkg` se télécharge
4. Double-clique dessus et suis les instructions (Next, Next, Install...)
5. C'est installé !

### Sur Windows :

1. Va sur **https://nodejs.org/**
2. Clique sur le gros bouton vert **"LTS"** (version recommandée)  
3. Un fichier `.msi` se télécharge
4. Double-clique dessus et suis les instructions
5. **IMPORTANT** : Coche la case "Automatically install necessary tools" si elle apparaît
6. C'est installé !

### Vérifier que ça marche :

1. **Sur Mac** : Ouvre l'application **Terminal** (cherche "Terminal" dans Spotlight avec Cmd+Espace)
2. **Sur Windows** : Ouvre **PowerShell** (cherche "PowerShell" dans le menu Démarrer)
3. Tape cette commande et appuie sur Entrée :
   ```
   node --version
   ```
4. Tu devrais voir quelque chose comme `v20.10.0` (le numéro peut être différent)
5. Si tu vois un numéro, c'est bon ! Sinon, redémarre ton ordinateur et réessaie.

---

## 📁 ÉTAPE 2 : Préparer le projet

### 2.1 - Télécharger et dézipper

1. Télécharge le fichier `shorebreak-ai-v2.zip` que je t'ai donné
2. Fais un clic droit dessus → **Extraire** (ou double-clic sur Mac)
3. Tu obtiens un dossier `shorebreak-ai-v2`
4. **Déplace ce dossier** dans un endroit simple, par exemple :
   - Sur Mac : `/Users/tonnom/shorebreak-ai-v2`
   - Sur Windows : `C:\Users\tonnom\shorebreak-ai-v2`

### 2.2 - Ouvrir le Terminal dans le bon dossier

#### Sur Mac :

1. Ouvre **Terminal**
2. Tape `cd ` (avec un espace après)
3. Fais glisser le dossier `shorebreak-ai-v2` dans la fenêtre Terminal
4. Appuie sur Entrée
5. Tu es maintenant "dans" le dossier du projet

#### Sur Windows :

1. Ouvre l'**Explorateur de fichiers**
2. Va dans le dossier `shorebreak-ai-v2`
3. Clique dans la barre d'adresse en haut
4. Tape `powershell` et appuie sur Entrée
5. Une fenêtre PowerShell s'ouvre, tu es dans le bon dossier

---

## ⚙️ ÉTAPE 3 : Configurer Supabase

### 3.1 - Exécuter le script SQL (créer les tables)

1. Va sur **https://supabase.com** et connecte-toi
2. Ouvre ton projet **shorebreak-ai-v2**
3. Dans le menu à gauche, clique sur **SQL Editor** (icône avec `<>`)
4. Clique sur **+ New query** (en haut à droite)
5. Sur ton ordinateur, ouvre le fichier :
   ```
   shorebreak-ai-v2/supabase/migrations/001_initial_schema.sql
   ```
   (avec TextEdit sur Mac ou Notepad sur Windows)
6. **Sélectionne TOUT le contenu** (Cmd+A sur Mac, Ctrl+A sur Windows)
7. **Copie** (Cmd+C ou Ctrl+C)
8. Retourne dans Supabase et **colle** dans l'éditeur SQL (Cmd+V ou Ctrl+V)
9. Clique sur le bouton vert **Run** (ou appuie sur Cmd+Enter / Ctrl+Enter)
10. Tu devrais voir "Success. No rows returned" en bas - c'est normal !

### 3.2 - Récupérer tes clés API

1. Dans Supabase, clique sur **Project Settings** (icône engrenage en bas à gauche)
2. Clique sur **API** dans le menu
3. Note ces deux valeurs (tu peux les copier) :
   - **Project URL** : `https://cpckjmwjhjvarwfaxlnm.supabase.co`
   - **anon public** (ou Publishable key) : la longue chaîne qui commence par `eyJ...` ou `sb_publishable_...`

### 3.3 - Configurer l'authentification

1. Dans Supabase, clique sur **Authentication** (icône utilisateur dans le menu)
2. Clique sur **URL Configuration** 
3. Remplis :
   - **Site URL** : `http://localhost:5173`
4. Dans **Redirect URLs**, clique sur **Add URL** et ajoute :
   - `http://localhost:5173/*`
5. Clique sur **Save**

---

## 🔐 ÉTAPE 4 : Configurer les variables d'environnement

C'est le fichier qui contient tes clés secrètes.

### 4.1 - Créer le fichier

1. Dans le dossier `shorebreak-ai-v2`, trouve le fichier `.env.example`
   - **Note** : Sur Mac, les fichiers commençant par `.` sont cachés. Dans le Finder, appuie sur `Cmd+Shift+.` pour les voir.
2. **Copie** ce fichier
3. **Renomme** la copie en `.env.local` (attention : le point au début est important !)

### 4.2 - Modifier le fichier

1. Ouvre `.env.local` avec un éditeur de texte (TextEdit, Notepad, ou VS Code si tu l'as)
2. Remplace le contenu par :

```
VITE_SUPABASE_URL=https://cpckjmwjhjvarwfaxlnm.supabase.co
VITE_SUPABASE_ANON_KEY=COLLE_TA_CLE_ICI
```

3. Remplace `COLLE_TA_CLE_ICI` par ta vraie clé anon/publishable (celle que tu as copiée à l'étape 3.2)
4. **Sauvegarde** le fichier

---

## 📦 ÉTAPE 5 : Installer les dépendances

Dans ton Terminal/PowerShell (qui est déjà dans le dossier du projet), tape :

```
npm install
```

Appuie sur Entrée et **attends**. Ça peut prendre 1-2 minutes.

Tu verras plein de texte défiler, c'est normal. À la fin, tu devrais voir quelque chose comme :
```
added 245 packages in 45s
```

⚠️ **Si tu vois des erreurs en rouge**, envoie-moi une capture d'écran.

---

## 🚀 ÉTAPE 6 : Lancer l'application !

Dans le même Terminal/PowerShell, tape :

```
npm run dev
```

Tu devrais voir :
```
  VITE v5.0.0  ready in 500 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

**C'est lancé !** 🎉

---

## 🌐 ÉTAPE 7 : Ouvrir l'application

1. Ouvre ton navigateur (Chrome, Safari, Firefox...)
2. Va sur : **http://localhost:5173**
3. Tu devrais voir la page de connexion de Shorebreak.AI !

### Créer ton premier compte :

1. Clique sur **"Create an account"**
2. Remplis le formulaire
3. Coche la case de consentement
4. Clique sur **"Get Started"**

### Te donner les droits Admin :

1. Va dans Supabase → **Table Editor** (menu de gauche)
2. Clique sur la table **users**
3. Tu verras ton compte avec `role: user`
4. Double-clique sur `user` et change en `admin`
5. Appuie sur Entrée pour sauvegarder
6. Retourne sur l'app et rafraîchis la page (F5)
7. Tu as maintenant accès au panel Admin !

---

## ⏹️ Pour arrêter l'application

Dans le Terminal/PowerShell où l'app tourne, appuie sur **Ctrl+C**.

## ▶️ Pour relancer l'application

1. Ouvre Terminal/PowerShell
2. Va dans le dossier du projet (comme à l'étape 2.2)
3. Tape `npm run dev`

---

## 🆘 Problèmes fréquents

### "command not found: npm" ou "'npm' n'est pas reconnu"
→ Node.js n'est pas installé correctement. Retourne à l'étape 1 et redémarre ton ordinateur après l'installation.

### "EACCES: permission denied"
→ Sur Mac, ajoute `sudo` devant la commande : `sudo npm install`

### La page reste blanche
→ Ouvre la console du navigateur (F12 → Console) et envoie-moi les erreurs en rouge.

### "Invalid API key" ou erreur Supabase
→ Vérifie que ton fichier `.env.local` contient les bonnes valeurs (pas d'espaces, pas de guillemets autour des valeurs).

### Les analyses ne fonctionnent pas
→ C'est normal pour l'instant, il faut que tes webhooks n8n soient actifs. Les analyses sont simulées si n8n ne répond pas.

---

## 📱 Pour plus tard : Mettre en ligne (Vercel)

Une fois que tout fonctionne en local, on pourra déployer sur Vercel pour avoir une vraie URL accessible de partout. Dis-moi quand tu seras prêt !

---

## 📞 Besoin d'aide ?

Si tu bloques à une étape, fais une **capture d'écran** de :
1. Ce que tu vois dans le Terminal/PowerShell
2. Ce que tu vois dans le navigateur

Et envoie-les moi, je t'aiderai !
