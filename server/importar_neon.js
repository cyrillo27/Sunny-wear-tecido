/*
 * Copia o backup do banco antigo (arquivo .json gerado por exportar_render.py)
 * para o banco novo (Neon).
 *
 * Como usar (no terminal, dentro da pasta SunnyWearTecidos):
 *   1) python exportar_render.py                 -> gera exportacao/movimentacoes_AAAA-MM-DD.json
 *   2) Teste sem gravar nada:
 *        node server/importar_neon.js exportacao/movimentacoes_AAAA-MM-DD.json --simular
 *   3) Gravar no Neon (o endereço do banco fica só no seu terminal, nunca no código):
 *        PowerShell:  $env:DATABASE_URL="COLE_AQUI_O_ENDERECO_DO_NEON"
 *        node server/importar_neon.js exportacao/movimentacoes_AAAA-MM-DD.json
 *
 * Segurança: se o banco novo já tiver registros, o script para e não grava nada.
 * Tudo é gravado numa única transação: ou copia tudo, ou não copia nada.
 */
const fs = require('fs');
const { Pool } = require('pg');

const COLUNAS = ['id', 'tipomovimento', 'codigo', 'nome', 'cor', 'localizacao', 'metros', 'quantidade', 'unidademedida',
  'preco', 'estoqueminimo', 'notafiscal', 'fornecedor', 'foto', 'data', 'largura'];

const CRIAR_TABELA = `
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
  )`;

// Datas vêm como "2026-11-04T00:00:00.000Z"; o banco guarda só o dia
const soDia = (v) => (v ? String(v).split('T')[0] : null);
const numero = (v) => (v === null || v === undefined || v === '' ? null : Number(v));

const prepararLinha = (r) => ({
  id: Number(r.id),
  tipomovimento: r.tipomovimento ?? null,
  codigo: r.codigo ?? null,
  nome: r.nome ?? null,
  cor: r.cor ?? null,
  localizacao: r.localizacao ?? null,
  metros: numero(r.metros),
  quantidade: numero(r.quantidade),
  unidademedida: r.unidademedida ?? null,
  preco: numero(r.preco),
  estoqueminimo: numero(r.estoqueminimo),
  notafiscal: r.notafiscal ?? null,
  fornecedor: r.fornecedor ?? null,
  foto: r.foto ?? null,
  data: soDia(r.data),
  largura: numero(r.largura),
});

const resumo = (linhas) => {
  const porTipo = {};
  let total = 0;
  for (const l of linhas) {
    porTipo[l.tipomovimento || '(vazio)'] = (porTipo[l.tipomovimento || '(vazio)'] || 0) + 1;
    total += Number(l.quantidade || 0);
  }
  return { registros: linhas.length, porTipo, somaQuantidades: Math.round(total * 1000) / 1000,
    comFoto: linhas.filter((l) => l.foto).length };
};

async function main() {
  const arquivo = process.argv[2];
  const simular = process.argv.includes('--simular');
  if (!arquivo || !fs.existsSync(arquivo)) {
    console.error('Informe o arquivo de backup .json. Ex: node server/importar_neon.js exportacao/movimentacoes_2026-11-11.json');
    process.exit(1);
  }

  const dados = JSON.parse(fs.readFileSync(arquivo, 'utf8'));
  if (!Array.isArray(dados) || dados.length === 0) {
    console.error('O arquivo não tem registros.');
    process.exit(1);
  }
  const linhas = dados.map(prepararLinha);
  const semId = linhas.filter((l) => !Number.isInteger(l.id));
  if (semId.length) {
    console.error(`${semId.length} registro(s) sem id válido no backup. Nada foi gravado.`);
    process.exit(1);
  }
  if (dados.some((r) => typeof r.foto === 'string' && r.foto.startsWith('/api/'))) {
    console.error('Este backup tem só o endereço das fotos, não as fotos. Gere o backup com o servidor antigo (main).');
    process.exit(1);
  }

  console.log('Backup lido:', resumo(linhas));
  if (simular) {
    console.log('Modo --simular: nada foi gravado.');
    return;
  }

  if (!process.env.DATABASE_URL) {
    console.error('Defina DATABASE_URL com o endereço do Neon antes de rodar (veja as instruções no topo do arquivo).');
    process.exit(1);
  }

  const url = process.env.DATABASE_URL;
  const pool = new Pool({ connectionString: url, ssl: /sslmode=disable/i.test(url) ? false : { rejectUnauthorized: false } });
  const cliente = await pool.connect();
  try {
    await cliente.query(CRIAR_TABELA);
    await cliente.query('ALTER TABLE movimentacoes ADD COLUMN IF NOT EXISTS largura NUMERIC');
    const existentes = Number((await cliente.query('SELECT COUNT(*) AS n FROM movimentacoes')).rows[0].n);
    if (existentes > 0) {
      console.error(`O banco novo já tem ${existentes} registro(s). Para não duplicar nada, a cópia foi cancelada.`);
      process.exitCode = 1;
      return;
    }

    await cliente.query('BEGIN');
    const lista = COLUNAS.join(', ');
    const marcadores = COLUNAS.map((_, i) => `$${i + 1}`).join(', ');
    for (const [i, l] of linhas.entries()) {
      await cliente.query(`INSERT INTO movimentacoes (${lista}) VALUES (${marcadores})`, COLUNAS.map((c) => l[c]));
      if ((i + 1) % 100 === 0) console.log(`  ${i + 1} de ${linhas.length}...`);
    }
    // Próximos cadastros continuam a partir do maior id copiado
    await cliente.query("SELECT setval(pg_get_serial_sequence('movimentacoes', 'id'), (SELECT MAX(id) FROM movimentacoes))");
    await cliente.query('COMMIT');

    const conferencia = (await cliente.query(`SELECT ${COLUNAS.join(', ')} FROM movimentacoes`)).rows;
    const antes = resumo(linhas);
    const depois = resumo(conferencia);
    console.log('Gravado no Neon:', depois);
    if (JSON.stringify(antes) === JSON.stringify(depois)) {
      console.log('✅ Conferência OK: o banco novo tem exatamente os mesmos registros do backup.');
    } else {
      console.error('⚠️ A conferência encontrou diferença entre o backup e o banco novo. Não publique ainda; me avise.');
      process.exitCode = 1;
    }
  } catch (erro) {
    await cliente.query('ROLLBACK').catch(() => {});
    console.error('❌ Erro, nada foi gravado:', erro.message);
    process.exitCode = 1;
  } finally {
    cliente.release();
    await pool.end();
  }
}

main();
