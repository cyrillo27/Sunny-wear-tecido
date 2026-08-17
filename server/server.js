const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// AQUI ESTÁ A CORREÇÃO: Removido o process.env.DATABASE_URL
const pool = new Pool({
  connectionString: 'postgresql://sunny_wear_estoque_limpo_user:WgYh1oAWvQtV7c0aeswEOrbjqKaAKXgg@dpg-da1l8tjl550s7395ttu0-a.oregon-postgres.render.com/sunny_wear_estoque_limpo',
  ssl: {
    rejectUnauthorized: false
  }
});

// Executa a limpeza pesada e recriação forçada direto no novo banco do Render
async function inicializarBanco() {
  try {
    await pool.query('DROP TABLE IF EXISTS movimentacoes CASCADE;');
    console.log('🔥 Tabela antiga destruída com sucesso do novo banco do Render!');

    await pool.query(`
      CREATE TABLE movimentacoes (
        id SERIAL PRIMARY KEY,
        tipoMovimento VARCHAR(50),
        codigo VARCHAR(100),
        nome VARCHAR(255),
        cor VARCHAR(100),
        localizacao VARCHAR(255),
        metros NUMERIC,
        quantidade NUMERIC,
        unidadeMedida VARCHAR(10),
        preco NUMERIC,
        notaFiscal VARCHAR(100),
        fornecedor VARCHAR(255),
        foto TEXT,
        data VARCHAR(50)
      );
    `);
    console.log('✨ Nova tabela "movimentacoes" criada limpa e pronta do zero!');
  } catch (err) {
    console.error('❌ Erro ao recriar a tabela no banco:', err);
  }
}

inicializarBanco();

app.get('/api/movimentacoes', async (req, res) => {
  try {
    const resultado = await pool.query('SELECT * FROM movimentacoes ORDER BY id DESC');
    res.json(resultado.rows);
  } catch (erro) {
    console.error('Erro ao buscar dados:', erro);
    res.status(500).json({ erro: 'Erro ao buscar dados do banco' });
  }
});

app.post('/api/movimentacoes', async (req, res) => {
  const { tipoMovimento, codigo, nome, cor, localizacao, quantidade, metros, unidadeMedida, preco, notaFiscal, fornecedor, foto, data } = req.body;
  const qtdFinal = Number(quantidade || metros || 0);
  const precoFinal = Number(preco || 0);
  const unidadeFinal = unidadeMedida || 'm';

  try {
    const query = `
      INSERT INTO movimentacoes (tipoMovimento, codigo, nome, cor, localizacao, metros, quantidade, unidadeMedida, preco, notaFiscal, fornecedor, foto, data)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING *
    `;
    const valores = [
      tipoMovimento, codigo, nome, cor, localizacao, 
      qtdFinal, qtdFinal, unidadeFinal, 
      precoFinal, notaFiscal || '', fornecedor || '', 
      foto, data || new Date().toISOString().split('T')[0]
    ];
    const novoRegistro = await pool.query(query, valores);
    res.status(201).json(novoRegistro.rows[0]);
  } catch (erro) {
    console.error('Erro ao inserir:', erro);
    res.status(500).json({ erro: 'Erro ao salvar no banco' });
  }
});

app.delete('/api/movimentacoes/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const resultado = await pool.query('DELETE FROM movimentacoes WHERE id::text = $1::text', [String(id)]);
    if (resultado.rowCount === 0) {
      return res.status(404).json({ erro: 'Registro não encontrado' });
    }
    res.json({ mensagem: 'Deletado com sucesso' });
  } catch (erro) {
    console.error('Erro ao deletar:', erro);
    res.status(500).json({ erro: 'Erro ao deletar' });
  }
});

app.put('/api/movimentacoes/:id', async (req, res) => {
  const { id } = req.params;
  const { tipoMovimento, codigo, nome, cor, localizacao, quantidade, metros, unidadeMedida, preco, notaFiscal, fornecedor, foto } = req.body;
  const qtdFinal = Number(quantidade || metros || 0);
  const precoFinal = Number(preco || 0);
  const unidadeFinal = unidadeMedida || 'm';

  try {
    const query = `
      UPDATE movimentacoes 
      SET tipoMovimento = $1, codigo = $2, nome = $3, cor = $4, localizacao = $5, metros = $6, quantidade = $7, unidadeMedida = $8, preco = $9, notaFiscal = $10, fornecedor = $11, foto = $12
      WHERE id::text = $13::text RETURNING *
    `;
    const valores = [
      tipoMovimento, codigo, nome, cor, localizacao, 
      qtdFinal, qtdFinal, unidadeFinal, 
      precoFinal, notaFiscal || '', fornecedor || '', 
      foto, String(id)
    ];
    const atualizado = await pool.query(query, valores);
    if (atualizado.rows.length === 0) {
      return res.status(404).json({ erro: 'Registro não encontrado para atualização' });
    }
    res.json(atualizado.rows[0]);
  } catch (erro) {
    console.error('Erro ao atualizar:', erro);
    res.status(500).json({ erro: 'Erro ao atualizar' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor da Sunny Wear rodando na porta ${PORT}`);
});