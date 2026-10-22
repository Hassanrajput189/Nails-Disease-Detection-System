// localStorage wrapper that never crashes if storage is blocked
const mem = {};
export const store = {
  get(key, fallback) {
    try {
      const v = localStorage.getItem(key);
      return v ? JSON.parse(v) : fallback;
    } catch {
      return key in mem ? mem[key] : fallback;
    }
  },
  set(key, value) {
    mem[key] = value;
    try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* ignore */ }
  },
};
