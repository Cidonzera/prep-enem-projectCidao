// Conteúdo completo do app.js fornecido pelo assistente
// ==========================
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { 
    getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { 
    getFirestore, doc, setDoc, onSnapshot, collection, query, runTransaction, getDocs, deleteDoc 
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { firebaseConfig, initialAuthToken, appId } from './firebase-config.js';

let db; let auth; let userId = null; let isAuthReady = false;

const profileNameEl = document.getElementById('profile-name');
const xpFill = document.querySelector('.xp-fill');
const xpValue = document.getElementById('xp-value');
const coinsValue = document.getElementById('coins-value');
const levelValue = document.getElementById('level-value');
const dailyTasksContainer = document.getElementById('daily-tasks-container');
const headerDateEl = document.getElementById('header-date');

function initFirebase() {
    const app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
}

async function startAuth() {
    if (initialAuthToken) await signInWithCustomToken(auth, initialAuthToken);
    else await signInAnonymously(auth);
}

function listenAuth() {
    onAuthStateChanged(auth, async (user) => {
        if (!user) return;
        userId = user.uid;
        isAuthReady = true;
        await checkOrCreateProfile();
        listenToUserProfile();
        loadDailyTasks();
    });
}

async function checkOrCreateProfile() {
    const ref = doc(db, appId, userId);
    await setDoc(ref, {
        name: "Estudante",
        xp: 0,
        coins: 0,
        level: 1
    }, { merge: true });
}

function listenToUserProfile() {
    const ref = doc(db, appId, userId);
    onSnapshot(ref, (snap) => {
        if (!snap.exists()) return;
        const data = snap.data();
        profileNameEl.textContent = data.name;
        xpValue.textContent = data.xp;
        coinsValue.textContent = data.coins;
        levelValue.textContent = data.level;
        updateXpBar(data.xp, data.level);
    });
}

function xpNeededForLevel(level) { return 100 * level; }

function updateXpBar(xp, level) {
    const pct = Math.min(100, (xp / xpNeededForLevel(level)) * 100);
    if (xpFill) xpFill.style.width = pct + "%";
}

async function addXP(amount) {
    const ref = doc(db, appId, userId);
    await runTransaction(db, async (tr) => {
        const snap = await tr.get(ref);
        if (!snap.exists()) return;
        let { xp, level, coins } = snap.data();
        xp += amount; coins += Math.floor(amount/10);
        let needed = xpNeededForLevel(level);
        while (xp >= needed) {
            xp -= needed; level++; needed = xpNeededForLevel(level);
        }
        tr.update(ref, { xp, level, coins });
    });
}

function formatDate() {
    return new Date().toLocaleDateString('pt-BR', { weekday:'long', day:'2-digit', month:'long' });
}
function updateHeaderDate() {
    if (headerDateEl) headerDateEl.textContent = formatDate();
}

async function loadDailyTasks() {
    dailyTasksContainer.innerHTML = "";
    const ref = collection(db, appId, userId, "dailyTasks");
    const docsSnap = await getDocs(query(ref));
    docsSnap.forEach((docSnap) => {
        renderTask(docSnap.id, docSnap.data());
    });
}

function renderTask(id, data) {
    const div = document.createElement('div');
    div.className = "daily-task";
    div.innerHTML = `
        <div class="task-name">${data.name}</div>
        <button class="task-complete-btn">Concluir (+${data.xp} XP)</button>
    `;
    div.querySelector('button').onclick = async () => {
        await addXP(data.xp);
        await deleteDoc(doc(db, appId, userId, "dailyTasks", id));
        div.remove();
    };
    dailyTasksContainer.appendChild(div);
}

async function initApp() {
    initFirebase(); updateHeaderDate(); await startAuth(); listenAuth();
}

initApp();
