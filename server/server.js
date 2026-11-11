// Roda o servidor no computador (ou em qualquer hospedagem com Node).
// Na Netlify, quem usa o app é netlify/functions/api.mjs.
const app = require('./app');

const PORT = process.env.PORT || 3001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});
