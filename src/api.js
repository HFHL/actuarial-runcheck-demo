const key = 'actuarial-workspace-v1';
let state = JSON.parse(localStorage.getItem(key) ?? 'null');

export async function api(action, data = {}) {
  const response = await fetch('/api/mock', {
    method:'POST', headers:{ 'Content-Type':'application/json' },
    body:JSON.stringify({ action,state,...data })
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Mock service unavailable');
  if (result.state) {
    state = result.state;
    localStorage.setItem(key,JSON.stringify(state));
  }
  return result;
}
