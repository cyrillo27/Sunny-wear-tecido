const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Conexão segura com o PostgreSQL no Render via Variável de Ambiente
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// 🟢 CRIA A TABELA AUTOMATICAMENTE SE ELA NÃO EXISTIR (Resolve o erro 500)
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
    data DATE
  )
`).then(() => console.log('📦 Tabela "movimentacoes" verificada/criada com sucesso!'))
  .catch(err => console.error('Erro ao criar tabela automaticamente:', err));

// Rota de login segura no back-end (protege sua senha de acesso)
app.post('/api/login', (req, res) => {
  const { usuario, senha } = req.body;
  const usuarioAdmin = process.env.ADMIN_USER || 'sunnytecido';
  const senhaAdmin = process.env.ADMIN_PASS || 'tecido@2026';

  if (usuario === usuarioAdmin && senha === senhaAdmin) {
    res.json({ sucesso: true });
  } else {
    res.status(401).json({ sucesso: false, erro: 'Usuário ou senha incorretos' });
  }
});

// Rota para buscar todas as movimentações
app.get('/api/movimentacoes', async (req, res) => {
  try {
    const resultado = await pool.query('SELECT * FROM movimentacoes ORDER BY id DESC');
    
    const dadosPadronizados = resultado.rows.map(r => ({
      ...r,
      estoqueminimo: Number(r.estoqueminimo || r.estoqueMinimo || r.estoque_minimo || 0),
      unidademedida: r.unidademedida || r.unidadeMedida || 'm',
      notafiscal: r.notafiscal || r.notaFiscal || '',
      tipomovimento: r.tipomovimento || r.tipoMovimento || 'entrada'
    }));

    res.json(dadosPadronizados);
  } catch (erro) {
    console.error('Erro ao buscar:', erro.message);
    res.status(500).json({ erro: 'Erro ao buscar dados no banco' });
  }
});

// Rota para cadastrar nova movimentação
app.post('/api/movimentacoes', async (req, res) => {
  let { tipoMovimento, codigo, nome, cor, localizacao, quantidade, metros, unidadeMedida, preco, estoqueMinimo, estoqueminimo, notaFiscal, notafiscal, fornecedor, foto, data } = req.body;
  
  const tipoFinal = tipoMovimento === 'saida' ? 'saida' : 'entrada';
  const qtdFinal = parseFloat(String(quantidade || metros || 0).replace(',', '.')) || 0;
  const precoFinal = parseFloat(String(preco || 0).replace(',', '.')) || 0;
  let minFinal = Number(estoqueminimo !== undefined && estoqueminimo !== '' ? estoqueminimo : (estoqueMinimo !== undefined && estoqueMinimo !== '' ? estoqueMinimo : 0));

  try {
    const query = `
      INSERT INTO movimentacoes (tipomovimento, codigo, nome, cor, localizacao, metros, quantidade, unidademedida, preco, estoqueminimo, notafiscal, fornecedor, foto, data)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) RETURNING *
    `;
    const valores = [tipoFinal, codigo, nome, cor, localizacao, qtdFinal, qtdFinal, unidadeMedida || 'm', precoFinal, minFinal, notafiscal || notaFiscal || '', fornecedor || '', foto, data || new Date().toISOString().split('T')[0]];
    const novoRegistro = await pool.query(query, valores);

    // SINCRONIZAÇÃO GLOBAL: Atualiza todas as linhas desse mesmo código no Render
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

// Rota para atualizar uma movimentação
app.put('/api/movimentacoes/:id', async (req, res) => {
  const { id } = req.params;
  let { tipoMovimento, codigo, nome, cor, localizacao, quantidade, metros, unidadeMedida, preco, estoqueMinimo, estoqueminimo, notaFiscal, notafiscal, fornecedor, foto } = req.body;
  
  const tipoFinal = tipoMovimento === 'saida' ? 'saida' : 'entrada';
  const qtdFinal = parseFloat(String(quantidade || metros || 0).replace(',', '.')) || 0;
  const precoFinal = parseFloat(String(preco || 0).replace(',', '.')) || 0;
  let minFinal = Number(estoqueminimo !== undefined && estoqueminimo !== '' ? estoqueminimo : (estoqueMinimo !== undefined && estoqueMinimo !== '' ? estoqueMinimo : 0));

  try {
    const query = `
      UPDATE movimentacoes 
      SET tipomovimento = $1, codigo = $2, nome = $3, cor = $4, localizacao = $5, metros = $6, quantidade = $7, unidademedida = $8, preco = $9, estoqueminimo = $10, notafiscal = $11, fornecedor = $12, foto = $13
      WHERE id = $14 RETURNING *
    `;
    const valores = [tipoFinal, codigo, nome, cor, localizacao, qtdFinal, qtdFinal, unidadeMedida || 'm', precoFinal, minFinal, notafiscal || notaFiscal || '', fornecedor || '', foto, id];
    const atualizado = await pool.query(query, valores);
    
    if (atualizado.rows.length === 0) {
      return res.status(404).json({ erro: 'ID não encontrado' });
    }

    // SINCRONIZAÇÃO GLOBAL: Atualiza TODAS as linhas desse mesmo tecido no Render para o novo valor
    if (minFinal > 0 && codigo) {
      await pool.query(
        'UPDATE movimentacoes SET estoqueminimo = $1 WHERE LOWER(TRIM(codigo)) = LOWER(TRIM($2))',
        [minFinal, codigo]
      );
    }

    res.json(atualizado.rows[0]);
  } catch (erro) {
    console.error('Erro ao atualizar:', erro.message);
    res.status(500).json({ erro: erro.message });
  }
});

// Rota para deletar
app.delete('/api/movimentacoes/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM movimentacoes WHERE id = $1', [req.params.id]);
    res.json({ mensagem: 'Deletado com sucesso' });
  } catch (erro) {
    res.status(500).json({ erro: 'Erro ao deletar do banco' });
  }
});

// Porta dinâmica exigida pelo Render
const PORT = process.env.PORT || 3001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});