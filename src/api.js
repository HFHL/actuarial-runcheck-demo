import { dispatch } from '../mock/service.js';

const key = 'actuarial-workspace-v1';
let state = JSON.parse(localStorage.getItem(key) ?? 'null');

function remember(result) {
  if (result.state) {
    state = result.state;
    localStorage.setItem(key, JSON.stringify(state));
  }
  return result;
}

export async function api(action, data = {}) {
  if (import.meta.env.DEV) {
    const response = await fetch('/api/mock', {
      method:'POST', headers:{ 'Content-Type':'application/json' },
      body:JSON.stringify({ action,state,...data })
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Mock service unavailable');
    return remember(result);
  }
  if (action === 'check' || action === 'investigate') {
    await new Promise(resolve => setTimeout(resolve, 450));
  }
  try {
    return remember(dispatch(action, { state, ...data }));
  } catch (error) {
    throw new Error(error.message || 'Mock service unavailable');
  }
}
