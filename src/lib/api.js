import { WORKER_URL, BOOKS_WORKER_URL, EVENTS_WORKER_URL, MEDIA_WORKER_URL } from './config';

function authHeaders(token) {
  return { 'Authorization': `token ${token}`, 'Content-Type': 'application/json' };
}

async function handleResponse(res) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

// ── Members ────────────────────────────────────────────────────────────────
export async function getMembers(token) {
  const res = await fetch(`${WORKER_URL}/admin/members`, { headers: authHeaders(token) });
  return handleResponse(res);
}

export async function approveMember(token, id) {
  const res = await fetch(`${WORKER_URL}/admin/approve`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ id }),
  });
  return handleResponse(res);
}

export async function rejectMember(token, id) {
  const res = await fetch(`${WORKER_URL}/admin/reject`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ id }),
  });
  return handleResponse(res);
}

export async function renewMember(token, id) {
  const res = await fetch(`${WORKER_URL}/admin/renew`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ id }),
  });
  return handleResponse(res);
}

export async function sendReminders(token) {
  const res = await fetch(`${WORKER_URL}/admin/remind`, {
    method: 'POST',
    headers: authHeaders(token),
  });
  return handleResponse(res);
}

// ── Newsletter ─────────────────────────────────────────────────────────────
export async function sendNewsletter(token, { subject, html }) {
  const res = await fetch(`${WORKER_URL}/newsletter`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ subject, html }),
  });
  return handleResponse(res);
}

// ── Books ──────────────────────────────────────────────────────────────────
export async function getBooks(token) {
  const res = await fetch(`${BOOKS_WORKER_URL}/admin/books`, { headers: authHeaders(token) });
  return handleResponse(res);
}

export async function createBook(token, book) {
  const res = await fetch(`${BOOKS_WORKER_URL}/admin/books`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(book),
  });
  return handleResponse(res);
}

export async function updateBook(token, id, book) {
  const res = await fetch(`${BOOKS_WORKER_URL}/admin/books/${id}`, {
    method: 'PUT',
    headers: authHeaders(token),
    body: JSON.stringify(book),
  });
  return handleResponse(res);
}

export async function uploadBookImage(token, bookId, file) {
  const formData = new FormData();
  formData.append('image', file);
  const res = await fetch(`${BOOKS_WORKER_URL}/admin/books/${bookId}/image`, {
    method: 'POST',
    headers: { 'Authorization': `token ${token}` },
    body: formData,
  });
  return handleResponse(res);
}

// ── Orders ─────────────────────────────────────────────────────────────────
export async function getOrders(token) {
  const res = await fetch(`${BOOKS_WORKER_URL}/admin/orders`, { headers: authHeaders(token) });
  return handleResponse(res);
}

// ── Admins ─────────────────────────────────────────────────────────────────
export async function getAdmins(token) {
  const res = await fetch(`${WORKER_URL}/admin/admins`, { headers: authHeaders(token) });
  return handleResponse(res);
}

export async function addAdmin(token, { github_login, role, section }) {
  const res = await fetch(`${WORKER_URL}/admin/admins`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ github_login, role, section: section || null }),
  });
  return handleResponse(res);
}

export async function removeAdmin(token, id) {
  const res = await fetch(`${WORKER_URL}/admin/admins/${id}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  });
  return handleResponse(res);
}

// ── Event Registrations ────────────────────────────────────────────────────
export async function getEventSummaries(token) {
  const res = await fetch(`${EVENTS_WORKER_URL}/admin/events`, { headers: authHeaders(token) });
  return handleResponse(res);
}

export async function getEventRegistrations(token, eventSlug) {
  const url = eventSlug
    ? `${EVENTS_WORKER_URL}/admin/registrations?event=${encodeURIComponent(eventSlug)}`
    : `${EVENTS_WORKER_URL}/admin/registrations`;
  const res = await fetch(url, { headers: authHeaders(token) });
  return handleResponse(res);
}

export async function confirmRegistration(token, id) {
  const res = await fetch(`${EVENTS_WORKER_URL}/admin/confirm`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ id }),
  });
  return handleResponse(res);
}

export async function cancelRegistration(token, id) {
  const res = await fetch(`${EVENTS_WORKER_URL}/admin/cancel`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ id }),
  });
  return handleResponse(res);
}

// ── Media ──────────────────────────────────────────────────────────────────
export async function getMedia(token) {
  const res = await fetch(`${MEDIA_WORKER_URL}/media`, { headers: authHeaders(token) });
  return handleResponse(res);
}

export async function presignUpload(token, filename, contentType) {
  const res = await fetch(`${MEDIA_WORKER_URL}/media/presign`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ filename, contentType }),
  });
  return handleResponse(res);
}

export async function deleteMedia(token, key) {
  const res = await fetch(`${MEDIA_WORKER_URL}/media/${encodeURIComponent(key)}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  });
  return handleResponse(res);
}
