const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Conexão com o Banco PostgreSQL do Render
const pool = new Pool({
  connectionString: 'postgresql://sunny_wear_db_user:cR7F6qgCzl3pCQHK8yoQNFQ4bV35sJZb@dpg-da1h0i8jo6nc738lo100-a.oregon-postgres.render.com/sunny_wear_db',
  ssl: {
    rejectUnauthorized: false
  }
});

// Criar a tabela 'movimentacoes' automaticamente se ela não existir
pool.query(`
  CREATE TABLE IF NOT EXISTS movimentacoes (
    id SERIAL PRIMARY KEY,
    tipoMovimento VARCHAR(50),
    codigo VARCHAR(100),
    nome VARCHAR(255),
    cor VARCHAR(100),
    localizacao VARCHAR(255),
    metros NUMERIC,
    foto TEXT,
    data VARCHAR(50)
  )
`).then(() => {
  console.log('📦 Tabela "movimentacoes" verificada/criada com sucesso no banco!');
}).catch(err => console.error('Erro ao criar tabela:', err));

// Rota GET: Buscar todas as movimentações
app.get('/api/movimentacoes', async (req, res) => {
  try {
    const resultado = await pool.query('SELECT * FROM movimentacoes ORDER BY id DESC');
    res.json(resultado.rows);
  } catch (erro) {
    console.error('Erro ao buscar dados:', erro);
    res.status(500).json({ erro: 'Erro ao buscar dados do banco' });
  }
});

// Rota POST: Inserir nova movimentação (Entrada ou Saída)
app.post('/api/movimentacoes', async (req, res) => {
  const { tipoMovimento, codigo, nome, cor, localizacao, metros, foto, data } = req.body;
  try {
    const query = `
      INSERT INTO movimentacoes (tipoMovimento, codigo, nome, cor, localizacao, metros, foto, data)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *
    `;
    const valores = [tipoMovimento, codigo, nome, cor, localizacao, metros, foto, data || new Date().toISOString().split('T')[0]];
    const novoRegistro = await pool.query(query, valores);
    res.status(201).json(novoRegistro.rows[0]);
  } catch (erro) {
    console.error('Erro ao inserir:', erro);
    res.status(500).json({ erro: 'Erro ao salvar no banco' });
  }
});

// Rota DELETE: Apagar registro
app.delete('/api/movimentacoes/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM movimentacoes WHERE id = $1', [id]);
    res.json({ mensagem: 'Deletado com sucesso' });
  } catch (erro) {
    console.error('Erro ao deletar:', erro);
    res.status(500).json({ erro: 'Erro ao deletar' });
  }
});

// Rota PUT: Atualizar/Editar registro
app.put('/api/movimentacoes/:id', async (req, res) => {
  const { id } = req.params;
  const { tipoMovimento, codigo, nome, cor, localizacao, metros, foto } = req.body;
  try {
    const query = `
      UPDATE movimentacoes 
      SET tipoMovimento = $1, codigo = $2, nome = $3, cor = $4, localizacao = $5, metros = $6, foto = $7
      WHERE id = $8 RETURNING *
    `;
    const valores = [tipoMovimento, codigo, nome, cor, localizacao, metros, foto, id];
    const atualizado = await pool.query(query, valores);
    res.json(atualizado.rows[0]);
  } catch (erro) {
    console.error('Erro ao atualizar:', erro);
    res.status(500).json({ erro: 'Erro ao atualizar' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor da Sunny Wear rodando na porta ${PORT}`);
});