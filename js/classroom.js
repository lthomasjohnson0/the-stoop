/*
 * The block: a shared board of everyone's stoop, stored in Supabase.
 * Talks to Supabase's REST API with plain fetch, so no extra library is needed.
 * Each visitor gets a random id saved in their browser; their row is updated in place.
 */
const Classroom = (() => {
  const config = window.STOOP_CONFIG || {};
  const base = (config.supabaseUrl || '').trim().replace(/\/$/, '');
  const key = (config.supabaseKey || '').trim();
  const enabled = Boolean(base && key);

  class ClassError extends Error {
    constructor(kind, status = 0) {
      super(kind);
      this.kind = kind; // 'network' or 'http'
      this.status = status;
    }
  }

  function headers(extra = {}) {
    const result = { apikey: key, 'Content-Type': 'application/json', ...extra };
    // Older "anon" keys are JWTs and also go in the Authorization header.
    // Newer "sb_publishable_" keys only go in the apikey header.
    if (!key.startsWith('sb_')) result.Authorization = `Bearer ${key}`;
    return result;
  }

  async function request(path, options = {}) {
    let response;
    try {
      response = await fetch(`${base}/rest/v1/${path}`, options);
    } catch {
      throw new ClassError('network');
    }
    if (!response.ok) throw new ClassError('http', response.status);

    const text = await response.text();
    return text ? JSON.parse(text) : null;
  }

  // Insert the visitor's row, or update it if it already exists.
  async function save(row) {
    await request('stoops?on_conflict=id', {
      method: 'POST',
      headers: headers({ Prefer: 'resolution=merge-duplicates,return=minimal' }),
      body: JSON.stringify(row)
    });
  }

  async function list() {
    const rows = await request('stoops?select=id,name,top4,ratings,updated_at&order=updated_at.desc&limit=300', {
      headers: headers()
    });
    return rows || [];
  }

  return { enabled, save, list, ClassError };
})();
