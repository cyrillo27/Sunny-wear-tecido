const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Configuração da conexão com o PostgreSQL no Render
const pool = new Pool({
  connectionString: 'postgresql://sunny_wear_estoque_limpo_user:WgYh1oAWvQtV7c0aeswEOrbjqKaAKXgg@dpg-da1l8tjl550s7395ttu0-a.oregon-postgres.render.com/sunny_wear_estoque_limpo',
  ssl: {
    rejectUnauthorized: false
  }
});

// Rota para buscar todas com log de depuração
app.get('/api/movimentacoes', async (req, res) => {
  try {
    const resultado = await pool.query('SELECT * FROM movimentacoes ORDER BY id DESC');
    
    // Log para ver o primeiro item que vem do Render
    if (resultado.rows.length > 0) {
      console.log("🔍 [GET] Exemplo de registro vindo do Render - ID:", resultado.rows[0].id, "| Estoque Mínimo no Banco:", resultado.rows[0].estoqueminimo);
    }

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

// Rota para atualizar com log detalhado
app.put('/api/movimentacoes/:id', async (req, res) => {
  const { id } = req.params;
  let { tipoMovimento, codigo, nome, cor, localizacao, quantidade, metros, unidadeMedida, preco, estoqueMinimo, estoqueminimo, notaFiscal, notafiscal, fornecedor, foto } = req.body;
  
  const tipoFinal = tipoMovimento === 'saida' ? 'saida' : 'entrada';
  const qtdFinal = parseFloat(String(quantidade || metros || 0).replace(',', '.')) || 0;
  const precoFinal = parseFloat(String(preco || 0).replace(',', '.')) || 0;
  
  // Captura o valor exato enviado
  let minFinal = Number(estoqueminimo !== undefined && estoqueminimo !== '' ? estoqueminimo : (estoqueMinimo !== undefined && estoqueMinimo !== '' ? estoqueMinimo : 0));

  console.log(`📥 [PUT ID ${id}] Código: "${codigo}" | Valor recebido para Estoque Mínimo:`, minFinal);

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

    console.log(`✅ [PUT ID ${id}] Salvo no banco com sucesso! Novo valor gravado:`, atualizado.rows[0].estoqueminimo);

    // Sincroniza globalmente para todas as linhas com o mesmo código
    if (minFinal > 0 && codigo) {
      const syncRes = await pool.query(
        'UPDATE movimentacoes SET estoqueminimo = $1 WHERE LOWER(TRIM(codigo)) = LOWER(TRIM($2))',
        [minFinal, codigo]
      );
      console.log(`🔄 [SYNC] Linhas atualizadas com o código "${codigo}":`, syncRes.rowCount);
    }

    res.json(atualizado.rows[0]);
  } catch (erro) {
    console.error('❌ Erro ao atualizar:', erro.message);
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

const PORT = 3001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});