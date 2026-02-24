// public/js/store.js
// NOTE: refreshToken is an httpOnly cookie set by the server.
// JS can NEVER read it — that's the security model. We only store accessToken + user.

const _state = {
    user:        null,
    accessToken: null,
    tasks:       [],
    users:       [],
};

const _listeners = {};

function emit(key) {
    (_listeners[key] || []).forEach(fn => fn(_state[key]));
}

export const store = {
    get(key)     { return _state[key]; },
    isLoggedIn() { return !!_state.accessToken; },

    set(key, value) {
        _state[key] = value;
        emit(key);
    },

    // Called after login / OAuth callback
    setSession({ user, accessToken }) {
        _state.user        = user;
        _state.accessToken = accessToken;
        // refreshToken is httpOnly cookie — server manages it, JS never touches it
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('user',        JSON.stringify(user));
        emit('user');
        emit('accessToken');
    },

    // Called on logout
    clearSession() {
        _state.user = _state.accessToken = null;
        _state.tasks = [];
        _state.users = [];
        localStorage.removeItem('accessToken');
        localStorage.removeItem('user');
        emit('user');
        emit('accessToken');
    },

    // Restore session on page load
    rehydrate() {
        const at = localStorage.getItem('accessToken');
        const u  = localStorage.getItem('user');
        if (at && u) {
            try {
                _state.accessToken = at;
                _state.user        = JSON.parse(u);
            } catch (_) {
                localStorage.removeItem('accessToken');
                localStorage.removeItem('user');
            }
        }
    },

    subscribe(key, fn) {
        if (!_listeners[key]) _listeners[key] = [];
        _listeners[key].push(fn);
        return () => { _listeners[key] = _listeners[key].filter(f => f !== fn); };
    },
};