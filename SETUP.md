# Classroom Tracker — Setup Guide

## What You Need (all free)
- A **Supabase** account (free) — the database
- A **Vercel** account (free) — the website hosting
- A **GitHub** account (free) — to connect Vercel and Supabase

---

## Step 1: Set Up Supabase (the database)

1. Go to [supabase.com](https://supabase.com) and create a free account
2. Click **New Project** — give it a name like "classroom-tracker"
3. Set a database password (save this somewhere safe)
4. Wait 1-2 minutes for the project to spin up
5. In the left sidebar, click **SQL Editor**
6. Copy the entire contents of `supabase/migrations/001_initial.sql` and paste it into the editor
7. Click **Run** — this creates all the tables

### Get your Supabase keys:
1. In the left sidebar, click **Settings** → **API**
2. Copy these three values (you'll need them later):
   - **Project URL** (looks like `https://xxxxx.supabase.co`)
   - **anon/public key** (long string starting with `eyJ`)
   - **service_role key** (another long string — keep this private!)

### Enable real-time:
1. In the left sidebar, click **Database** → **Replication**
2. Under "Tables in public schema", toggle ON the **checkouts** table

---

## Step 2: Put the Code on GitHub

1. Go to [github.com](https://github.com) and create a new repository called `classroom-tracker`
2. On your computer, open Terminal and run:
   ```
   cd /Users/mikenelson/Desktop/websites/classroom-tracker
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/YOUR-USERNAME/classroom-tracker.git
   git push -u origin main
   ```
   (Replace YOUR-USERNAME with your GitHub username)

---

## Step 3: Deploy on Vercel

1. Go to [vercel.com](https://vercel.com) and create a free account (sign in with GitHub)
2. Click **Add New** → **Project**
3. Find your `classroom-tracker` repository and click **Import**
4. Before clicking Deploy, click **Environment Variables** and add:
   - `NEXT_PUBLIC_SUPABASE_URL` = your Project URL from Step 1
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = your anon/public key from Step 1
   - `SUPABASE_SERVICE_ROLE_KEY` = your service_role key from Step 1
5. Click **Deploy** — wait 2-3 minutes
6. Vercel will give you a URL like `classroom-tracker.vercel.app`

---

## Step 4: Create Your Admin Account

1. Go to `https://your-site.vercel.app/setup`
2. Create your admin username and password
3. Click "Create Admin Account"

---

## Step 5: Import Students & Teachers

On your computer, open Terminal and run:

```bash
cd /Users/mikenelson/Desktop/websites/classroom-tracker
npm install

# First, set your environment variables:
export NEXT_PUBLIC_SUPABASE_URL="https://xxxxx.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# Import students (this takes 1-2 minutes):
node scripts/seed-students.js

# Import teachers (edit scripts/seed-teachers.js first to set passwords):
node scripts/seed-teachers.js
```

**Before running the teacher script:** Open `scripts/seed-teachers.js` in a text editor and change the password for each teacher from `changeme1`, `changeme2`, etc. to actual passwords.

---

## Step 6: Get a Domain (Optional)

Popular domain registrars:
- [Namecheap.com](https://namecheap.com) — affordable, easy
- [Google Domains](https://domains.google) — simple

Once you have a domain, in Vercel:
1. Go to your project → **Settings** → **Domains**
2. Add your domain and follow the DNS instructions

---

## How Teachers Log In

1. Open the app URL on any browser
2. Look for the **small lock icon** in the bottom-right corner
3. Click it → choose "Teacher" tab → enter username and password
4. They'll be able to see all students' full names in the checked-out list
5. Admin login works the same way and redirects to `/admin`

---

## Admin Panel Features

Go to `/admin` after logging in as admin:

- **Students tab** — add, edit names, reset PINs, activate/deactivate
- **Teachers tab** — add, edit, reset passwords, assign rooms
- **Rooms tab** — add/rename classrooms
- **Settings tab** — change title, bathroom limits, time limits, locations
- **History tab** — search checkout history, filter by date/student, export to CSV

---

## Annual Reset

At the start of each school year:
1. Log in to admin panel
2. **Students tab**: deactivate old students, add new ones with their PINs
3. **Teachers tab**: update any teacher changes
4. **History**: old history is automatically deleted after 1 year
   (Or you can export to CSV first via the History tab)

---

## Troubleshooting

**Students see "Student" instead of their name in the checkout list**
→ This is correct — names are hidden from unlogged-in users. Teachers log in to see names.

**"Failed to check out" error**
→ Check that your Supabase environment variables are set correctly in Vercel

**App shows old data**
→ Real-time sync requires the checkouts table to have replication enabled (Step 1, last part)

**Need to update the app**
→ Make changes to the code files, then:
```bash
git add .
git commit -m "Update description"
git push
```
Vercel will automatically redeploy within 2 minutes.
