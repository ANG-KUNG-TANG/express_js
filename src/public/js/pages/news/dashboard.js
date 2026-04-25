import { initNavbar } from "../../../components/navbar.js";
import { taskCard } from "../../../components/taskCard.js";
import { toast } from "../../core/toast.js";
import { requireAuth } from "../../core/router.js";
import { isAdmin, isTeacher, getUser } from "../../core/auth.js";
import { apiFetch } from "../../core/api.js";

requireAuth();
initNavbar();

const user = getUser();
document.getElementById('welcome-name').textContent = `Welcome back, ${user.name}`;

if (isAdmin()) {
    loadAdminDashboard();
} else if (isTeacher()) {
    loadTeacherDashboard();
} else {
    loadUserDashboard();
}

async function loadUserDashboard() {
    document.getElementById('user-dashboard').style.display    = 'block';
    document.getElementById('teacher-dashboard').style.display = 'none';
    document.getElementById('admin-dashboard').style.display   = 'none';

    try {
        const taskRes = await apiFetch('/api/writing-tasks');
        const tasks = taskRes?.data || [];

        const counts = { ASSIGNED: 0, WRITING: 0, SUBMITTED: 0, REVIEWED: 0, SCORED: 0 };
        tasks.forEach(t => {
            if (counts[t.status] !== undefined) counts[t.status]++;
        });

        document.getElementById('stat-assigned').textContent = counts.ASSIGNED;
        document.getElementById('stat-writing').textContent = counts.WRITING;
        document.getElementById('stat-submitted').textContent = counts.SUBMITTED;
        document.getElementById('stat-scored').textContent = counts.SCORED;

        const recentEl = document.getElementById('recent-tasks');
        const recent = tasks.slice(0, 3);
        recentEl.innerHTML = recent.length
            ? recent.map(taskCard).join('')
            : '<p class="empty-state">No recent tasks.</p>';
    } catch {
        toast('Failed to load user dashboard', 'error');
    }
}

async function loadTeacherDashboard() {
    document.getElementById('user-dashboard').style.display    = 'none';
    document.getElementById('teacher-dashboard').style.display = 'block';
    document.getElementById('admin-dashboard').style.display   = 'none';

    try {
        const taskRes = await apiFetch('/api/writing-tasks');
        const tasks   = taskRes?.data || [];

        const submitted = tasks.filter(t => t.status === 'SUBMITTED').length;
        const reviewed  = tasks.filter(t => t.status === 'REVIEWED').length;

        document.getElementById('teacher-stat-submitted').textContent = submitted;
        document.getElementById('teacher-stat-reviewed').textContent  = reviewed;

        const queueEl = document.getElementById('teacher-queue');
        const queue   = tasks.filter(t => t.status === 'SUBMITTED').slice(0, 5);
        queueEl.innerHTML = queue.length
            ? queue.map(taskCard).join('')
            : '<p class="empty-state">No tasks awaiting review.</p>';
    } catch {
        toast('Failed to load teacher dashboard', 'error');
    }
}

async function loadAdminDashboard() {
    document.getElementById('user-dashboard').style.display    = 'none';
    document.getElementById('teacher-dashboard').style.display = 'none';
    document.getElementById('admin-dashboard').style.display   = 'block';

    try {
        const [taskRes, userRes] = await Promise.all([
            apiFetch('/api/writing-tasks'),
            apiFetch('/api/list_users'),
        ]);

        const tasks = taskRes?.data || [];
        const users = userRes?.data || [];

        const submitted = tasks.filter(t => t.status === 'SUBMITTED').length;
        const reviewed  = tasks.filter(t => t.status === 'REVIEWED').length;

        document.getElementById('admin-stat-total').textContent     = tasks.length;
        document.getElementById('admin-stat-submitted').textContent = submitted;
        document.getElementById('admin-stat-reviewed').textContent  = reviewed;
        document.getElementById('admin-stat-users').textContent     = users.length;

        const queueEl = document.getElementById('action-queue');
        const queue = tasks.filter(t => t.status === 'SUBMITTED' || t.status === 'REVIEWED').slice(0, 5);
        queueEl.innerHTML = queue.length
            ? queue.map(taskCard).join('')
            : '<p class="empty-state">No tasks need attention right now.</p>';
    } catch {
        toast('Failed to load admin data', 'error');
    }
}