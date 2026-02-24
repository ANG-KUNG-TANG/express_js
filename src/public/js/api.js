// public/js/api.js
const BASE_URL = '';

async function request(method, url, body = null, token = null) {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const options = {
        method,
        headers,
        credentials: 'include',   // ← sends & receives httpOnly cookies automatically
    };
    if (body) options.body = JSON.stringify(body);

    let res;
    try {
        res = await fetch(BASE_URL + url, options);
    } catch (_) {
        throw new Error('Cannot reach server. Is it running?');
    }

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
        const err = new Error(data.message || `Request failed (${res.status})`);
        err.status = res.status;
        err.code   = data.code;
        throw err;
    }
    return data;
}

// ── Auth ──────────────────────────────────────────────────────────────────────
// login lives in user.router.js mounted at /api  →  /api/auth/login
// refresh token is httpOnly cookie — browser sends it automatically with credentials:'include'
export const authAPI = {
    loginEmail:  (email, password) => request('POST', '/api/auth/login', { email, password }),
    refresh:     ()                => request('POST', '/auth/refresh'),
    logout:      (token)           => request('POST', '/auth/logout', null, token),
    loginGitHub: ()                => { window.location.href = '/auth/github'; },
    loginGoogle: ()                => { window.location.href = '/auth/google'; },
};

// ── Users ─────────────────────────────────────────────────────────────────────
export const userAPI = {
    create:     (data)              => request('POST',   '/api/users',               data),
    getById:    (id, token)         => request('GET',    `/api/users/${id}`,          null, token),
    getByEmail: (email, token)      => request('GET',    `/api/users/email/${email}`, null, token),
    list:       (token)             => request('GET',    '/api/list_users',           null, token),
    update:     (id, data, token)   => request('PUT',    `/api/users/${id}`,          data, token),
    delete:     (id, token)         => request('DELETE', `/api/users/${id}`,          null, token),
    promote:    (id, token)         => request('PATCH',  `/api/users/${id}/promote`,  null, token),
};

// ── Tasks ─────────────────────────────────────────────────────────────────────
export const taskAPI = {
    create:   (data, token)         => request('POST',   '/api/tasks',                                   data, token),
    getById:  (id, token)           => request('GET',    `/api/tasks/${id}`,                             null, token),
    listAll:  (token)               => request('GET',    '/api/tasks',                                   null, token),
    search:   (q, token)            => request('GET',    `/api/tasks/search?q=${encodeURIComponent(q)}`, null, token),
    update:   (id, data, token)     => request('PATCH',  `/api/tasks/${id}`,                             data, token),
    delete:   (id, token)           => request('DELETE', `/api/tasks/${id}`,                             null, token),
    start:    (id, token)           => request('PATCH',  `/api/tasks/${id}/start`,                       null, token),
    complete: (id, token)           => request('PATCH',  `/api/tasks/${id}/complete`,                    null, token),
    transfer: (data, token)         => request('POST',   '/api/tasks/transfer',                          data, token),
};