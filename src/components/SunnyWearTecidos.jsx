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

  // Estados específicos para o módulo de OPs
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
  
  const obterTipo = (item) => item?.tipomovimento || item?.tipoMovimento || 'entrada';

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

  // Função para cadastrar ou atualizar OP
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
    const localFinal = tecidoEncontrado ? tecidoEncontrado.localizacao : 'Pendente';
    const larguraFinal = tecidoEncontrado ? tecidoEncontrado.largura : '';
    const unidadeFinal = tecidoEncontrado ? (tecidoEncontrado.unidademedida || tecidoEncontrado.unidadeMedida || 'm') : 'm';
    const precoFinal = tecidoEncontrado ? tecidoEncontrado.preco : 0;

    const dadosOp = {
      tipoMovimento: 'op',
      codigo: codigoFinal,
      nome: nomeFinal,
      cor: corFinal,
      localizacao: localFinal,
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

  // EXCLUI AS OPS DO HISTÓRICO AQUI (Filtro ajustado)
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

  // Lista filtrada específica para a aba de OPs
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
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <div style={{ width: '48px', height: '48px', backgroundColor: '#2563EB', borderRadius: '10px', margin: '0 auto 16px auto', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '20px', fontWeight: 'bold' }}>SW</div>
            <h1 style={{ color: '#0F172A', margin: '0 0 6px 0', fontSize: '22px', fontWeight: '700', letterSpacing: '-0.3px' }}>Sunny Wear</h1>
            <p style={{ color: '#64748B', fontSize: '13px', margin: 0, fontWeight: '500' }}>Sistema de Gestão de Estoque Têxtil</p>
          </div>
          
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
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
              <label style={styles.loginLabel}>Senha de Segurança</label>
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
            <button type="submit" style={{ ...styles.button, backgroundColor: '#2563EB', marginTop: '4px' }}>Acessar Plataforma</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '36px', height: '36px', backgroundColor: '#2563EB', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '15px', fontWeight: 'bold' }}>SW</div>
          <div>
            <h1 style={styles.title}>Sunny Wear</h1>
            <p style={styles.subtitle}>Painel Executivo de Controle e Logística de Tecidos</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={styles.statusBadgeContainer}>
            <span style={styles.pulseDot}></span>
            <span style={styles.statusText}>Servidor Sincronizado</span>
          </div>
          <button onClick={handleLogout} style={styles.logoutBtn}>Sair do Sistema</button>
        </div>
      </header>

      {alertasEstoqueBaixo.length > 0 && (
        <div style={styles.alertaContainer}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <span style={{ fontSize: '16px' }}>🚨</span>
            <strong style={{ color: '#991B1B', fontSize: '14px' }}>Alerta de Estoque Crítico Abaixo do Mínimo</strong>
          </div>
          <ul style={{ margin: '4px 0 0 24px', padding: 0, fontSize: '13px', color: '#7F1D1D' }}>
            {alertasEstoqueBaixo.map((alt, idx) => (
              <li key={idx} style={{ marginBottom: '3px' }}>
                <strong>{alt.nome}</strong> (Cód: {alt.codigo}) — Estoque Atual: <strong>{alt.total} {alt.unidade}</strong> | Mínimo Recomendado: {alt.minimo} {alt.unidade}
              </li>
            ))}
          </ul>
        </div>
      )}

      <nav style={styles.navTabs}>
        <button 
          onClick={() => setAbaAtiva('dashboard')} 
          style={{ ...styles.tabBtn, ...(abaAtiva === 'dashboard' ? styles.tabActive : {}) }}
        >
          📊 Visão Geral (Dashboard)
        </button>
        <button 
          onClick={() => { setIdEditando(null); setForm({ tipoMovimento: 'entrada', codigo: '', nome: '', cor: '', localizacao: '', quantidade: '', metros: '', unidadeMedida: 'm', preco: '', estoqueMinimo: '', notaFiscal: '', fornecedor: '', foto: '', largura: '' }); setTermoBuscaSaida(''); setAbaAtiva('entrada'); }} 
          style={{ ...styles.tabBtn, ...(abaAtiva === 'entrada' ? styles.tabActive : {}) }}
        >
          📥 Registrar Entrada (Compra)
        </button>
        <button 
          onClick={() => { setIdEditandoOp(null); setFormOp({ numeroOp: '', termoBusca: '', quantidade: '' }); setAbaAtiva('op'); }} 
          style={{ ...styles.tabBtn, ...(abaAtiva === 'op' ? styles.tabActive : {}) }}
        >
          📋 Ordens de Produção (OPs)
        </button>
        <button 
          onClick={() => { setIdEditando(null); setForm({ tipoMovimento: 'saida', codigo: '', nome: '', cor: '', localizacao: '', quantidade: '', metros: '', unidadeMedida: 'm', preco: '', estoqueMinimo: '', notaFiscal: '', fornecedor: '', foto: '', largura: '' }); setTermoBuscaSaida(''); setAbaAtiva('saida'); }} 
          style={{ ...styles.tabBtn, ...(abaAtiva === 'saida' ? styles.tabActive : {}) }}
        >
          📤 Registrar Saída (Baixa)
        </button>
        <button 
          onClick={() => setAbaAtiva('historico')} 
          style={{ ...styles.tabBtn, ...(abaAtiva === 'historico' ? styles.tabActive : {}) }}
        >
          🔍 Consulta & Galpões
        </button>
      </nav>

      {abaAtiva === 'dashboard' && (
        <div>
          <div style={styles.cardSection}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ ...styles.sectionTitle, margin: 0 }}>Top 5 Tecidos Mais Utilizados na Produção</h3>
              <span style={{ fontSize: '11px', color: '#2563EB', backgroundColor: '#EFF6FF', padding: '4px 10px', borderRadius: '6px', fontWeight: '600', letterSpacing: '0.3px' }}>EM TEMPO REAL</span>
            </div>
            
            {topTecidosMaisUsados.length === 0 ? (
              <p style={styles.empty}>Aguardando registros de saída ou OPs para análise de consumo.</p>
            ) : (
              <div style={styles.carrosselContainer}>
                {topTecidosMaisUsados.map((tecido, index) => {
                  const posicoesNomes = ['1º Posição', '2º Posição', '3º Posição', '4º Posição', '5º Posição'];
                  const coresBordas = ['#2563EB', '#059669', '#D97706', '#DC2626', '#7C3AED'];
                  return (
                    <div 
                      key={index} 
                      style={{ 
                        ...styles.carrosselCard, 
                        borderTop: `3px solid ${coresBordas[index] || '#2563EB'}` 
                      }}
                    >
                      <span style={{ fontSize: '10px', fontWeight: '700', color: '#64748B', textTransform: 'uppercase', marginBottom: '6px', display: 'block', letterSpacing: '0.5px' }}>
                        {posicoesNomes[index] || `${index + 1}º Lugar`}
                      </span>
                      <strong style={{ fontSize: '14px', color: '#0F172A', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: '4px' }}>
                        {tecido.nome}
                      </strong>
                      <span style={{ fontSize: '11px', color: '#64748B', display: 'block', marginBottom: '12px' }}>
                        Cor: {tecido.cor || 'N/D'} • Cód: {tecido.codigo}
                      </span>
                      <div style={{ fontSize: '15px', fontWeight: '700', color: coresBordas[index] || '#2563EB', marginTop: 'auto' }}>
                        {tecido.totalUso.toLocaleString()} {tecido.unidade}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div style={styles.cardSection}>
            <h3 style={styles.sectionTitle}>📥 Fluxo de Entradas (Aquisições Totais)</h3>
            <div style={styles.cardsContainer}>
              <div style={{...styles.card, borderLeft: '4px solid #059669'}}>
                <span style={styles.cardLabel}>Metragem Adquirida</span>
                <strong style={{...styles.cardValue, color: '#059669'}}>{entradasMetros.toLocaleString()} m</strong>
              </div>
              <div style={{...styles.card, borderLeft: '4px solid #059669'}}>
                <span style={styles.cardLabel}>Peso Adquirido</span>
                <strong style={{...styles.cardValue, color: '#059669'}}>{entradasKg.toLocaleString()} kg</strong>
              </div>
            </div>
          </div>

          <div style={styles.cardSection}>
            <h3 style={styles.sectionTitle}>📤 Saídas & OPs (Consumo e Reservas)</h3>
            <div style={styles.cardsContainer}>
              <div style={{...styles.card, borderLeft: '4px solid #DC2626'}}>
                <span style={styles.cardLabel}>Metragem Baixada / Reservada</span>
                <strong style={{...styles.cardValue, color: '#DC2626'}}>{saidasMetros.toLocaleString()} m</strong>
              </div>
              <div style={{...styles.card, borderLeft: '4px solid #DC2626'}}>
                <span style={styles.cardLabel}>Peso Baixado / Reservado</span>
                <strong style={{...styles.cardValue, color: '#DC2626'}}>{saidasKg.toLocaleString()} kg</strong>
              </div>
            </div>
          </div>

          <div style={styles.cardSection}>
            <h3 style={styles.sectionTitle}>📦 Saldo Disponível em Estoque (Livre de OPs)</h3>
            <div style={styles.cardsContainer}>
              <div style={{...styles.card, borderLeft: '4px solid #2563EB'}}>
                <span style={styles.cardLabel}>Saldo em Metros</span>
                <strong style={{...styles.cardValue, color: '#2563EB'}}>{estoqueMetros.toLocaleString()} m</strong>
              </div>
              <div style={{...styles.card, borderLeft: '4px solid #D97706'}}>
                <span style={styles.cardLabel}>Saldo em Quilos</span>
                <strong style={{...styles.cardValue, color: '#D97706'}}>{estoqueKg.toLocaleString()} kg</strong>
              </div>
            </div>
          </div>

          <div style={styles.cardSection}>
            <h3 style={styles.sectionTitle}>🏢 Logística e Distribuição por Galpão / Armazém</h3>
            <div style={styles.chartContainer}>
              {Object.keys(porLocalizacao).length === 0 ? (
                <p style={styles.empty}>Nenhum local cadastrado até o momento.</p>
              ) : (
                Object.entries(porLocalizacao).map(([local, vals]) => (
                  <div key={local} style={{...styles.chartBarWrapper, marginBottom: '10px', background: '#F8FAFC', padding: '14px 16px', borderRadius: '8px', border: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                    <span style={{fontWeight: '600', color: '#0F172A', fontSize: '14px'}}>📍 {local}</span>
                    <div style={{display: 'flex', gap: '24px', fontSize: '13px'}}>
                      <span style={{color: '#2563EB'}}>Metros livres: <strong style={{fontWeight: '700'}}>{vals.m} m</strong></span>
                      <span style={{color: '#D97706'}}>Quilos livres: <strong style={{fontWeight: '700'}}>{vals.kg} kg</strong></span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ABA DE GESTÃO DE OPS COM PRÉVIA EM TEMPO REAL */}
      {abaAtiva === 'op' && (
        <div style={styles.cardSection}>
          <div style={{ borderBottom: '1px solid #E2E8F0', paddingBottom: '12px', marginBottom: '20px' }}>
            <h3 style={{ ...styles.sectionTitle, margin: 0 }}>{idEditandoOp ? '✏️ Editar Ordem de Produção (OP)' : '📋 Cadastro e Gestão de Ordens de Produção (OPs)'}</h3>
            <p style={{ color: '#64748B', fontSize: '13px', margin: '4px 0 0 0' }}>Cadastre o número da OP e o tecido necessário. O sistema reserva o material imediatamente, deduzindo do estoque disponível.</p>
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

            {/* PRÉVIA EM TEMPO REAL DO TECIDO PUXADO */}
            {formOp.termoBusca && (
              <div style={{gridColumn: '1 / -1', background: '#F8FAFC', padding: '16px', borderRadius: '8px', border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', gap: '6px'}}>
                <span style={{fontSize: '11px', color: '#64748B', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px'}}>📋 Dados do Tecido Localizados na Hora:</span>
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
                        <div style={{fontSize: '13px', color: '#0F172A'}}><strong>Localização / Galpão:</strong> {tecidoMatch.localizacao || '-'}</div>
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

            <div style={{gridColumn: '1 / -1', background: '#FEF3C7', padding: '12px 16px', borderRadius: '8px', border: '1px solid #FCD34D', fontSize: '13px', color: '#92400E'}}>
              ⚠️ O tecido desta OP será separado e deduzido do estoque total para evitar que seja utilizado em outras demandas.
            </div>

            <div style={{gridColumn: '1 / -1', display: 'flex', gap: '10px'}}>
              <button type="submit" disabled={carregando} style={{...styles.button, backgroundColor: idEditandoOp ? '#D97706' : '#2563EB', flex: 1}}>
                {carregando ? 'Salvando OP...' : (idEditandoOp ? 'Atualizar OP' : 'Cadastrar OP e Reservar Estoque')}
              </button>
              {idEditandoOp && (
                <button 
                  type="button" 
                  onClick={() => { setIdEditandoOp(null); setFormOp({ numeroOp: '', termoBusca: '', quantidade: '' }); }}
                  style={{padding: '12px 20px', backgroundColor: '#64748B', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: '600', cursor: 'pointer'}}
                >
                  Cancelar
                </button>
              )}
            </div>
          </form>

          {/* LISTAGEM E PESQUISA DE OPS CADASTRADAS */}
          <div style={{ marginTop: '36px', borderTop: '2px solid #E2E8F0', paddingTop: '24px' }}>
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
                    <th style={styles.th}>Localização</th>
                    <th style={styles.th}>Qtd Reservada</th>
                    <th style={styles.th}>Data</th>
                    <th style={styles.th}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {opsFiltradas.length === 0 ? (
                    <tr>
                      <td colSpan="7" style={styles.empty}>Nenhuma Ordem de Produção encontrada.</td>
                    </tr>
                  ) : (
                    opsFiltradas.map((item) => {
                      const qtd = Number(item.metros || item.quantidade || 0);
                      const unidade = item.unidademedida || item.unidadeMedida || 'm';
                      const numOp = item.notafiscal || item.notaFiscal || 'N/D';

                      return (
                        <tr key={item.id} style={styles.tr}>
                          <td style={styles.td}><strong style={{ color: '#2563EB' }}>{numOp}</strong></td>
                          <td style={styles.td}><strong>{item.codigo}</strong></td>
                          <td style={styles.td}>
                            <div style={{ fontWeight: '600', color: '#0F172A' }}>{item.nome} ({item.cor})</div>
                            {item.largura ? <div style={{fontSize: '11px', color: '#64748B'}}>Largura: {item.largura}m</div> : null}
                          </td>
                          <td style={styles.td}><span style={styles.localBadge}>📍 {item.localizacao}</span></td>
                          <td style={styles.td}><strong style={{ color: '#D97706' }}>{qtd} {unidade}</strong></td>
                          <td style={styles.td}>{item.data}</td>
                          <td style={styles.td}>
                            <button 
                              onClick={() => iniciarEdicaoOp(item)} 
                              style={styles.btnEditar} 
                              title="Editar OP"
                            >
                              ✏️
                            </button>
                            <button 
                              onClick={() => deletarItem(item.id)} 
                              style={styles.btnDeletar} 
                              title="Excluir OP e liberar estoque"
                            >
                              🗑️
                            </button>
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
          <div style={{ borderBottom: '1px solid #E2E8F0', paddingBottom: '12px', marginBottom: '20px' }}>
            <h3 style={{ ...styles.sectionTitle, margin: 0 }}>{idEditando ? '✏️ Atualizar Dados de Entrada' : '📥 Cadastro de Nova Entrada / Compra'}</h3>
            <p style={{ color: '#64748B', fontSize: '13px', margin: '4px 0 0 0' }}>Preencha os campos abaixo para registrar novos tecidos ou lotes no sistema.</p>
          </div>
          
          <form onSubmit={registrarOuAtualizarMovimento} style={styles.formGrid}>
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>Código do Tecido *</label>
              <input 
                type="text" 
                placeholder="Ex: TEC-001" 
                value={form.codigo} 
                onChange={(e) => setForm({...form, codigo: e.target.value})} 
                style={styles.input}
                required
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>Nome do Tecido *</label>
              <input 
                type="text" 
                placeholder="Ex: Malha Canelada" 
                value={form.nome} 
                onChange={(e) => setForm({...form, nome: e.target.value})} 
                style={styles.input}
                required
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>Cor do Tecido *</label>
              <input 
                type="text" 
                placeholder="Ex: Azul Marinho" 
                value={form.cor} 
                onChange={(e) => setForm({...form, cor: e.target.value})} 
                style={styles.input}
                required
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>Largura (m)</label>
              <input 
                type="number" 
                step="0.01"
                placeholder="Ex: 1.50" 
                value={form.largura} 
                onChange={(e) => setForm({...form, largura: e.target.value})} 
                style={styles.input}
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>Localização / Galpão *</label>
              <input 
                type="text" 
                placeholder="Ex: Galpão A - Setor 2" 
                value={form.localizacao} 
                onChange={(e) => setForm({...form, localizacao: e.target.value})} 
                style={styles.input}
                required
              />
            </div>
            <div style={{display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '10px'}}>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Quantidade *</label>
                <input 
                  type="number" 
                  step="0.01"
                  placeholder="0.00" 
                  value={form.quantidade} 
                  onChange={(e) => setForm({...form, quantidade: e.target.value, metros: e.target.value})} 
                  style={styles.input}
                  required
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Unidade</label>
                <select 
                  value={form.unidadeMedida} 
                  onChange={(e) => setForm({...form, unidadeMedida: e.target.value})}
                  style={styles.input}
                >
                  <option value="m">Metros (m)</option>
                  <option value="kg">Quilos (kg)</option>
                </select>
              </div>
            </div>
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>Estoque Mínimo de Alerta</label>
              <input 
                type="number" 
                step="0.01"
                placeholder="Ex: 180" 
                value={form.estoqueMinimo} 
                onChange={(e) => setForm({...form, estoqueMinimo: e.target.value})} 
                style={styles.input}
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>Valor Unitário (R$)</label>
              <input 
                type="number" 
                step="0.01"
                placeholder="Ex: 15.90" 
                value={form.preco} 
                onChange={(e) => setForm({...form, preco: e.target.value})} 
                style={styles.input}
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>Número da Nota Fiscal</label>
              <input 
                type="text" 
                placeholder="Ex: 45892" 
                value={form.notaFiscal} 
                onChange={(e) => setForm({...form, notaFiscal: e.target.value})} 
                style={styles.input}
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>Nome do Fornecedor</label>
              <input 
                type="text" 
                placeholder="Ex: Têxtil Exemplo S.A." 
                value={form.fornecedor} 
                onChange={(e) => setForm({...form, fornecedor: e.target.value})} 
                style={styles.input}
              />
            </div>
            
            <div style={{gridColumn: '1 / -1'}}>
              <label style={styles.fileLabel}>Anexar Imagem / Foto do Tecido (Opcional)</label>
              <input type="file" accept="image/*" capture="environment" onChange={handleFotoChange} style={styles.inputFile} />
            </div>

            {form.foto && (
              <div style={{gridColumn: '1 / -1', ...styles.previewContainer}}>
                <img src={form.foto} alt="Prévia" style={styles.previewImg} onClick={() => setFotoSelecionada(form.foto)} />
                <div>
                  <strong style={{display: 'block', color: '#065F46', fontSize: '13px'}}>Imagem anexada com sucesso</strong>
                  <span style={{color: '#047857', fontSize: '11px', cursor: 'pointer'}} onClick={() => setFotoSelecionada(form.foto)}>Clique na miniatura para ampliar</span>
                </div>
              </div>
            )}

            <div style={{gridColumn: '1 / -1', marginTop: '8px'}}>
              <button type="submit" disabled={carregando} style={{...styles.button, backgroundColor: idEditando ? '#D97706' : '#059669'}}>
                {carregando ? 'Processando dados...' : (idEditando ? 'Salvar Alterações' : 'Salvar Entrada no Servidor')}
              </button>
            </div>
          </form>
        </div>
      )}

      {abaAtiva === 'saida' && (
        <div style={styles.cardSection}>
          <div style={{ borderBottom: '1px solid #E2E8F0', paddingBottom: '12px', marginBottom: '20px' }}>
            <h3 style={{ ...styles.sectionTitle, margin: 0 }}>{idEditando ? '✏️ Editar Saída de Tecido' : '📤 Lançamento de Baixa / Saída'}</h3>
            <p style={{ color: '#64748B', fontSize: '13px', margin: '4px 0 0 0' }}>Busque pelo código ou nome do tecido e informe a quantidade consumida na produção.</p>
          </div>

          <form onSubmit={registrarOuAtualizarMovimento} style={styles.formGrid}>
            <div style={{gridColumn: '1 / -1'}}>
              <label style={styles.formLabel}>Localizar Tecido (Código ou Nome)</label>
              <div style={{display: 'flex', gap: '8px', alignItems: 'center'}}>
                <input 
                  type="text" 
                  placeholder="Ex: TEC-001 ou Malha" 
                  value={termoBuscaSaida} 
                  onChange={(e) => setTermoBuscaSaida(e.target.value)} 
                  style={{...styles.input, flex: 1}}
                />
                <button 
                  type="button"
                  onClick={executarBuscaSaida}
                  style={{padding: '12px 24px', backgroundColor: '#2563EB', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap', fontSize: '14px'}}
                >
                  OK / Buscar
                </button>
              </div>
            </div>

            <div style={{gridColumn: '1 / -1', display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '10px'}}>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Quantidade Utilizada *</label>
                <input 
                  type="number" 
                  step="0.01"
                  placeholder="0.00" 
                  value={form.quantidade} 
                  onChange={(e) => setForm({...form, quantidade: e.target.value, metros: e.target.value})} 
                  style={styles.input}
                  required
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Unidade</label>
                <select 
                  value={form.unidadeMedida} 
                  onChange={(e) => setForm({...form, unidadeMedida: e.target.value})}
                  style={styles.input}
                >
                  <option value="m">Metros (m)</option>
                  <option value="kg">Quilos (kg)</option>
                </select>
              </div>
            </div>

            <div style={{gridColumn: '1 / -1', background: '#F8FAFC', padding: '16px', borderRadius: '8px', border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', gap: '6px'}}>
              <span style={{fontSize: '11px', color: '#64748B', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px'}}>📋 Dados Carregados do Cadastro:</span>
              <div style={{fontSize: '13px', color: '#0F172A'}}><strong>Tecido:</strong> {form.codigo || '-'} / {form.nome || 'Aguardando busca...'} ({form.cor || '-'})</div>
              <div style={{fontSize: '13px', color: '#0F172A'}}><strong>Largura:</strong> {form.largura ? `${form.largura}m` : 'Não informada'}</div>
              <div style={{fontSize: '13px', color: '#0F172A'}}><strong>Localização:</strong> {form.localizacao || '-'}</div>
              <div style={{fontSize: '13px', color: '#0F172A'}}><strong>Estoque Mínimo:</strong> {form.estoqueMinimo || '0'} {form.unidadeMedida}</div>
            </div>

            <div style={{gridColumn: '1 / -1', marginTop: '8px'}}>
              <button type="submit" disabled={carregando} style={{...styles.button, backgroundColor: idEditando ? '#D97706' : '#DC2626'}}>
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
                            <img 
                              src={item.foto} 
                              alt="Tecido" 
                              style={styles.tableImgClickable} 
                              title="Clique para ampliar"
                              onClick={() => setFotoSelecionada(item.foto)} 
                            />
                          ) : (
                            <span style={styles.noFoto}>Sem foto</span>
                          )}
                        </td>
                        <td style={styles.td}>
                          <span style={{
                            ...styles.badge, 
                            background: badgeBg,
                            color: badgeColor
                          }}>
                            {badgeText}
                          </span>
                        </td>
                        <td style={styles.td}><strong>{item.codigo}</strong></td>
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
                        <td style={styles.td}>{item.data}</td>
                        <td style={styles.td}>
                          <button 
                            onClick={() => iniciarEdicao(item)} 
                            style={styles.btnEditar} 
                            title="Editar registro"
                          >
                            ✏️
                          </button>
                          <button 
                            onClick={() => deletarItem(item.id)} 
                            style={styles.btnDeletar} 
                            title="Remover registro"
                          >
                            🗑️
                          </button>
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
    backgroundColor: '#0F172A',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  loginCard: {
    backgroundColor: '#ffffff',
    padding: '40px',
    borderRadius: '12px',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)',
    width: '100%',
    maxWidth: '410px',
    boxSizing: 'border-box',
    border: '1px solid rgba(255,255,255,0.1)'
  },
  loginLabel: {
    fontSize: '12px',
    color: '#475569',
    marginBottom: '6px',
    display: 'block',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: '0.3px'
  },
  errorBox: {
    backgroundColor: '#FEF2F2',
    color: '#DC2626',
    padding: '10px',
    borderRadius: '6px',
    fontSize: '13px',
    textAlign: 'center',
    fontWeight: '600',
    border: '1px solid #FCA5A5'
  },
  container: {
    width: '100%',
    margin: '0',
    padding: '24px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    backgroundColor: '#F8FAFC',
    minHeight: '100vh',
    boxSizing: 'border-box',
  },
  header: { 
    marginBottom: '20px', 
    display: 'flex', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    flexWrap: 'wrap', 
    gap: '16px',
    backgroundColor: '#ffffff',
    padding: '18px 24px',
    borderRadius: '10px',
    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.04)',
    border: '1px solid #E2E8F0'
  },
  title: { fontSize: '20px', color: '#0F172A', margin: '0 0 2px 0', fontWeight: '800', letterSpacing: '-0.5px' },
  subtitle: { fontSize: '12px', color: '#64748B', margin: 0, fontWeight: '500' },
  statusBadgeContainer: { display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#F0FDF4', padding: '6px 12px', borderRadius: '20px', border: '1px solid #BBF7D0' },
  pulseDot: { width: '8px', height: '8px', backgroundColor: '#059669', borderRadius: '50%', display: 'inline-block' },
  statusText: { fontSize: '12px', color: '#065F46', fontWeight: '600' },
  logoutBtn: {
    padding: '8px 16px',
    backgroundColor: '#FEE2E2',
    color: '#991B1B',
    border: 'none',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background 0.2s',
  },
  alertaContainer: {
    backgroundColor: '#FEF2F2',
    border: '1px solid #FCA5A5',
    padding: '16px',
    borderRadius: '8px',
    marginBottom: '20px',
  },
  navTabs: {
    display: 'flex',
    gap: '10px',
    marginBottom: '20px',
    overflowX: 'auto',
    paddingBottom: '4px',
  },
  tabBtn: {
    padding: '12px 20px',
    backgroundColor: '#FFFFFF',
    color: '#475569',
    border: '1px solid #E2E8F0',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.02)',
  },
  tabActive: {
    backgroundColor: '#2563EB',
    color: '#ffffff',
    borderColor: '#2563EB',
    boxShadow: '0 4px 6px -1px rgba(37, 99, 235, 0.2)',
  },
  carrosselContainer: {
    display: 'flex',
    gap: '16px',
    overflowX: 'auto',
    paddingBottom: '8px',
    WebkitOverflowScrolling: 'touch',
  },
  carrosselCard: {
    backgroundColor: '#FFFFFF',
    border: '1px solid #E2E8F0',
    borderRadius: '10px',
    padding: '16px',
    minWidth: '220px',
    maxWidth: '220px',
    flexShrink: 0,
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
  },
  cardsContainer: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '16px',
  },
  card: {
    backgroundColor: '#ffffff',
    padding: '20px',
    borderRadius: '10px',
    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.04)',
    border: '1px solid #E2E8F0',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  cardLabel: { fontSize: '11px', color: '#64748B', marginBottom: '8px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' },
  cardValue: { fontSize: '24px', fontWeight: '800', letterSpacing: '-0.5px' },
  cardSection: {
    backgroundColor: '#ffffff',
    padding: '24px',
    borderRadius: '10px',
    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.04)',
    border: '1px solid #E2E8F0',
    marginBottom: '20px',
  },
  sectionTitle: { fontSize: '16px', color: '#0F172A', marginBottom: '16px', marginTop: 0, fontWeight: '700', letterSpacing: '-0.3px' },
  formGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' },
  formGroup: { display: 'flex', flexDirection: 'column' },
  formLabel: { fontSize: '12px', color: '#475569', marginBottom: '6px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.3px' },
  input: {
    width: '100%',
    padding: '11px 14px',
    borderRadius: '6px',
    border: '1px solid #CBD5E1',
    fontSize: '14px',
    outline: 'none',
    boxSizing: 'border-box',
    backgroundColor: '#F8FAFC',
    color: '#0F172A',
  },
  inputFull: {
    width: '100%',
    padding: '12px 14px',
    borderRadius: '6px',
    border: '1px solid #CBD5E1',
    fontSize: '14px',
    outline: 'none',
    boxSizing: 'border-box',
    backgroundColor: '#F8FAFC',
    color: '#0F172A',
    marginBottom: '16px',
  },
  previewContainer: { display: 'flex', alignItems: 'center', gap: '12px', background: '#F0FDF4', padding: '12px', borderRadius: '8px', border: '1px solid #BBF7D0' },
  previewImg: { width: '48px', height: '48px', objectFit: 'cover', borderRadius: '6px', cursor: 'pointer', border: '2px solid #059669' },
  button: {
    width: '100%',
    padding: '14px',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '700',
    cursor: 'pointer',
    boxShadow: '0 2px 4px rgba(0,0,0,0.08)',
    letterSpacing: '0.3px'
  },
  chartContainer: { display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' },
  tableResponsive: { width: '100%', overflowX: 'auto', WebkitOverflowScrolling: 'touch' },
  table: { width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '900px' },
  thTr: { borderBottom: '2px solid #E2E8F0', backgroundColor: '#F8FAFC' },
  th: { padding: '12px 10px', fontSize: '11px', color: '#475569', textTransform: 'uppercase', fontWeight: '700', letterSpacing: '0.5px' },
  tr: { borderBottom: '1px solid #E2E8F0' },
  td: { padding: '14px 10px', fontSize: '13px', color: '#334155', verticalAlign: 'middle' },
  localBadge: { padding: '4px 8px', borderRadius: '6px', fontSize: '12px', backgroundColor: '#EFF6FF', color: '#1D4ED8', fontWeight: '600' },
  btnEditar: {
    padding: '6px 10px',
    backgroundColor: '#EFF6FF',
    color: '#1D4ED8',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    marginRight: '6px',
    fontSize: '13px',
    fontWeight: '600',
  },
  btnDeletar: {
    padding: '6px 10px',
    backgroundColor: '#FEE2E2',
    color: '#991B1B',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '600',
  },
  empty: { textAlign: 'center', padding: '32px', color: '#94A3B8', fontSize: '14px' },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    padding: '20px',
  },
  modalContent: {
    backgroundColor: '#fff',
    padding: '20px',
    borderRadius: '10px',
    maxWidth: '90vw',
    maxHeight: '90vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
  },
  modalCloseBtn: {
    backgroundColor: '#DC2626',
    color: '#fff',
    border: 'none',
    padding: '8px 14px',
    borderRadius: '6px',
    fontWeight: '700',
    cursor: 'pointer',
    marginBottom: '12px',
    fontSize: '13px',
  },
  modalImg: {
    maxWidth: '80vw',
    maxHeight: '75vh',
    objectFit: 'contain',
    borderRadius: '6px',
  }
};

export default SunnyWearTecidos;