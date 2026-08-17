const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' })); // Permite imagens em Base64 grandes

// Configuração da conexão com o PostgreSQL
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'sunny_wear', // Altere se o nome do seu banco for diferente
  password: 'sua_senha',  // Coloque a sua senha do PostgreSQL aqui
  port: 5432,
});

// Rota para buscar todas as movimentações
app.get('/api/movimentacoes', async (req, res) => {
  try {
    const resultado = await pool.query('SELECT * FROM movimentacoes ORDER BY id DESC');
    res.json(resultado.rows);
  } catch (erro) {
    console.error('Erro ao buscar movimentações:', erro);
    res.status(500).json({ erro: 'Erro ao buscar dados no banco' });
  }
});

// Rota para cadastrar nova movimentação (com blindagem de tipo e estoque mínimo)
app.post('/api/movimentacoes', async (req, res) => {
  let { tipoMovimento, codigo, nome, cor, localizacao, quantidade, metros, unidadeMedida, preco, estoqueMinimo, estoqueminimo, notaFiscal, notafiscal, fornecedor, foto, data } = req.body;
  
  // Força rigidamente para 'entrada' ou 'saida'
  const tipoFinal = tipoMovimento === 'saida' ? 'saida' : 'entrada';
  
  const qtdFinal = Number(quantidade || metros || 0);
  const precoFinal = Number(preco || 0);
  const minFinal = Number(estoqueminimo || estoqueMinimo || 0);
  const unidadeFinal = unidadeMedida || 'm';
  const nfFinal = notafiscal || notaFiscal || '';
  const fornFinal = fornecedor || '';

  try {
    const query = `
      INSERT INTO movimentacoes (tipomovimento, codigo, nome, cor, localizacao, metros, quantidade, unidademedida, preco, estoqueminimo, notafiscal, fornecedor, foto, data)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) RETURNING *
    `;
    const valores = [
      tipoFinal, codigo, nome, cor, localizacao, 
      qtdFinal, qtdFinal, unidadeFinal, 
      precoFinal, minFinal, nfFinal, fornFinal, 
      foto, data || new Date().toISOString().split('T')[0]
    ];
    const novoRegistro = await pool.query(query, valores);
    console.log(`✅ Salvo com sucesso como: [${tipoFinal.toUpperCase()}] | Mínimo: ${minFinal}`);
    res.status(201).json(novoRegistro.rows[0]);
  } catch (erro) {
    console.error('Erro ao inserir:', erro);
    res.status(500).json({ erro: 'Erro ao salvar no banco' });
  }
});

// Rota para atualizar uma movimentação (Corrigido para salvar colunas em minúsculo)
app.put('/api/movimentacoes/:id', async (req, res) => {
  const { id } = req.params;
  let { tipoMovimento, codigo, nome, cor, localizacao, quantidade, metros, unidadeMedida, preco, estoqueMinimo, estoqueminimo, notaFiscal, notafiscal, fornecedor, foto } = req.body;
  
  const tipoFinal = tipoMovimento === 'saida' ? 'saida' : 'entrada';
  const qtdFinal = Number(quantidade || metros || 0);
  const precoFinal = Number(preco || 0);
  const minFinal = Number(estoqueminimo || estoqueMinimo || 0);
  const unidadeFinal = unidadeMedida || 'm';
  const nfFinal = notafiscal || notaFiscal || '';
  const fornFinal = fornecedor || '';

  try {
    const query = `
      UPDATE movimentacoes 
      SET tipomovimento = $1, codigo = $2, nome = $3, cor = $4, localizacao = $5, metros = $6, quantidade = $7, unidademedida = $8, preco = $9, estoqueminimo = $10, notafiscal = $11, fornecedor = $12, foto = $13
      WHERE id = $14 RETURNING *
    `;
    const valores = [
      tipoFinal, codigo, nome, cor, localizacao, 
      qtdFinal, qtdFinal, unidadeFinal, 
      precoFinal, minFinal, nfFinal, fornFinal, 
      foto, id
    ];
    const atualizado = await pool.query(query, valores);
    console.log(`✅ Registro ${id} atualizado com sucesso! Mínimo salvo: ${minFinal}`);
    res.json(atualizado.rows[0]);
  } catch (erro) {
    console.error('Erro ao atualizar:', erro);
    res.status(500).json({ erro: 'Erro ao atualizar no banco' });
  }
});

// Rota para deletar uma movimentação
app.delete('/api/movimentacoes/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM movimentacoes WHERE id = $1', [id]);
    res.json({ mensagem: 'Deletado com sucesso' });
  } catch (erro) {
    console.error('Erro ao deletar:', erro);
    res.status(500).json({ erro: 'Erro ao deletar do banco' });
  }
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});