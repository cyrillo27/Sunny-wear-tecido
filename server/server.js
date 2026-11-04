const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const crypto = require('crypto');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Conexão com o PostgreSQL (endereço na variável DATABASE_URL)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// CRIA A TABELA E ADICIONA A COLUNA DE LARGURA AUTOMATICAMENTE
pool.query(`
  CREATE TABLE IF NOT EXISTS movimentacoes (
    id SERIAL PRIMARY KEY,
    tipomovimento VARCHAR(50),
    codigo VARCHAR(100),
    nome VARCHAR(255),
    cor VARCHAR(100),
    localizacao VARCHAR(255),
    metros NUMERIC,
    quantidade NUMERIC,
    unidademedida VARCHAR(20),
    preco NUMERIC,
    estoqueminimo NUMERIC,
    notafiscal VARCHAR(100),
    fornecedor VARCHAR(255),
    foto TEXT,
    data DATE,
    largura NUMERIC
  )
`).then(async () => {
  // Garante que a coluna largura existe caso a tabela já tenha sido criada antes
  await pool.query('ALTER TABLE movimentacoes ADD COLUMN IF NOT EXISTS largura NUMERIC;');
  console.log('📦 Tabela e coluna "largura" verificadas com sucesso!');
}).catch(err => console.error('Erro ao configurar tabela:', err));

// Compara textos sem revelar pelo tempo de resposta onde está a diferença
const textosIguais = (a, b) => crypto.timingSafeEqual(
  crypto.createHash('sha256').update(String(a)).digest(),
  crypto.createHash('sha256').update(String(b)).digest()
);

// Protege as rotas que alteram dados: exige a senha de ações no cabeçalho
const exigirSenha = (req, res, next) => {
  const senhaAcoes = process.env.SENHA_ACOES;
  if (!senhaAcoes) {
    return res.status(503).json({ erro: 'Servidor sem SENHA_ACOES configurada' });
  }
  if (!textosIguais(req.get('x-senha-acao') || '', senhaAcoes)) {
    return res.status(401).json({ erro: 'Senha incorreta' });
  }
  next();
};

// Rota de login (sem usuário ou senha padrão no código)
app.post('/api/login', (req, res) => {
  const { usuario, senha } = req.body || {};
  const usuarioAdmin = process.env.ADMIN_USER;
  const senhaAdmin = process.env.ADMIN_PASS;

  if (!usuarioAdmin || !senhaAdmin) {
    return res.status(503).json({ sucesso: false, erro: 'Login não configurado no servidor' });
  }
  if (textosIguais(usuario || '', usuarioAdmin) && textosIguais(senha || '', senhaAdmin)) {
    res.json({ sucesso: true });
  } else {
    res.status(401).json({ sucesso: false, erro: 'Usuário ou senha incorretos' });
  }
});

// Confere a senha de ações antes de o site executar a operação
app.post('/api/validar-senha', exigirSenha, (req, res) => {
  res.json({ sucesso: true });
});

// A lista não traz as fotos, só o endereço de cada uma
const COLUNAS_LISTA = 'id, tipomovimento, codigo, nome, cor, localizacao, metros, quantidade, unidademedida, preco, estoqueminimo, notafiscal, fornecedor, data, largura, octet_length(foto) AS foto_tam';

// Quando o site reenvia o endereço de uma foto, grava a foto original, nunca o endereço
const URL_FOTO = /^(?:https?:\/\/[^/]+)?\/api\/movimentacoes\/(\d+)\/foto(?:\?.*)?$/;
const resolverFoto = async (foto) => {
  const encontrado = URL_FOTO.exec(String(foto || ''));
  if (!encontrado) return foto;
  const resultado = await pool.query('SELECT foto FROM movimentacoes WHERE id = $1', [encontrado[1]]);
  return resultado.rows[0]?.foto || '';
};

// Entrega a foto de um registro como imagem, com cache no navegador
app.get('/api/movimentacoes/:id/foto', async (req, res) => {
  if (!/^\d+$/.test(req.params.id)) return res.status(404).end();
  try {
    const resultado = await pool.query('SELECT foto FROM movimentacoes WHERE id = $1', [req.params.id]);
    const foto = resultado.rows[0]?.foto || '';

    if (/^https?:\/\//i.test(foto)) return res.redirect(foto);

    const virgula = foto.indexOf(',');
    const cabecalho = virgula > 0 ? foto.slice(0, virgula) : '';
    const tipo = /^data:(image\/[a-z0-9.+-]+)/i.exec(cabecalho);
    if (!tipo) return res.status(404).end();

    const conteudo = foto.slice(virgula + 1);
    res.set({
      'Content-Type': tipo[1],
      'Cache-Control': 'public, max-age=86400',
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'none'; sandbox",
    });
    res.send(/;base64$/i.test(cabecalho) ? Buffer.from(conteudo, 'base64') : Buffer.from(decodeURIComponent(conteudo)));
  } catch (erro) {
    console.error('Erro ao buscar foto:', erro.message);
    res.status(500).json({ erro: 'Erro ao buscar foto no banco' });
  }
});

// Buscar movimentações
app.get('/api/movimentacoes', async (req, res) => {
  try {
    const resultado = await pool.query(`SELECT ${COLUNAS_LISTA} FROM movimentacoes ORDER BY id DESC`);
    
    const dadosPadronizados = resultado.rows.map(({ foto_tam, ...r }) => ({
      ...r,
      foto: foto_tam > 0 ? `/api/movimentacoes/${r.id}/foto?v=${foto_tam}` : '',
      estoqueminimo: Number(r.estoqueminimo || 0),
      largura: Number(r.largura || 0),
      unidademedida: r.unidademedida || 'm',
      notafiscal: r.notafiscal || '',
      tipomovimento: r.tipomovimento || 'entrada'
    }));

    res.json(dadosPadronizados);
  } catch (erro) {
    console.error('Erro ao buscar:', erro.message);
    res.status(500).json({ erro: 'Erro ao buscar dados no banco' });
  }
});

// Cadastrar nova movimentação (com largura)
app.post('/api/movimentacoes', exigirSenha, async (req, res) => {
  let { tipoMovimento, codigo, nome, cor, localizacao, quantidade, metros, unidadeMedida, preco, estoqueMinimo, estoqueminimo, notaFiscal, notafiscal, fornecedor, foto, data, largura } = req.body;
  
  // 'lote' = cadastro só para consulta (não conta no estoque)
  const tipoFinal = tipoMovimento === 'saida' ? 'saida' : (tipoMovimento === 'lote' ? 'lote' : 'entrada');
  const qtdFinal = parseFloat(String(quantidade || metros || 0).replace(',', '.')) || 0;
  const precoFinal = parseFloat(String(preco || 0).replace(',', '.')) || 0;
  const larguraFinal = parseFloat(String(largura || 0).replace(',', '.')) || 0;
  let minFinal = Number(estoqueminimo !== undefined && estoqueminimo !== '' ? estoqueminimo : (estoqueMinimo !== undefined && estoqueMinimo !== '' ? estoqueMinimo : 0));

  try {
    foto = await resolverFoto(foto);
    const query = `
      INSERT INTO movimentacoes (tipomovimento, codigo, nome, cor, localizacao, metros, quantidade, unidademedida, preco, estoqueminimo, notafiscal, fornecedor, foto, data, largura)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15) RETURNING *
    `;
    const valores = [tipoFinal, codigo, nome, cor, localizacao, qtdFinal, qtdFinal, unidadeMedida || 'm', precoFinal, minFinal, notafiscal || notaFiscal || '', fornecedor || '', foto, data || new Date().toISOString().split('T')[0], larguraFinal];
    const novoRegistro = await pool.query(query, valores);

    if (minFinal > 0 && codigo) {
      await pool.query(
        'UPDATE movimentacoes SET estoqueminimo = $1 WHERE LOWER(TRIM(codigo)) = LOWER(TRIM($2))',
        [minFinal, codigo]
      );
    }

    res.status(201).json(novoRegistro.rows[0]);
  } catch (erro) {
    console.error('Erro ao inserir:', erro.message);
    res.status(500).json({ erro: erro.message });
  }
});

// Atualizar movimentação
app.put('/api/movimentacoes/:id', exigirSenha, async (req, res) => {
  const { id } = req.params;
  let { tipoMovimento, codigo, nome, cor, localizacao, quantidade, metros, unidadeMedida, preco, estoqueMinimo, estoqueminimo, notaFiscal, notafiscal, fornecedor, foto, largura } = req.body;
  
  // 'lote' = cadastro só para consulta (não conta no estoque)
  const tipoFinal = tipoMovimento === 'saida' ? 'saida' : (tipoMovimento === 'lote' ? 'lote' : 'entrada');
  const qtdFinal = parseFloat(String(quantidade || metros || 0).replace(',', '.')) || 0;
  const precoFinal = parseFloat(String(preco || 0).replace(',', '.')) || 0;
  const larguraFinal = parseFloat(String(largura || 0).replace(',', '.')) || 0;
  let minFinal = Number(estoqueminimo !== undefined && estoqueminimo !== '' ? estoqueminimo : (estoqueMinimo !== undefined && estoqueMinimo !== '' ? estoqueMinimo : 0));

  try {
    foto = await resolverFoto(foto);
    const query = `
      UPDATE movimentacoes 
      SET tipomovimento = $1, codigo = $2, nome = $3, cor = $4, localizacao = $5, metros = $6, quantidade = $7, unidademedida = $8, preco = $9, estoqueminimo = $10, notafiscal = $11, fornecedor = $12, foto = $13, largura = $14
      WHERE id = $15 RETURNING *
    `;
    const valores = [tipoFinal, codigo, nome, cor, localizacao, qtdFinal, qtdFinal, unidadeMedida || 'm', precoFinal, minFinal, notafiscal || notaFiscal || '', fornecedor || '', foto, larguraFinal, id];
    const atualizado = await pool.query(query, valores);
    
    if (atualizado.rows.length === 0) {
      return res.status(404).json({ erro: 'ID não encontrado' });
    }

    res.json(atualizado.rows[0]);
  } catch (erro) {
    console.error('Erro ao atualizar:', erro.message);
    res.status(500).json({ erro: erro.message });
  }
});

// Deletar
app.delete('/api/movimentacoes/:id', exigirSenha, async (req, res) => {
  try {
    await pool.query('DELETE FROM movimentacoes WHERE id = $1', [req.params.id]);
    res.json({ mensagem: 'Deletado com sucesso' });
  } catch (erro) {
    res.status(500).json({ erro: 'Erro ao deletar do banco' });
  }
});

// Entrega o site já compilado (npm run build) no mesmo endereço da API
app.use(express.static(path.join(__dirname, '..', 'dist')));

const PORT = process.env.PORT || 3001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});