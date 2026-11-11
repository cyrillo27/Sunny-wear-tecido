// Servidor do sistema rodando como função da Netlify.
// Todas as chamadas /api/* do site chegam aqui (veja netlify.toml).
import serverless from 'serverless-http';
import app from '../../server/app.js';

const servidor = serverless(app, {
  binary: ['image/*'], // fotos dos tecidos voltam como imagem
  // A biblioteca entrega o corpo do envio como bytes; o Express 5 não converte sozinho
  request(req) {
    if (Buffer.isBuffer(req.body)) {
      const tipo = String(req.headers['content-type'] || '');
      const texto = req.body.toString('utf8');
      if (/application\/json/i.test(tipo) && texto.trim()) {
        req.body = JSON.parse(texto);
      } else if (!texto.trim()) {
        req.body = undefined;
      }
    }
  },
});

export const handler = (event, context) => {
  // O Express só lê o corpo do envio se souber o tamanho dele
  const cabecalhos = { ...(event.headers || {}) };
  const temTamanho = Object.keys(cabecalhos).some((k) => k.toLowerCase() === 'content-length');
  if (event.body && !temTamanho) {
    cabecalhos['content-length'] = String(Buffer.byteLength(event.body, event.isBase64Encoded ? 'base64' : 'utf8'));
  }
  return servidor({ ...event, headers: cabecalhos }, context);
};
