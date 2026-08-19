import React, { useState, useEffect } from 'react';

const SunnyWearTecidos = () => {
  const [autenticado, setAutenticado] = useState(() => {
    return localStorage.getItem('sunny_auth') === 'true';
  });

  const [usuarioInput, setUsuarioInput] = useState('');
  const [senhaInput, setSenhaInput] = useState('');
  const [erroLogin, setErroLogin] = useState('');

  const [abaAtiva, setAbaAtiva] = useState('dashboard');
  const [movimentacoes, setMovimentacoes] = useState([]);
  const [carregando, setCarregando] = useState(false);

  const [fotoSelecionada, setFotoSelecionada] = useState(null);
  const [idEditando, setIdEditando] = useState(null);
  const [unidadeGrafico, setUnidadeGrafico] = useState('Metros (m)');

  const [form, setForm] = useState({
    tipoMovimento: 'entrada',
    codigo: '',
    nome: '',
    cor: '',
    localizacao: '',
    quantidade: '',
    metros: '',
    unidadeMedida: 'm',
    preco: '',
    estoqueMinimo: '',
    notaFiscal: '',
    fornecedor: '',
    foto: '',
    largura: ''
  });

  const [formOp, setFormOp] = useState({
    numeroOp: '',
    termoBusca: '',
    quantidade: ''
  });
  const [idEditandoOp, setIdEditandoOp] = useState(null);
  const [buscaOp, setBuscaOp] = useState('');

  const [termoBuscaSaida, setTermoBuscaSaida] = useState('');
  const [busca, setBusca] = useState('');

  const API_URL = 'https://sunny-wear-tecido.onrender.com/api/movimentacoes';

  const obterMinimo = (item) => {
    return Number(item?.estoqueminimo || item?.estoqueMinimo || item?.estoque_minimo || 0);
  };
  
  const obterTipo = (item) => {
    const fornecedor = (item?.fornecedor || '').toLowerCase().trim();
    if (fornecedor === 'ordem de produção') {
      return 'op';
    }
    return item?.tipomovimento || item?.tipoMovimento || 'entrada';
  };

  const carregarDadosDoServidor = async () => {
    try {
      const resposta = await fetch(`${API_URL}?_t=${Date.now()}`);
      if (resposta.ok) {
        const dados = await resposta.json();
        if (Array.isArray(dados)) {
          setMovimentacoes(dados);
        } else {
          setMovimentacoes([]);
        }
      } else {
        setMovimentacoes([]);
      }
    } catch (erro) {
      console.error('Erro ao conectar com o back-end:', erro);
      setMovimentacoes([]);
    }
  };

  useEffect(() => {
    if (autenticado) {
      carregarDadosDoServidor();
      const intervalo = setInterval(carregarDadosDoServidor, 5000);
      return () => clearInterval(intervalo);
    }
  }, [autenticado]);

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const resposta = await fetch('https://sunny-wear-tecido.onrender.com/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuario: usuarioInput, senha: senhaInput })
      });
      const dados = await resposta.json();

      if (resposta.ok && dados.sucesso) {
        setAutenticado(true);
        localStorage.setItem('sunny_auth', 'true');
        setErroLogin('');
      } else {
        setErroLogin(dados.erro || 'Credenciais inválidas. Verifique os dados.');
      }
    } catch (erro) {
      setErroLogin('Falha na comunicação com o servidor.');
    }
  };

  const handleLogout = () => {
    setAutenticado(false);
    localStorage.removeItem('sunny_auth');
    setUsuarioInput('');
    setSenhaInput('');
  };

  const handleFotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setForm((prev) => ({ ...prev, foto: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const executarBuscaSaida = () => {
    const termo = termoBuscaSaida.toLowerCase().trim();
    if (!termo) {
      alert('Informe um código ou nome para realizar a busca.');
      return;
    }
    const listaSegura = Array.isArray(movimentacoes) ? movimentacoes : [];
    const tecidoEncontrado = listaSegura.find(
      m => (m?.codigo && m.codigo.toLowerCase().includes(termo)) || 
           (m?.nome && m.nome.toLowerCase().includes(termo))
    );

    if (tecidoEncontrado) {
      const minEncontrado = obterMinimo(tecidoEncontrado) !== 0 ? obterMinimo(tecidoEncontrado) : '';
      setForm(prev => ({
        ...prev,
        tipoMovimento: 'saida',
        codigo: tecidoEncontrado.codigo || termoBuscaSaida,
        nome: tecidoEncontrado.nome || '',
        cor: tecidoEncontrado.cor || '',
        localizacao: tecidoEncontrado.localizacao || '',
        unidadeMedida: tecidoEncontrado.unidademedida || tecidoEncontrado.unidadeMedida || 'm',
        preco: tecidoEncontrado.preco || '',
        estoqueMinimo: minEncontrado,
        notaFiscal: tecidoEncontrado.notafiscal || tecidoEncontrado.notaFiscal || '',
        fornecedor: tecidoEncontrado.fornecedor || '',
        foto: tecidoEncontrado.foto || '',
        largura: tecidoEncontrado.largura || ''
      }));
      alert(`✅ Item localizado: ${tecidoEncontrado.nome} (Cód: ${tecidoEncontrado.codigo})`);
    } else {
      alert('⚠️ Nenhum registro correspondente encontrado.');
      setForm(prev => ({
        ...prev,
        tipoMovimento: 'saida',
        codigo: termoBuscaSaida,
        nome: termoBuscaSaida
      }));
    }
  };

  const salvarOp = async (e) => {
    e.preventDefault();
    if (!formOp.numeroOp || !formOp.termoBusca || !formOp.quantidade) {
      alert('Preencha o Número da OP, o Tecido e a Quantidade.');
      return;
    }

    const termo = formOp.termoBusca.toLowerCase().trim();
    const listaSegura = Array.isArray(movimentacoes) ? movimentacoes : [];
    const tecidoEncontrado = listaSegura.find(
      m => (m?.codigo && m.codigo.toLowerCase().includes(termo)) || 
           (m?.nome && m.nome.toLowerCase().includes(termo))
    );

    const codigoFinal = tecidoEncontrado ? tecidoEncontrado.codigo : termo.toUpperCase();
    const nomeFinal = tecidoEncontrado ? tecidoEncontrado.nome : 'Tecido Reservado (OP)';
    const corFinal = tecidoEncontrado ? tecidoEncontrado.cor : 'N/D';
    const larguraFinal = tecidoEncontrado ? tecidoEncontrado.largura : '';
    const unidadeFinal = tecidoEncontrado ? (tecidoEncontrado.unidademedida || tecidoEncontrado.unidadeMedida || 'm') : 'm';
    const precoFinal = tecidoEncontrado ? tecidoEncontrado.preco : 0;

    const dadosOp = {
      tipoMovimento: 'op',
      codigo: codigoFinal,
      nome: nomeFinal,
      cor: corFinal,
      localizacao: '',
      quantidade: formOp.quantidade,
      metros: formOp.quantidade,
      unidadeMedida: unidadeFinal,
      preco: precoFinal,
      estoqueMinimo: 0,
      estoqueminimo: 0,
      notaFiscal: formOp.numeroOp,
      notafiscal: formOp.numeroOp,
      fornecedor: 'Ordem de Produção',
      foto: tecidoEncontrado ? tecidoEncontrado.foto : '',
      largura: larguraFinal,
      data: new Date().toISOString().split('T')[0]
    };

    setCarregando(true);
    try {
      let resposta;
      if (idEditandoOp) {
        resposta = await fetch(`${API_URL}/${encodeURIComponent(idEditandoOp)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(dadosOp)
        });
      } else {
        resposta = await fetch(API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(dadosOp)
        });
      }

      if (resposta.ok) {
        alert(idEditandoOp ? 'OP atualizada com sucesso!' : '📋 OP cadastrada e estoque reservado com sucesso!');
        setFormOp({ numeroOp: '', termoBusca: '', quantidade: '' });
        setIdEditandoOp(null);
        await carregarDadosDoServidor();
      } else {
        alert('Erro ao salvar a OP no servidor.');
      }
    } catch (erro) {
      console.error('Erro de conexão:', erro);
      alert('Erro de conexão com o servidor central.');
    } finally {
      setCarregando(false);
    }
  };

  const iniciarEdicaoOp = (item) => {
    setIdEditandoOp(item.id);
    setFormOp({
      numeroOp: item.notafiscal || item.notaFiscal || '',
      termoBusca: item.codigo || item.nome || '',
      quantidade: item.quantidade || item.metros || ''
    });
  };

  const registrarOuAtualizarMovimento = async (e) => {
    e.preventDefault();
    const qtdValida = form.quantidade || form.metros;
    if (!form.codigo || !form.nome || !form.cor || !form.localizacao || !qtdValida) return;

    const tipoFinal = abaAtiva === 'entrada' ? 'entrada' : 'saida';
    let minFinal = form.estoqueMinimo !== '' && form.estoqueMinimo !== null ? Number(form.estoqueMinimo) : 0;

    const dadosParaEnviar = {
      ...form,
      tipoMovimento: tipoFinal,
      quantidade: qtdValida,
      metros: qtdValida,
      estoqueMinimo: minFinal,
      estoqueminimo: minFinal
    };

    setCarregando(true);
    try {
      let resposta;
      if (idEditando) {
        resposta = await fetch(`${API_URL}/${encodeURIComponent(idEditando)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(dadosParaEnviar)
        });
      } else {
        resposta = await fetch(API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(dadosParaEnviar)
        });
      }

      if (resposta.ok) {
        alert(idEditando ? 'Registro atualizado com sucesso!' : 'Lançamento efetuado com sucesso!');
        setForm({ tipoMovimento: 'entrada', codigo: '', nome: '', cor: '', localizacao: '', quantidade: '', metros: '', unidadeMedida: 'm', preco: '', estoqueMinimo: '', notaFiscal: '', fornecedor: '', foto: '', largura: '' });
        setTermoBuscaSaida('');
        setIdEditando(null);
        await carregarDadosDoServidor();
        setAbaAtiva('historico');
      } else {
        const erroServidor = await resposta.json().catch(() => ({}));
        alert('Erro ao processar requisição: ' + (erroServidor.erro || resposta.statusText));
      }
    } catch (erro) {
      console.error('Erro de conexão:', erro);
      alert('Erro de conexão com o servidor central.');
    } finally {
      setCarregando(false);
    }
  };

  const iniciarEdicao = (item) => {
    if (!item || item.id === undefined || item.id === null) {
      alert('Erro: ID do registro inválido.');
      return;
    }
    setIdEditando(item.id);
    const qtdItem = item.quantidade || item.metros || '';
    const minItem = Number(item.estoqueminimo !== undefined ? item.estoqueminimo : (item.estoqueMinimo !== undefined ? item.estoqueMinimo : 0));
    const tipoItem = obterTipo(item);
    
    setForm({
      tipoMovimento: tipoItem,
      codigo: item.codigo || '',
      nome: item.nome || '',
      cor: item.cor || '',
      localizacao: item.localizacao || '',
      quantidade: qtdItem,
      metros: qtdItem,
      unidadeMedida: item.unidademedida || item.unidadeMedida || 'm',
      preco: item.preco || '',
      estoqueMinimo: minItem !== 0 ? minItem : '',
      notaFiscal: item.notafiscal || item.notaFiscal || '',
      fornecedor: item.fornecedor || '',
      foto: item.foto || '',
      largura: item.largura || ''
    });
    setTermoBuscaSaida(item.codigo || '');
    setAbaAtiva(tipoItem === 'saida' ? 'saida' : 'entrada');
  };

  const deletarItem = async (id) => {
    if (!window.confirm('Confirma a exclusão definitiva deste registro do sistema?')) return;

    try {
      const resposta = await fetch(`${API_URL}/${encodeURIComponent(id)}`, {
        method: 'DELETE'
      });

      if (resposta.ok) {
        alert('Registro excluído com sucesso.');
        carregarDadosDoServidor();
      } else {
        alert('Erro ao excluir o registro.');
      }
    } catch (erro) {
      console.error('Erro de conexão:', erro);
      alert('Erro de conexão com o servidor.');
    }
  };

  const tecidosConsolidados = {};
  const usoTecidos = {};
  const listaSeguraCalculos = Array.isArray(movimentacoes) ? movimentacoes : [];

  listaSeguraCalculos.forEach(m => {
    if (!m || !m.codigo) return;
    const cod = m.codigo.toLowerCase();
    const qtd = Number(m.metros || m.quantidade || 0);
    const minReg = obterMinimo(m);
    const tipoM = obterTipo(m);

    if (!tecidosConsolidados[cod]) {
      tecidosConsolidados[cod] = {
        codigo: m.codigo,
        nome: m.nome,
        minimo: minReg,
        unidade: m.unidademedida || m.unidadeMedida || 'm',
        total: 0
      };
    }

    if (tipoM === 'entrada') {
      tecidosConsolidados[cod].total += qtd;
    } else if (tipoM === 'saida' || tipoM === 'op') {
      tecidosConsolidados[cod].total -= qtd;
    }

    if (!usoTecidos[cod]) {
      usoTecidos[cod] = { nome: m.nome || 'Tecido', codigo: m.codigo, cor: m.cor || 'N/D', totalUso: 0, unidade: m.unidademedida || m.unidadeMedida || 'm' };
    }
    if (tipoM === 'saida' || tipoM === 'op') {
      usoTecidos[cod].totalUso += qtd;
    }

    if (minReg > 0) tecidosConsolidados[cod].minimo = minReg;
  });

  const alertasEstoqueBaixo = Object.values(tecidosConsolidados).filter(t => t.minimo > 0 && t.total < t.minimo);

  const topTecidosMaisUsados = Object.values(usoTecidos)
    .filter(t => t.totalUso > 0)
    .sort((a, b) => b.totalUso - a.totalUso)
    .slice(0, 5);

  const maxUsoTop = topTecidosMaisUsados.length > 0 ? Math.max(...topTecidosMaisUsados.map(t => t.totalUso)) : 100;

  const entradasMetros = listaSeguraCalculos
    .filter(m => obterTipo(m) === 'entrada' && (m?.unidademedida === 'm' || m?.unidadeMedida === 'm' || !m?.unidademedida))
    .reduce((acc, m) => acc + Number(m.metros || m.quantidade || 0), 0);

  const entradasKg = listaSeguraCalculos
    .filter(m => obterTipo(m) === 'entrada' && (m?.unidademedida === 'kg' || m?.unidadeMedida === 'kg'))
    .reduce((acc, m) => acc + Number(m.metros || m.quantidade || 0), 0);

  const saidasMetros = listaSeguraCalculos
    .filter(m => (obterTipo(m) === 'saida' || obterTipo(m) === 'op') && (m?.unidademedida === 'm' || m?.unidadeMedida === 'm' || !m?.unidademedida))
    .reduce((acc, m) => acc + Number(m.metros || m.quantidade || 0), 0);

  const saidasKg = listaSeguraCalculos
    .filter(m => (obterTipo(m) === 'saida' || obterTipo(m) === 'op') && (m?.unidademedida === 'kg' || m?.unidadeMedida === 'kg'))
    .reduce((acc, m) => acc + Number(m.metros || m.quantidade || 0), 0);

  const estoqueMetros = entradasMetros - saidasMetros;
  const estoqueKg = entradasKg - saidasKg;

  // LÓGICA DINÂMICA DA EVOLUÇÃO DO ESTOQUE (ÚLTIMOS 7 DIAS)
  const diasEvolucao = [];
  const dadosEvolucaoMetros = [];
  const dadosEvolucaoKg = [];

  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dataStrYYYYMMDD = d.toISOString().split('T')[0];
    const diaMesFormatado = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
    diasEvolucao.push(diaMesFormatado);

    let mTotal = 0;
    let kgTotal = 0;

    listaSeguraCalculos.forEach(m => {
      const mData = (m.data || '').split('T')[0];
      if (mData && mData <= dataStrYYYYMMDD) {
        const qtd = Number(m.metros || m.quantidade || 0);
        const un = (m.unidademedida || m.unidadeMedida || 'm').toLowerCase();
        const tipoM = obterTipo(m);

        if (tipoM === 'entrada') {
          if (un === 'kg') kgTotal += qtd;
          else mTotal += qtd;
        } else if (tipoM === 'saida' || tipoM === 'op') {
          if (un === 'kg') kgTotal -= qtd;
          else mTotal -= qtd;
        }
      }
    });

    dadosEvolucaoMetros.push(mTotal);
    dadosEvolucaoKg.push(kgTotal);
  }

  const valoresGraficoAtual = unidadeGrafico.includes('Quilos') ? dadosEvolucaoKg : dadosEvolucaoMetros;
  const maxValGrafico = Math.max(...valoresGraficoAtual, 10);
  const getX = (idx) => 50 + idx * 80;
  const getY = (val) => {
    const minY = 20;
    const maxY = 140;
    const ratio = val / maxValGrafico;
    return maxY - ratio * (maxY - minY);
  };
  const pontosPath = valoresGraficoAtual.map((val, idx) => `${idx === 0 ? 'M' : 'L'} ${getX(idx)},${getY(val)}`).join(' ');
  const areaPath = `${pontosPath} L ${getX(6)},160 L ${getX(0)},160 Z`;

  const porLocalizacao = listaSeguraCalculos.reduce((acc, m) => {
    if (!m) return acc;
    const loc = m.localizacao || 'Não definido';
    if (!acc[loc]) acc[loc] = { m: 0, kg: 0 };
    const qtd = Number(m.metros || m.quantidade || 0);
    const unidade = m.unidademedida || m.unidadeMedida || 'm';
    const tipoM = obterTipo(m);
    
    if (tipoM === 'entrada') {
      acc[loc][unidade] += qtd;
    } else if (tipoM === 'saida' || tipoM === 'op') {
      acc[loc][unidade] -= qtd;
    }
    return acc;
  }, {});

  const movFiltradas = listaSeguraCalculos.filter(m => {
    if (!m || obterTipo(m) === 'op') return false; 
    const termo = busca.toLowerCase();
    const codigo = (m.codigo || '').toLowerCase();
    const nome = (m.nome || '').toLowerCase();
    const cor = (m.cor || '').toLowerCase();
    const localizacao = (m.localizacao || '').toLowerCase();
    const fornecedor = (m.fornecedor || '').toLowerCase();
    const notaFiscal = (m.notafiscal || m.notaFiscal || '').toLowerCase();
    return codigo.includes(termo) || nome.includes(termo) || cor.includes(termo) || localizacao.includes(termo) || fornecedor.includes(termo) || notaFiscal.includes(termo);
  });

  const opsFiltradas = listaSeguraCalculos.filter(m => {
    if (!m || obterTipo(m) !== 'op') return false;
    const termo = buscaOp.toLowerCase();
    const numOp = (m.notafiscal || m.notaFiscal || '').toLowerCase();
    const codigo = (m.codigo || '').toLowerCase();
    const nome = (m.nome || '').toLowerCase();
    return numOp.includes(termo) || codigo.includes(termo) || nome.includes(termo);
  });

  if (!autenticado) {
    return (
      <div style={styles.loginContainer}>
        <div style={styles.loginCard}>
          <div style={{ textAlign: 'center', marginBottom: '28px' }}>
            <div style={styles.logoBadge}>SW</div>
            <h1 style={{ color: '#0F172A', margin: '0 0 6px 0', fontSize: '24px', fontWeight: '800', letterSpacing: '-0.5px' }}>Sunny Wear</h1>
            <p style={{ color: '#2563EB', fontSize: '12px', margin: 0, fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px' }}>Cyber-Textile Intelligence</p>
          </div>
          
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div>
              <label style={styles.loginLabel}>Identificação de Usuário</label>
              <input 
                type="text" 
                placeholder="Ex: admin" 
                value={usuarioInput} 
                onChange={(e) => setUsuarioInput(e.target.value)} 
                style={styles.input}
                required
              />
            </div>
            <div>
              <label style={styles.loginLabel}>Chave de Acesso</label>
              <input 
                type="password" 
                placeholder="••••••••" 
                value={senhaInput} 
                onChange={(e) => setSenhaInput(e.target.value)} 
                style={styles.input}
                required
              />
            </div>
            {erroLogin && <div style={styles.errorBox}>{erroLogin}</div>}
            <button type="submit" style={styles.loginButton}>Inicializar Sistema</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.appLayout}>
      {/* SIDEBAR ESQUERDA ESTILIZADA */}
      <aside style={styles.sidebar}>
        <div style={styles.sidebarHeader}>
          <div style={styles.logoBadge}>SW</div>
          <div>
            <h2 style={styles.sidebarTitle}>Sunny Wear</h2>
            <span style={styles.versionBadge}>v2.5 GLASS</span>
          </div>
        </div>

        <div style={styles.sidebarNavGroup}>
          <button 
            onClick={() => setAbaAtiva('dashboard')} 
            style={{ ...styles.sidebarLink, ...(abaAtiva === 'dashboard' ? styles.sidebarLinkActive : {}) }}
          >
            📊 Visão Geral
          </button>
          <button 
            onClick={() => { setIdEditando(null); setForm({ tipoMovimento: 'entrada', codigo: '', nome: '', cor: '', localizacao: '', quantidade: '', metros: '', unidadeMedida: 'm', preco: '', estoqueMinimo: '', notaFiscal: '', fornecedor: '', foto: '', largura: '' }); setTermoBuscaSaida(''); setAbaAtiva('entrada'); }} 
            style={{ ...styles.sidebarLink, ...(abaAtiva === 'entrada' ? styles.sidebarLinkActive : {}) }}
          >
            📥 Registrar Entrada
          </button>
          <button 
            onClick={() => { setIdEditandoOp(null); setFormOp({ numeroOp: '', termoBusca: '', quantidade: '' }); setAbaAtiva('op'); }} 
            style={{ ...styles.sidebarLink, ...(abaAtiva === 'op' ? styles.sidebarLinkActive : {}) }}
          >
            📋 Ordens de Produção
          </button>
          <button 
            onClick={() => { setIdEditando(null); setForm({ tipoMovimento: 'saida', codigo: '', nome: '', cor: '', localizacao: '', quantidade: '', metros: '', unidadeMedida: 'm', preco: '', estoqueMinimo: '', notaFiscal: '', fornecedor: '', foto: '', largura: '' }); setTermoBuscaSaida(''); setAbaAtiva('saida'); }} 
            style={{ ...styles.sidebarLink, ...(abaAtiva === 'saida' ? styles.sidebarLinkActive : {}) }}
          >
            📤 Registrar Saída
          </button>
          <button 
            onClick={() => setAbaAtiva('historico')} 
            style={{ ...styles.sidebarLink, ...(abaAtiva === 'historico' ? styles.sidebarLinkActive : {}) }}
          >
            🔍 Consulta & Galpões
          </button>
        </div>

        {/* BOTÃO DE FINALIZAR SESSÃO NA BASE DA SIDEBAR */}
        <div style={{ marginTop: 'auto', paddingTop: '16px' }}>
          <button onClick={handleLogout} style={styles.sidebarLogoutFullBtn}>
            🚪 Finalizar Sessão
          </button>
        </div>
      </aside>

      {/* CONTEÚDO PRINCIPAL */}
      <main style={styles.mainContent}>
        <header style={styles.topbar}>
          <div style={styles.statusBadgeContainer}>
            <span style={styles.pulseDot}></span>
            <span style={styles.statusText}>Quantum Link Ativo</span>
          </div>
        </header>

        {alertasEstoqueBaixo.length > 0 && (
          <div style={styles.alertaContainer}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <span style={{ fontSize: '16px' }}>⚡</span>
              <strong style={{ color: '#991B1B', fontSize: '14px', letterSpacing: '0.3px' }}>ALERTA CRÍTICO: ESTOQUE ABAIXO DO MÍNIMO</strong>
            </div>
            <ul style={{ margin: '6px 0 0 24px', padding: 0, fontSize: '13px', color: '#7F1D1D' }}>
              {alertasEstoqueBaixo.map((alt, idx) => (
                <li key={idx} style={{ marginBottom: '4px' }}>
                  <strong>{alt.nome}</strong> (Cód: {alt.codigo}) — Atual: <strong>{alt.total} {alt.unidade}</strong> | Mínimo: {alt.minimo} {alt.unidade}
                </li>
              ))}
            </ul>
          </div>
        )}

        {abaAtiva === 'dashboard' && (
          <div>
            <div style={styles.metricsGrid}>
              <div style={styles.metricCard}>
                <span style={styles.metricLabel}>Metragem Total</span>
                <strong style={{...styles.metricVal, color: '#2563EB'}}>{estoqueMetros.toLocaleString()} m</strong>
                <span style={styles.metricSub}>Total em estoque</span>
              </div>
              <div style={styles.metricCard}>
                <span style={styles.metricLabel}>Itens Cadastrados</span>
                <strong style={{...styles.metricVal, color: '#059669'}}>{Object.keys(tecidosConsolidados).length}</strong>
                <span style={styles.metricSub}>Produtos ativos</span>
              </div>
              <div style={styles.metricCard}>
                <span style={styles.metricLabel}>Galpões</span>
                <strong style={{...styles.metricVal, color: '#9333EA'}}>{Object.keys(porLocalizacao).length}</strong>
                <span style={styles.metricSub}>Áreas monitoradas</span>
              </div>
              <div style={styles.metricCard}>
                <span style={styles.metricLabel}>Entradas Hoje</span>
                <strong style={{...styles.metricVal, color: '#059669'}}>{entradasMetros.toLocaleString()} m</strong>
                <span style={styles.metricSub}>Aquisições registradas</span>
              </div>
              <div style={styles.metricCard}>
                <span style={styles.metricLabel}>Saídas Hoje</span>
                <strong style={{...styles.metricVal, color: '#DC2626'}}>{saidasMetros.toLocaleString()} m</strong>
                <span style={styles.metricSub}>Consumo / OPs</span>
              </div>
            </div>

            {/* SEÇÃO PRINCIPAL DE GRÁFICOS (TOP 5 TECIDOS & EVOLUÇÃO DO ESTOQUE DINÂMICA) */}
            <div style={styles.chartsRow}>
              <div style={styles.chartBoxWide}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <h3 style={{ ...styles.sectionTitle, margin: 0 }}>Top 5 Tecidos Mais Utilizados</h3>
                  <button style={styles.verTodosBtn}>Ver todos</button>
                </div>

                {topTecidosMaisUsados.length === 0 ? (
                  <p style={styles.empty}>Aguardando registros de saída ou OPs para análise de consumo.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {topTecidosMaisUsados.map((tecido, index) => {
                      const porcentagem = Math.min(100, Math.max(12, (tecido.totalUso / maxUsoTop) * 100));
                      const badgeCores = ['#2563EB', '#059669', '#D97706', '#475569', '#64748B'];
                      return (
                        <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                          <span style={{ ...styles.rankBadge, backgroundColor: badgeCores[index] || '#2563EB' }}>
                            {index + 1}º
                          </span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                              <strong style={{ fontSize: '13px', color: '#0F172A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {tecido.nome}
                              </strong>
                              <strong style={{ fontSize: '13px', color: '#0F172A', whiteSpace: 'nowrap' }}>
                                {tecido.totalUso.toLocaleString()} {tecido.unidade}
                              </strong>
                            </div>
                            <span style={{ fontSize: '11px', color: '#64748B', display: 'block', marginBottom: '6px' }}>
                              Cor: {tecido.cor || 'N/D'} • Cód: {tecido.codigo}
                            </span>
                            <div style={styles.progressBarBg}>
                              <div style={{ ...styles.progressBarFill, width: `${porcentagem}%`, backgroundColor: badgeCores[index] || '#2563EB' }} />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* GRÁFICO DINÂMICO DE EVOLUÇÃO DO ESTOQUE */}
              <div style={styles.chartBoxWide}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                  <h3 style={{ ...styles.sectionTitle, margin: 0 }}>Evolução do Estoque <span style={{fontSize: '11px', color: '#64748B', fontWeight: '500'}}>(Últimos 7 dias)</span></h3>
                  <select 
                    style={styles.chartSelect}
                    value={unidadeGrafico}
                    onChange={(e) => setUnidadeGrafico(e.target.value)}
                  >
                    <option>Metros (m)</option>
                    <option>Quilos (kg)</option>
                  </select>
                </div>

                <div style={styles.svgChartContainer}>
                  <svg viewBox="0 0 600 200" style={{ width: '100%', height: '150px', overflow: 'visible' }}>
                    <defs>
                      <linearGradient id="gradEstoque" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#2563EB" stopOpacity="0.35" />
                        <stop offset="100%" stopColor="#2563EB" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>
                    <line x1="0" y1="0" x2="600" y2="0" stroke="#E2E8F0" strokeDasharray="4" />
                    <line x1="0" y1="50" x2="600" y2="50" stroke="#E2E8F0" strokeDasharray="4" />
                    <line x1="0" y1="100" x2="600" y2="100" stroke="#E2E8F0" strokeDasharray="4" />
                    <line x1="0" y1="150" x2="600" y2="150" stroke="#E2E8F0" strokeDasharray="4" />

                    <path d={areaPath} fill="url(#gradEstoque)" />
                    <path d={pontosPath} fill="none" stroke="#2563EB" strokeWidth="3" strokeLinecap="round" />

                    {valoresGraficoAtual.map((val, idx) => (
                      <circle key={idx} cx={getX(idx)} cy={getY(val)} r="5" fill="#2563EB" stroke="#FFFFFF" strokeWidth="2" />
                    ))}
                  </svg>
                  <div style={styles.chartXAxis}>
                    {diasEvolucao.map((dia, idx) => (
                      <span key={idx}>{dia}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div style={styles.cardsWaveGrid}>
              <div style={styles.cardWave}>
                <div>
                  <span style={styles.cardWaveLabel}>📥 Fluxo de Entradas <span style={{fontSize: '10px', color: '#64748B'}}>(Aquisições Totais)</span></span>
                  <strong style={{...styles.cardWaveVal, color: '#059669'}}>{entradasMetros.toLocaleString()} m</strong>
                  <span style={styles.cardWaveSub}>METRAGEM ADQUIRIDA</span>
                </div>
                <div style={styles.waveSvgWrapper}>
                  <svg viewBox="0 0 150 40" style={{ width: '100%', height: '35px' }}>
                    <path d="M 0,30 Q 37,10 75,25 T 150,10" fill="none" stroke="#059669" strokeWidth="2.5" />
                  </svg>
                </div>
              </div>

              <div style={styles.cardWave}>
                <div>
                  <span style={styles.cardWaveLabel}>📤 Fluxo de Saídas <span style={{fontSize: '10px', color: '#64748B'}}>(Consumo e Reservas)</span></span>
                  <strong style={{...styles.cardWaveVal, color: '#DC2626'}}>{saidasMetros.toLocaleString()} m</strong>
                  <span style={styles.cardWaveSub}>METRAGEM BAIXADA / RESERVADA</span>
                </div>
                <div style={styles.waveSvgWrapper}>
                  <svg viewBox="0 0 150 40" style={{ width: '100%', height: '35px' }}>
                    <path d="M 0,25 Q 40,35 75,20 T 150,5" fill="none" stroke="#DC2626" strokeWidth="2.5" />
                  </svg>
                </div>
              </div>

              <div style={styles.cardWave}>
                <div>
                  <span style={styles.cardWaveLabel}>⚖️ Peso Total</span>
                  <strong style={{...styles.cardWaveVal, color: '#059669'}}>{entradasKg.toLocaleString()} kg</strong>
                  <span style={styles.cardWaveSub}>PESO ADQUIRIDO</span>
                </div>
                <div style={styles.waveSvgWrapper}>
                  <svg viewBox="0 0 150 40" style={{ width: '100%', height: '35px' }}>
                    <path d="M 0,20 Q 50,30 100,15 T 150,25" fill="none" stroke="#059669" strokeWidth="2.5" />
                  </svg>
                </div>
              </div>
            </div>

            <div style={styles.cardSection}>
              <h3 style={styles.sectionTitle}>🏢 Logística e Distribuição por Galpão</h3>
              <div style={styles.chartContainer}>
                {Object.keys(porLocalizacao).length === 0 ? (
                  <p style={styles.empty}>Nenhum local cadastrado até o momento.</p>
                ) : (
                  Object.entries(porLocalizacao).map(([local, vals]) => (
                    <div key={local} style={{...styles.chartBarWrapper, marginBottom: '10px', background: 'rgba(255,255,255,0.8)', padding: '14px 18px', borderRadius: '10px', border: '1px solid rgba(0,0,0,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px'}}>
                      <span style={{fontWeight: '700', color: '#0F172A', fontSize: '14px'}}>📍 {local}</span>
                      <div style={{display: 'flex', gap: '24px', fontSize: '13px'}}>
                        <span style={{color: '#64748B'}}>Metros livres: <strong style={{color: '#2563EB', fontWeight: '700'}}>{vals.m} m</strong></span>
                        <span style={{color: '#64748B'}}>Quilos livres: <strong style={{color: '#D97706', fontWeight: '700'}}>{vals.kg} kg</strong></span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {abaAtiva === 'op' && (
          <div style={styles.cardSection}>
            <div style={{ borderBottom: '1px solid rgba(0,0,0,0.06)', paddingBottom: '14px', marginBottom: '20px' }}>
              <h3 style={{ ...styles.sectionTitle, margin: 0 }}>{idEditandoOp ? '✏️ Editar Ordem de Produção (OP)' : '📋 Cadastro e Gestão de Ordens de Produção (OPs)'}</h3>
              <p style={{ color: '#64748B', fontSize: '13px', margin: '4px 0 0 0' }}>Cadastre o número da OP e o tecido necessário. O sistema reserva o material imediatamente.</p>
            </div>

            <form onSubmit={salvarOp} style={styles.formGrid}>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Número da OP *</label>
                <input 
                  type="text" 
                  placeholder="Ex: OP-2026-001" 
                  value={formOp.numeroOp} 
                  onChange={(e) => setFormOp({...formOp, numeroOp: e.target.value})} 
                  style={styles.input}
                  required
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Código ou Nome do Tecido *</label>
                <input 
                  type="text" 
                  placeholder="Ex: TEC-001 ou Malha" 
                  value={formOp.termoBusca} 
                  onChange={(e) => setFormOp({...formOp, termoBusca: e.target.value})} 
                  style={styles.input}
                  required
                />
              </div>

              <div style={{gridColumn: '1 / -1'}}>
                <label style={styles.formLabel}>Quantidade Necessária *</label>
                <input 
                  type="number" 
                  step="0.01"
                  placeholder="Ex: 150" 
                  value={formOp.quantidade} 
                  onChange={(e) => setFormOp({...formOp, quantidade: e.target.value})} 
                  style={styles.input}
                  required
                />
              </div>

              {formOp.termoBusca && (
                <div style={{gridColumn: '1 / -1', background: 'rgba(255,255,255,0.9)', padding: '16px', borderRadius: '10px', border: '1px solid rgba(37,99,235,0.3)', display: 'flex', flexDirection: 'column', gap: '6px', boxShadow: '0 0 15px rgba(37,99,235,0.05)'}}>
                  <span style={{fontSize: '11px', color: '#2563EB', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px'}}>📋 Dados do Tecido Localizados na Hora:</span>
                  {(() => {
                    const termo = formOp.termoBusca.toLowerCase().trim();
                    const tecidoMatch = movimentacoes.find(
                      m => (m?.codigo && m.codigo.toLowerCase().includes(termo)) || 
                           (m?.nome && m.nome.toLowerCase().includes(termo))
                    );
                    if (tecidoMatch) {
                      return (
                        <>
                          <div style={{fontSize: '13px', color: '#0F172A'}}><strong>Tecido:</strong> {tecidoMatch.codigo} - {tecidoMatch.nome} ({tecidoMatch.cor})</div>
                          <div style={{fontSize: '13px', color: '#0F172A'}}><strong>Largura:</strong> {tecidoMatch.largura ? `${tecidoMatch.largura}m` : 'Não informada'}</div>
                          <div style={{fontSize: '13px', color: '#059669', fontWeight: '600'}}>✅ Tecido encontrado no sistema! Pronto para reserva.</div>
                        </>
                      );
                    } else {
                      return (
                        <div style={{fontSize: '13px', color: '#D97706'}}>
                          ⚠️ Nenhum tecido exato cadastrado com este termo. Um registro temporário será criado para esta OP.
                        </div>
                      );
                    }
                  })()}
                </div>
              )}

              <div style={{gridColumn: '1 / -1', background: '#FEF3C7', padding: '12px 16px', borderRadius: '10px', border: '1px solid #FCD34D', fontSize: '13px', color: '#92400E'}}>
                ⚠️ O tecido desta OP será separado e deduzido do estoque total para evitar duplicação de uso.
              </div>

              <div style={{gridColumn: '1 / -1', display: 'flex', gap: '10px', flexWrap: 'wrap'}}>
                <button type="submit" disabled={carregando} style={{...styles.button, background: idEditandoOp ? '#D97706' : 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)', color: '#fff', flex: 1}}>
                  {carregando ? 'Salvando OP...' : (idEditandoOp ? 'Atualizar OP' : 'Cadastrar OP e Reservar Estoque')}
                </button>
                {idEditandoOp && (
                  <button 
                    type="button" 
                    onClick={() => { setIdEditandoOp(null); setFormOp({ numeroOp: '', termoBusca: '', quantidade: '' }); }}
                    style={{padding: '12px 20px', backgroundColor: '#64748B', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: '600', cursor: 'pointer'}}
                  >
                    Cancelar
                  </button>
                )}
              </div>
            </form>

            <div style={{ marginTop: '36px', borderTop: '1px solid rgba(0,0,0,0.06)', paddingTop: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
                <h4 style={{ margin: 0, fontSize: '15px', color: '#0F172A', fontWeight: '700' }}>📋 OPs Cadastradas (Pendentes de Produção)</h4>
                <span style={{ fontSize: '12px', color: '#64748B' }}>Total de OPs: <strong>{opsFiltradas.length}</strong></span>
              </div>

              <input 
                type="text" 
                placeholder="Pesquisar OP por número, código ou nome do tecido..." 
                value={buscaOp} 
                onChange={(e) => setBuscaOp(e.target.value)} 
                style={styles.inputFull}
              />

              <div style={styles.tableResponsive}>
                <table style={styles.table}>
                  <thead>
                    <tr style={styles.thTr}>
                      <th style={styles.th}>Nº da OP</th>
                      <th style={styles.th}>Código</th>
                      <th style={styles.th}>Tecido / Cor</th>
                      <th style={styles.th}>Qtd Reservada</th>
                      <th style={styles.th}>Data</th>
                      <th style={styles.th}>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {opsFiltradas.length === 0 ? (
                      <tr>
                        <td colSpan="6" style={styles.empty}>Nenhuma Ordem de Produção encontrada.</td>
                      </tr>
                    ) : (
                      opsFiltradas.map((item) => {
                        const qtd = Number(item.metros || item.quantidade || 0);
                        const unidade = item.unidademedida || item.unidadeMedida || 'm';
                        const numOp = item.notafiscal || item.notaFiscal || 'N/D';

                        return (
                          <tr key={item.id} style={styles.tr}>
                            <td style={styles.td}><strong style={{ color: '#2563EB' }}>{numOp}</strong></td>
                            <td style={styles.td}><strong style={{ color: '#0F172A' }}>{item.codigo}</strong></td>
                            <td style={styles.td}>
                              <div style={{ fontWeight: '600', color: '#0F172A' }}>{item.nome} ({item.cor})</div>
                              {item.largura ? <div style={{fontSize: '11px', color: '#64748B'}}>Largura: {item.largura}m</div> : null}
                            </td>
                            <td style={styles.td}><strong style={{ color: '#D97706' }}>{qtd} {unidade}</strong></td>
                            <td style={styles.td}><span style={{color: '#64748B'}}>{item.data}</span></td>
                            <td style={styles.td}>
                              <button onClick={() => iniciarEdicaoOp(item)} style={styles.btnEditar} title="Editar OP">✏️</button>
                              <button onClick={() => deletarItem(item.id)} style={styles.btnDeletar} title="Excluir OP">🗑️</button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {abaAtiva === 'entrada' && (
          <div style={styles.cardSection}>
            <div style={{ borderBottom: '1px solid rgba(0,0,0,0.06)', paddingBottom: '14px', marginBottom: '20px' }}>
              <h3 style={{ ...styles.sectionTitle, margin: 0 }}>{idEditando ? '✏️ Atualizar Dados de Entrada' : '📥 Cadastro de Nova Entrada / Compra'}</h3>
              <p style={{ color: '#64748B', fontSize: '13px', margin: '4px 0 0 0' }}>Preencha os campos abaixo para registrar novos tecidos ou lotes no sistema.</p>
            </div>
            
            <form onSubmit={registrarOuAtualizarMovimento} style={styles.formGrid}>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Código do Tecido *</label>
                <input type="text" placeholder="Ex: TEC-001" value={form.codigo} onChange={(e) => setForm({...form, codigo: e.target.value})} style={styles.input} required />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Nome do Tecido *</label>
                <input type="text" placeholder="Ex: Malha Canelada" value={form.nome} onChange={(e) => setForm({...form, nome: e.target.value})} style={styles.input} required />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Cor do Tecido *</label>
                <input type="text" placeholder="Ex: Azul Marinho" value={form.cor} onChange={(e) => setForm({...form, cor: e.target.value})} style={styles.input} required />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Largura (m)</label>
                <input type="number" step="0.01" placeholder="Ex: 1.50" value={form.largura} onChange={(e) => setForm({...form, largura: e.target.value})} style={styles.input} />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Localização / Galpão *</label>
                <input type="text" placeholder="Ex: Galpão A - Setor 2" value={form.localizacao} onChange={(e) => setForm({...form, localizacao: e.target.value})} style={styles.input} required />
              </div>
              <div style={{display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '10px'}}>
                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Quantidade *</label>
                  <input type="number" step="0.01" placeholder="0.00" value={form.quantidade} onChange={(e) => setForm({...form, quantidade: e.target.value, metros: e.target.value})} style={styles.input} required />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Unidade</label>
                  <select value={form.unidadeMedida} onChange={(e) => setForm({...form, unidadeMedida: e.target.value})} style={styles.input}>
                    <option value="m">Metros (m)</option>
                    <option value="kg">Quilos (kg)</option>
                  </select>
                </div>
              </div>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Estoque Mínimo de Alerta</label>
                <input type="number" step="0.01" placeholder="Ex: 180" value={form.estoqueMinimo} onChange={(e) => setForm({...form, estoqueMinimo: e.target.value})} style={styles.input} />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Valor Unitário (R$)</label>
                <input type="number" step="0.01" placeholder="Ex: 15.90" value={form.preco} onChange={(e) => setForm({...form, preco: e.target.value})} style={styles.input} />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Número da Nota Fiscal</label>
                <input type="text" placeholder="Ex: 45892" value={form.notaFiscal} onChange={(e) => setForm({...form, notaFiscal: e.target.value})} style={styles.input} />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Nome do Fornecedor</label>
                <input type="text" placeholder="Ex: Têxtil Exemplo S.A." value={form.fornecedor} onChange={(e) => setForm({...form, fornecedor: e.target.value})} style={styles.input} />
              </div>
              
              <div style={{gridColumn: '1 / -1'}}>
                <label style={styles.formLabel}>Anexar Imagem / Foto do Tecido (Opcional)</label>
                <input type="file" accept="image/*" capture="environment" onChange={handleFotoChange} style={styles.inputFile} />
              </div>

              {form.foto && (
                <div style={{gridColumn: '1 / -1', ...styles.previewContainer}}>
                  <img src={form.foto} alt="Prévia" style={styles.previewImg} onClick={() => setFotoSelecionada(form.foto)} />
                  <div>
                    <strong style={{display: 'block', color: '#065F46', fontSize: '13px'}}>Imagem anexada com sucesso</strong>
                    <span style={{color: '#64748B', fontSize: '11px', cursor: 'pointer'}} onClick={() => setFotoSelecionada(form.foto)}>Clique na miniatura para ampliar</span>
                  </div>
                </div>
              )}

              <div style={{gridColumn: '1 / -1', marginTop: '8px'}}>
                <button type="submit" disabled={carregando} style={{...styles.button, background: idEditando ? '#D97706' : 'linear-gradient(135deg, #059669 0%, #047857 100%)', color: '#fff'}}>
                  {carregando ? 'Processando dados...' : (idEditando ? 'Salvar Alterações' : 'Salvar Entrada no Servidor')}
                </button>
              </div>
            </form>
          </div>
        )}

        {abaAtiva === 'saida' && (
          <div style={styles.cardSection}>
            <div style={{ borderBottom: '1px solid rgba(0,0,0,0.06)', paddingBottom: '14px', marginBottom: '20px' }}>
              <h3 style={{ ...styles.sectionTitle, margin: 0 }}>{idEditando ? '✏️ Editar Saída de Tecido' : '📤 Lançamento de Baixa / Saída'}</h3>
              <p style={{ color: '#64748B', fontSize: '13px', margin: '4px 0 0 0' }}>Busque pelo código ou nome do tecido e informe a quantidade consumida na produção.</p>
            </div>

            <form onSubmit={registrarOuAtualizarMovimento} style={styles.formGrid}>
              <div style={{gridColumn: '1 / -1'}}>
                <label style={styles.formLabel}>Localizar Tecido (Código ou Nome)</label>
                <div style={{display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap'}}>
                  <input type="text" placeholder="Ex: TEC-001 ou Malha" value={termoBuscaSaida} onChange={(e) => setTermoBuscaSaida(e.target.value)} style={{...styles.input, flex: 1, minWidth: '200px'}} />
                  <button type="button" onClick={executarBuscaSaida} style={{padding: '12px 20px', background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: '700', cursor: 'pointer', whiteSpace: 'nowrap', fontSize: '13px'}}>OK / Buscar</button>
                </div>
              </div>

              <div style={{gridColumn: '1 / -1', display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '10px'}}>
                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Quantidade Utilizada *</label>
                  <input type="number" step="0.01" placeholder="0.00" value={form.quantidade} onChange={(e) => setForm({...form, quantidade: e.target.value, metros: e.target.value})} style={styles.input} required />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Unidade</label>
                  <select value={form.unidadeMedida} onChange={(e) => setForm({...form, unidadeMedida: e.target.value})} style={styles.input}>
                    <option value="m">Metros (m)</option>
                    <option value="kg">Quilos (kg)</option>
                  </select>
                </div>
              </div>

              <div style={{gridColumn: '1 / -1', background: 'rgba(255,255,255,0.6)', padding: '16px', borderRadius: '10px', border: '1px solid rgba(0,0,0,0.06)', display: 'flex', flexDirection: 'column', gap: '6px'}}>
                <span style={{fontSize: '11px', color: '#2563EB', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px'}}>📋 Dados Carregados do Cadastro:</span>
                <div style={{fontSize: '13px', color: '#0F172A'}}><strong>Tecido:</strong> {form.codigo || '-'} / {form.nome || 'Aguardando busca...'} ({form.cor || '-'})</div>
                <div style={{fontSize: '13px', color: '#0F172A'}}><strong>Largura:</strong> {form.largura ? `${form.largura}m` : 'Não informada'}</div>
                <div style={{fontSize: '13px', color: '#0F172A'}}><strong>Localização:</strong> {form.localizacao || '-'}</div>
                <div style={{fontSize: '13px', color: '#0F172A'}}><strong>Estoque Mínimo:</strong> {form.estoqueMinimo || '0'} {form.unidadeMedida}</div>
              </div>

              <div style={{gridColumn: '1 / -1', marginTop: '8px'}}>
                <button type="submit" disabled={carregando} style={{...styles.button, background: idEditando ? '#D97706' : 'linear-gradient(135deg, #DC2626 0%, #B91C1C 100%)', color: '#fff'}}>
                  {carregando ? 'Processando dados...' : (idEditando ? 'Salvar Alterações' : 'Confirmar Saída no Servidor')}
                </button>
              </div>
            </form>
          </div>
        )}

        {abaAtiva === 'historico' && (
          <div style={styles.cardSection}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
              <h3 style={{ ...styles.sectionTitle, margin: 0 }}>🔍 Consulta de Histórico, OPs e Galpões</h3>
              <span style={{ fontSize: '12px', color: '#64748B' }}>Total de registros: <strong>{movFiltradas.length}</strong></span>
            </div>

            <input 
              type="text" 
              placeholder="Pesquisar por nome, código, fornecedor, nota fiscal ou galpão..." 
              value={busca} 
              onChange={(e) => setBusca(e.target.value)} 
              style={styles.inputFull}
            />

            <div style={styles.tableResponsive}>
              <table style={styles.table}>
                <thead>
                  <tr style={styles.thTr}>
                    <th style={styles.th}>Foto</th>
                    <th style={styles.th}>Tipo</th>
                    <th style={styles.th}>Código</th>
                    <th style={styles.th}>Tecido / Cor</th>
                    <th style={styles.th}>Fornecedor & NF</th>
                    <th style={styles.th}>Localização</th>
                    <th style={styles.th}>Qtd & Custos</th>
                    <th style={styles.th}>Data</th>
                    <th style={styles.th}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {movFiltradas.length === 0 ? (
                    <tr>
                      <td colSpan="9" style={styles.empty}>Nenhum registro encontrado no banco de dados.</td>
                    </tr>
                  ) : (
                    movFiltradas.map((item) => {
                      const precoUnit = Number(item.preco) || 0;
                      const qtd = Number(item.metros || item.quantidade || 0);
                      const unidade = item.unidademedida || item.unidadeMedida || 'm';
                      const tipoMovimentoNoBanco = obterTipo(item);
                      
                      const minimo = obterMinimo(item);
                      const custoTotal = qtd * precoUnit;
                      const nf = item.notafiscal || item.notaFiscal || '';
                      const fornecedor = item.fornecedor || '';

                      let badgeBg = '#DEF7EC';
                      let badgeColor = '#03543F';
                      let badgeText = '📥 Entrada';
                      if (tipoMovimentoNoBanco === 'saida') {
                        badgeBg = '#FDE8E8';
                        badgeColor = '#9B1C1C';
                        badgeText = '📤 Saída';
                      } else if (tipoMovimentoNoBanco === 'op') {
                        badgeBg = '#FEF3C7';
                        badgeColor = '#92400E';
                        badgeText = `📋 OP: ${nf}`;
                      }

                      return (
                        <tr key={item.id} style={styles.tr}>
                          <td style={styles.td}>
                            {item.foto ? (
                              <img src={item.foto} alt="Tecido" style={styles.tableImgClickable} title="Clique para ampliar" onClick={() => setFotoSelecionada(item.foto)} />
                            ) : (
                              <span style={styles.noFoto}>Sem foto</span>
                            )}
                          </td>
                          <td style={styles.td}>
                            <span style={{...styles.badge, background: badgeBg, color: badgeColor}}>{badgeText}</span>
                          </td>
                          <td style={styles.td}><strong style={{color: '#0F172A'}}>{item.codigo}</strong></td>
                          <td style={styles.td}>
                            <div style={{ fontWeight: '600', color: '#0F172A' }}>{item.nome} ({item.cor})</div>
                            {item.largura ? <div style={{fontSize: '11px', color: '#2563EB', fontWeight: '500'}}>Largura: {item.largura}m</div> : null}
                          </td>
                          <td style={styles.td}>
                            <div style={{fontSize: '13px', fontWeight: '600', color: '#0F172A'}}>{fornecedor || 'Não informado'}</div>
                            <div style={{fontSize: '11px', color: '#64748B'}}>NF: {nf || 'N/D'}</div>
                          </td>
                          <td style={styles.td}><span style={styles.localBadge}>📍 {item.localizacao}</span></td>
                          <td style={styles.td}>
                            <strong style={{ color: '#0F172A' }}>{qtd} {unidade}</strong>
                            <div style={{fontSize: '11px', color: '#64748B'}}>Mín: {minimo} {unidade}</div>
                            <div style={{fontSize: '11px', color: '#059669', fontWeight: '600'}}>
                              R$ {precoUnit.toFixed(2)} | Tot: R$ {custoTotal.toFixed(2)}
                            </div>
                          </td>
                          <td style={styles.td}><span style={{color: '#64748B'}}>{item.data}</span></td>
                          <td style={styles.td}>
                            <button onClick={() => iniciarEdicao(item)} style={styles.btnEditar} title="Editar registro">✏️</button>
                            <button onClick={() => deletarItem(item.id)} style={styles.btnDeletar} title="Remover registro">🗑️</button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {fotoSelecionada && (
        <div style={styles.modalOverlay} onClick={() => setFotoSelecionada(null)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <button style={styles.modalCloseBtn} onClick={() => setFotoSelecionada(null)}>✕ Fechar Visualização</button>
            <img src={fotoSelecionada} alt="Zoom" style={styles.modalImg} />
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  loginContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    backgroundColor: '#F1F5F9',
    backgroundImage: 'radial-gradient(circle at 50% 30%, rgba(37, 99, 235, 0.08) 0%, transparent 70%)',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  loginCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    padding: '40px',
    borderRadius: '20px',
    boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.1), 0 0 25px rgba(37, 99, 235, 0.1)',
    width: '100%',
    maxWidth: '420px',
    boxSizing: 'border-box',
    border: '1px solid rgba(255, 255, 255, 1)'
  },
  loginLabel: {
    fontSize: '11px',
    color: '#475569',
    marginBottom: '6px',
    display: 'block',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: '1px'
  },
  errorBox: {
    backgroundColor: '#FEF2F2',
    color: '#DC2626',
    padding: '10px',
    borderRadius: '8px',
    fontSize: '13px',
    textAlign: 'center',
    fontWeight: '600',
    border: '1px solid #FCA5A5'
  },
  loginButton: {
    width: '100%',
    padding: '14px',
    background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
    color: '#ffffff',
    border: 'none',
    borderRadius: '10px',
    fontSize: '14px',
    fontWeight: '800',
    cursor: 'pointer',
    boxShadow: '0 4px 15px rgba(37, 99, 235, 0.3)',
    letterSpacing: '0.5px',
    marginTop: '6px',
    transition: 'all 0.2s'
  },
  appLayout: {
    display: 'flex',
    minHeight: '100vh',
    backgroundColor: '#F4F7FC',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  sidebar: {
    width: '260px',
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    borderRight: '1px solid rgba(226, 232, 240, 0.8)',
    display: 'flex',
    flexDirection: 'column',
    padding: '24px 16px',
    boxSizing: 'border-box',
    position: 'sticky',
    top: 0,
    height: '100vh',
    zIndex: 100,
  },
  sidebarHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '32px',
    paddingLeft: '4px',
  },
  sidebarTitle: {
    fontSize: '16px',
    fontWeight: '800',
    color: '#0F172A',
    margin: 0,
    letterSpacing: '-0.3px',
  },
  versionBadge: {
    fontSize: '10px',
    fontWeight: '700',
    color: '#2563EB',
    backgroundColor: 'rgba(37,99,235,0.08)',
    padding: '2px 6px',
    borderRadius: '4px',
    border: '1px solid rgba(37,99,235,0.2)',
  },
  logoBadge: {
    width: '38px',
    height: '38px',
    background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#ffffff',
    fontSize: '15px',
    fontWeight: '900',
    boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)',
    flexShrink: 0
  },
  sidebarNavGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    flex: 1,
  },
  sidebarLink: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    width: '100%',
    padding: '12px 14px',
    backgroundColor: 'transparent',
    color: '#64748B',
    border: 'none',
    borderRadius: '10px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'all 0.2s',
  },
  sidebarLinkActive: {
    backgroundColor: '#2563EB',
    color: '#ffffff',
    boxShadow: '0 4px 15px rgba(37, 99, 235, 0.3)',
    fontWeight: '700',
  },
  sidebarLogoutFullBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    width: '100%',
    padding: '12px 14px',
    backgroundColor: '#FEE2E2',
    color: '#991B1B',
    border: '1px solid #FCA5A5',
    borderRadius: '10px',
    fontSize: '13px',
    fontWeight: '700',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  mainContent: {
    flex: 1,
    padding: '32px',
    boxSizing: 'border-box',
    maxWidth: 'calc(100vw - 260px)',
    overflowX: 'auto',
  },
  topbar: {
    marginBottom: '28px',
    display: 'flex',
    justifyContent: 'flex-end',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '16px',
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    padding: '16px 28px',
    borderRadius: '16px',
    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.04), inset 0 1px 0 rgba(255, 255, 255, 1)',
    border: '1px solid rgba(255, 255, 255, 0.9)'
  },
  statusBadgeContainer: { 
    display: 'flex', 
    alignItems: 'center', 
    gap: '8px', 
    backgroundColor: 'rgba(16, 185, 129, 0.08)', 
    padding: '6px 14px', 
    borderRadius: '20px', 
    border: '1px solid rgba(16, 185, 129, 0.3)',
    boxShadow: '0 2px 8px rgba(16, 185, 129, 0.1)' 
  },
  pulseDot: { width: '8px', height: '8px', backgroundColor: '#059669', borderRadius: '50%', display: 'inline-block', boxShadow: '0 0 6px #059669' },
  statusText: { fontSize: '12px', color: '#047857', fontWeight: '700', letterSpacing: '0.3px' },
  alertaContainer: {
    backgroundColor: 'rgba(254, 242, 242, 0.9)',
    backdropFilter: 'blur(10px)',
    border: '1px solid #FCA5A5',
    padding: '16px 20px',
    borderRadius: '12px',
    marginBottom: '24px',
    boxShadow: '0 10px 25px rgba(220, 38, 38, 0.06)'
  },
  metricsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '16px',
    marginBottom: '24px',
  },
  metricCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
    backdropFilter: 'blur(12px)',
    padding: '18px 20px',
    borderRadius: '14px',
    boxShadow: '0 8px 25px rgba(0, 0, 0, 0.04)',
    border: '1px solid rgba(255, 255, 255, 0.9)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  metricLabel: { fontSize: '11px', color: '#64748B', marginBottom: '6px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.8px' },
  metricVal: { fontSize: '22px', fontWeight: '900', letterSpacing: '-0.5px', marginBottom: '2px' },
  metricSub: { fontSize: '11px', color: '#94A3B8' },
  chartsRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1.3fr',
    gap: '24px',
    marginBottom: '24px',
  },
  chartBoxWide: {
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    padding: '24px',
    borderRadius: '16px',
    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.04), inset 0 1px 0 rgba(255, 255, 255, 1)',
    border: '1px solid rgba(255, 255, 255, 0.9)',
    boxSizing: 'border-box',
  },
  verTodosBtn: {
    backgroundColor: '#F1F5F9',
    color: '#475569',
    border: '1px solid #CBD5E1',
    padding: '4px 10px',
    borderRadius: '6px',
    fontSize: '11px',
    fontWeight: '700',
    cursor: 'pointer',
  },
  rankBadge: {
    width: '26px',
    height: '26px',
    borderRadius: '6px',
    color: '#FFFFFF',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '11px',
    fontWeight: '800',
    flexShrink: 0,
  },
  progressBarBg: {
    width: '100%',
    height: '6px',
    backgroundColor: '#E2E8F0',
    borderRadius: '3px',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: '3px',
  },
  chartSelect: {
    padding: '4px 8px',
    borderRadius: '6px',
    border: '1px solid #CBD5E1',
    backgroundColor: '#FFFFFF',
    fontSize: '11px',
    fontWeight: '600',
    color: '#0F172A',
    outline: 'none',
  },
  svgChartContainer: {
    paddingTop: '10px',
  },
  chartXAxis: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '11px',
    color: '#64748B',
    paddingTop: '8px',
    borderTop: '1px solid #E2E8F0',
  },
  cardsWaveGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '16px',
    marginBottom: '24px',
  },
  cardWave: {
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
    backdropFilter: 'blur(12px)',
    padding: '22px',
    borderRadius: '16px',
    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.04)',
    border: '1px solid rgba(255, 255, 255, 0.9)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardWaveLabel: { fontSize: '12px', color: '#0F172A', display: 'block', fontWeight: '700', marginBottom: '8px' },
  cardWaveVal: { fontSize: '24px', fontWeight: '900', display: 'block', letterSpacing: '-0.5px', marginBottom: '4px' },
  cardWaveSub: { fontSize: '9px', color: '#64748B', fontWeight: '700', letterSpacing: '0.8px', display: 'block' },
  waveSvgWrapper: {
    width: '100px',
    flexShrink: 0,
  },
  cardSection: {
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    padding: '26px',
    borderRadius: '16px',
    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.04), inset 0 1px 0 rgba(255, 255, 255, 1)',
    border: '1px solid rgba(255, 255, 255, 0.9)',
    marginBottom: '24px',
  },
  sectionTitle: { fontSize: '15px', color: '#0F172A', marginBottom: '16px', marginTop: 0, fontWeight: '800', letterSpacing: '-0.3px' },
  formGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px' },
  formGroup: { display: 'flex', flexDirection: 'column' },
  formLabel: { fontSize: '11px', color: '#475569', marginBottom: '6px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.8px' },
  input: {
    width: '100%',
    padding: '12px 16px',
    borderRadius: '10px',
    border: '1px solid #CBD5E1',
    fontSize: '14px',
    outline: 'none',
    boxSizing: 'border-box',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    color: '#0F172A',
    boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.02)',
  },
  inputFull: {
    width: '100%',
    padding: '12px 16px',
    borderRadius: '10px',
    border: '1px solid #CBD5E1',
    fontSize: '14px',
    outline: 'none',
    boxSizing: 'border-box',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    color: '#0F172A',
    marginBottom: '18px',
    boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.02)',
  },
  previewContainer: { display: 'flex', alignItems: 'center', gap: '14px', background: '#ECFDF5', padding: '14px', borderRadius: '10px', border: '1px solid #A7F3D0' },
  previewImg: { width: '52px', height: '52px', objectFit: 'cover', borderRadius: '8px', cursor: 'pointer', border: '2px solid #059669' },
  button: {
    width: '100%',
    padding: '14px',
    border: 'none',
    borderRadius: '10px',
    fontSize: '14px',
    fontWeight: '800',
    cursor: 'pointer',
    boxShadow: '0 4px 15px rgba(0,0,0,0.08)',
    letterSpacing: '0.5px',
    transition: 'all 0.2s'
  },
  chartContainer: { display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' },
  tableResponsive: { width: '100%', overflowX: 'auto', WebkitOverflowScrolling: 'touch' },
  table: { width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '900px' },
  thTr: { borderBottom: '2px solid #E2E8F0', backgroundColor: 'rgba(248, 250, 252, 0.8)' },
  th: { padding: '14px 12px', fontSize: '11px', color: '#475569', textTransform: 'uppercase', fontWeight: '800', letterSpacing: '1px' },
  tr: { borderBottom: '1px solid #E2E8F0', transition: 'background 0.2s' },
  td: { padding: '16px 12px', fontSize: '13px', color: '#334155', verticalAlign: 'middle' },
  localBadge: { padding: '5px 10px', borderRadius: '6px', fontSize: '11px', backgroundColor: '#EFF6FF', color: '#1D4ED8', fontWeight: '700', border: '1px solid #BFDBFE' },
  badge: { padding: '5px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: '800', display: 'inline-block' },
  btnEditar: {
    padding: '6px 10px',
    backgroundColor: '#EFF6FF',
    color: '#1D4ED8',
    border: '1px solid #BFDBFE',
    borderRadius: '8px',
    cursor: 'pointer',
    marginRight: '6px',
    fontSize: '12px',
    fontWeight: '700',
  },
  btnDeletar: {
    padding: '6px 10px',
    backgroundColor: '#FEE2E2',
    color: '#991B1B',
    border: '1px solid #FCA5A5',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '700',
  },
  empty: { textAlign: 'center', padding: '36px', color: '#94A3B8', fontSize: '14px' },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    backdropFilter: 'blur(6px)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: '1000',
    padding: '20px',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    padding: '24px',
    borderRadius: '16px',
    maxWidth: '90vw',
    maxHeight: '90vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    boxShadow: '0 25px 50px rgba(0, 0, 0, 0.25)',
    border: '1px solid #E2E8F0'
  },
  modalCloseBtn: {
    backgroundColor: '#DC2626',
    color: '#fff',
    border: 'none',
    padding: '8px 14px',
    borderRadius: '8px',
    fontWeight: '700',
    cursor: 'pointer',
    marginBottom: '12px',
    fontSize: '12px',
  },
  modalImg: {
    maxWidth: '80vw',
    maxHeight: '75vh',
    objectFit: 'contain',
    borderRadius: '8px',
  },
  tableImgClickable: { width: '40px', height: '40px', objectFit: 'cover', borderRadius: '8px', cursor: 'pointer', border: '1px solid #CBD5E1' },
  noFoto: { fontSize: '11px', color: '#94A3B8', fontStyle: 'italic' }
};

export default SunnyWearTecidos;