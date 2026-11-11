import { defineConfig } from 'vite';
import { dispatch } from './mock/service.js';

function attach(server) {
  server.middlewares.use('/api/mock', async (req, res) => {
    if (req.method !== 'POST') { res.statusCode = 405; res.end(); return; }
    res.setHeader('Content-Type','application/json');
    try {
      let body = '';
      for await (const chunk of req) body += chunk;
      const { action, ...data } = JSON.parse(body);
      if (action === 'check' || action === 'investigate') await new Promise(resolve => setTimeout(resolve,450));
      res.end(JSON.stringify(dispatch(action,data)));
    } catch(error) {
      res.statusCode = error.status ?? 400;
      res.end(JSON.stringify({ error:error.message }));
    }
  });
}

export default defineConfig({ base:'/actuarial-runcheck-demo/', plugins:[{ name:'actuarial-mock', configureServer:attach, configurePreviewServer:attach }] });
