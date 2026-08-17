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
    foto: ''
  });

  const [busca, setBusca] = useState('');

  const API_URL = 'http://localhost:3001/api/movimentacoes';

  // Função blindada para sempre resgatar o estoque mínimo, independente de letras maiúsculas/minúsculas do banco
  const obterMinimo = (item) => Number(item.estoqueminimo || item.estoqueMinimo || item.estoque_minimo || 0);
  
  // Função blindada para o tipo de movimento
  const obterTipo = (item) => item.tipomovimento || item.tipoMovimento || 'entrada';

  const carregarDadosDoServidor = async () => {
    try {
      const resposta = await fetch(API_URL);
      const dados = await resposta.json();
      setMovimentacoes(dados);
    } catch (erro) {
      console.error('Erro ao conectar com o back-end:', erro);
    }
  };

  useEffect(() => {
    if (autenticado) {
      carregarDadosDoServidor();
      const intervalo = setInterval(carregarDadosDoServidor, 5000);
      return () => clearInterval(intervalo);
    }
  }, [autenticado]);

  const handleLogin = (e) => {
    e.preventDefault();
    if (usuarioInput === 'sunnytecido' && senhaInput === 'tecido@2026') {
      setAutenticado(true);
      localStorage.setItem('sunny_auth', 'true');
      setErroLogin('');
    } else {
      setErroLogin('Usuário ou senha incorretos!');
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

  const handleBuscaSaidaChange = (valorDigitado) => {
    const termo = valorDigitado.toLowerCase();
    const tecidoEncontrado = movimentacoes.find(
      m => (m.codigo && m.codigo.toLowerCase().includes(termo)) || 
           (m.nome && m.nome.toLowerCase().includes(termo))
    );

    if (tecidoEncontrado && termo.trim() !== '') {
      const minEncontrado = obterMinimo(tecidoEncontrado) || '';
      setForm(prev => ({
        ...prev,
        tipoMovimento: 'saida',
        codigo: tecidoEncontrado.codigo || valorDigitado,
        nome: tecidoEncontrado.nome || '',
        cor: tecidoEncontrado.cor || '',
        localizacao: tecidoEncontrado.localizacao || '',
        unidadeMedida: tecidoEncontrado.unidademedida || tecidoEncontrado.unidadeMedida || 'm',
        preco: tecidoEncontrado.preco || '',
        estoqueMinimo: minEncontrado,
        notaFiscal: tecidoEncontrado.notafiscal || tecidoEncontrado.notaFiscal || '',
        fornecedor: tecidoEncontrado.fornecedor || '',
        foto: tecidoEncontrado.foto || ''
      }));
    } else {
      setForm(prev => ({
        ...prev,
        tipoMovimento: 'saida',
        codigo: valorDigitado,
        nome: valorDigitado
      }));
    }
  };

  const registrarOuAtualizarMovimento = async (e) => {
    e.preventDefault();
    const qtdValida = form.quantidade || form.metros;
    if (!form.codigo || !form.nome || !form.cor || !form.localizacao || !qtdValida) return;

    const tipoFinal = abaAtiva === 'entrada' ? 'entrada' : 'saida';

    let minFinal = Number(form.estoqueMinimo || 0);
    // Tenta puxar o mínimo de outra entrada do mesmo código caso o usuário deixe zerado
    if (minFinal === 0) {
      const regEntrada = movimentacoes.find(m => m.codigo && m.codigo.toLowerCase() === form.codigo.toLowerCase() && obterMinimo(m) > 0);
      if (regEntrada) {
        minFinal = obterMinimo(regEntrada);
      }
    }

    if (tipoFinal === 'saida') {
      const entradasTotais = movimentacoes.filter(m => {
        return m.codigo && m.codigo.toLowerCase() === form.codigo.toLowerCase() && obterTipo(m) === 'entrada';
      }).reduce((acc, m) => acc + Number(m.metros || m.quantidade || 0), 0);
      
      const saidasTotais = movimentacoes.filter(m => {
        return m.codigo && m.codigo.toLowerCase() === form.codigo.toLowerCase() && obterTipo(m) === 'saida';
      }).reduce((acc, m) => acc + Number(m.metros || m.quantidade || 0), 0);
      
      const saldoAtual = entradasTotais - saidasTotais;
      const qtdSaida = Number(qtdValida);

      if (minFinal > 0 && (saldoAtual - qtdSaida) < minFinal) {
        alert(`⚠️ ALERTA DE ESTOQUE MÍNIMO!\n\nAtenção: Esta saída deixará o tecido "${form.nome}" com saldo ${(saldoAtual - qtdSaida).toFixed(2)}, ficando abaixo do mínimo permitido (${minFinal}).`);
      }
    }

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
        alert(idEditando ? 'Registro atualizado com sucesso!' : 'Cadastrado com sucesso!');
        setForm({ tipoMovimento: 'entrada', codigo: '', nome: '', cor: '', localizacao: '', quantidade: '', metros: '', unidadeMedida: 'm', preco: '', estoqueMinimo: '', notaFiscal: '', fornecedor: '', foto: '' });
        setIdEditando(null);
        carregarDadosDoServidor();
        setAbaAtiva('historico');
      } else {
        const erroServidor = await resposta.json().catch(() => ({}));
        alert('Erro ao salvar no servidor: ' + (erroServidor.erro || resposta.statusText));
      }
    } catch (erro) {
      console.error('Erro ao salvar no servidor:', erro);
      alert('Erro ao conectar com o servidor back-end.');
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
    const minItem = obterMinimo(item) || '';
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
      estoqueMinimo: minItem,
      notaFiscal: item.notafiscal || item.notaFiscal || '',
      fornecedor: item.fornecedor || '',
      foto: item.foto || ''
    });
    setAbaAtiva(tipoItem === 'saida' ? 'saida' : 'entrada');
  };

  const deletarItem = async (id) => {
    if (!window.confirm('Tem certeza que deseja apagar este tecido/registro?')) return;

    try {
      const resposta = await fetch(`${API_URL}/${encodeURIComponent(id)}`, {
        method: 'DELETE'
      });

      if (resposta.ok) {
        alert('Registro apagado com sucesso!');
        carregarDadosDoServidor();
      } else {
        alert('Erro ao apagar o registro no servidor.');
      }
    } catch (erro) {
      console.error('Erro ao deletar:', erro);
      alert('Erro de conexão com o servidor ao tentar apagar.');
    }
  };

  const tecidosConsolidados = {};
  const usoTecidos = {};

  movimentacoes.forEach(m => {
    if (!m.codigo) return;
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
    } else {
      tecidosConsolidados[cod].total -= qtd;
    }

    if (!usoTecidos[cod]) {
      usoTecidos[cod] = { nome: m.nome || 'Tecido', codigo: m.codigo, cor: m.cor || 'N/D', totalUso: 0, unidade: m.unidademedida || m.unidadeMedida || 'm' };
    }
    if (tipoM === 'saida') {
      usoTecidos[cod].totalUso += qtd;
    }

    // Garante que se houver um mínimo configurado em algum registro desse tecido, ele salva
    if (minReg > 0) tecidosConsolidados[cod].minimo = minReg;
  });

  const alertasEstoqueBaixo = Object.values(tecidosConsolidados).filter(t => t.minimo > 0 && t.total < t.minimo);

  const topTecidosMaisUsados = Object.values(usoTecidos)
    .filter(t => t.totalUso > 0)
    .sort((a, b) => b.totalUso - a.totalUso)
    .slice(0, 5);

  const entradasMetros = movimentacoes
    .filter(m => obterTipo(m) === 'entrada' && (m.unidademedida === 'm' || m.unidadeMedida === 'm' || !m.unidademedida))
    .reduce((acc, m) => acc + Number(m.metros || m.quantidade || 0), 0);

  const entradasKg = movimentacoes
    .filter(m => obterTipo(m) === 'entrada' && (m.unidademedida === 'kg' || m.unidadeMedida === 'kg'))
    .reduce((acc, m) => acc + Number(m.metros || m.quantidade || 0), 0);

  const saidasMetros = movimentacoes
    .filter(m => obterTipo(m) === 'saida' && (m.unidademedida === 'm' || m.unidadeMedida === 'm' || !m.unidademedida))
    .reduce((acc, m) => acc + Number(m.metros || m.quantidade || 0), 0);

  const saidasKg = movimentacoes
    .filter(m => obterTipo(m) === 'saida' && (m.unidademedida === 'kg' || m.unidadeMedida === 'kg'))
    .reduce((acc, m) => acc + Number(m.metros || m.quantidade || 0), 0);

  const estoqueMetros = entradasMetros - saidasMetros;
  const estoqueKg = entradasKg - saidasKg;

  const porLocalizacao = movimentacoes.reduce((acc, m) => {
    const loc = m.localizacao || 'Não definido';
    if (!acc[loc]) acc[loc] = { m: 0, kg: 0 };
    const qtd = Number(m.metros || m.quantidade || 0);
    const unidade = m.unidademedida || m.unidadeMedida || 'm';
    const tipoM = obterTipo(m);
    
    if (tipoM === 'entrada') {
      acc[loc][unidade] += qtd;
    } else if (tipoM === 'saida') {
      acc[loc][unidade] -= qtd;
    }
    return acc;
  }, {});

  const movFiltradas = movimentacoes.filter(m => {
    const termo = busca.toLowerCase();
    const codigo = (m.codigo || '').toLowerCase();
    const nome = (m.nome || '').toLowerCase();
    const cor = (m.cor || '').toLowerCase();
    const localizacao = (m.localizacao || '').toLowerCase();
    const fornecedor = (m.fornecedor || '').toLowerCase();
    const notaFiscal = (m.notafiscal || m.notaFiscal || '').toLowerCase();
    return codigo.includes(termo) || nome.includes(termo) || cor.includes(termo) || localizacao.includes(termo) || fornecedor.includes(termo) || notaFiscal.includes(termo);
  });

  if (!autenticado) {
    return (
      <div style={styles.loginContainer}>
        <div style={styles.loginCard}>
          <h1 style={{ color: '#1a73e8', marginBottom: '8px', textAlign: 'center' }}>Sunny Wear</h1>
          <p style={{ color: '#5f6368', fontSize: '14px', marginBottom: '24px', textAlign: 'center' }}>Controle de Estoque e Galpões de Tecidos</p>
          
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={styles.loginLabel}>Usuário:</label>
              <input 
                type="text" 
                placeholder="Digite o usuário" 
                value={usuarioInput} 
                onChange={(e) => setUsuarioInput(e.target.value)} 
                style={styles.input}
                required
              />
            </div>
            <div>
              <label style={styles.loginLabel}>Senha:</label>
              <input 
                type="password" 
                placeholder="Digite a senha" 
                value={senhaInput} 
                onChange={(e) => setSenhaInput(e.target.value)} 
                style={styles.input}
                required
              />
            </div>
            {erroLogin && <span style={{ color: '#c5221f', fontSize: '13px', textAlign: 'center' }}>{erroLogin}</span>}
            <button type="submit" style={{ ...styles.button, backgroundColor: '#1a73e8', marginTop: '8px' }}>Entrar no Sistema</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Sunny Wear</h1>
          <p style={styles.subtitle}>Dashboard em Tempo Real 🟢</p>
        </div>
        <button onClick={handleLogout} style={styles.logoutBtn}>Sair (Logout)</button>
      </div>

      {alertasEstoqueBaixo.length > 0 && (
        <div style={styles.alertaContainer}>
          <strong style={{ color: '#c5221f' }}>🚨 ALERTA: Tecidos abaixo do estoque mínimo configurado:</strong>
          <ul style={{ margin: '6px 0 0 16px', padding: 0, fontSize: '13px', color: '#c5221f' }}>
            {alertasEstoqueBaixo.map((alt, idx) => (
              <li key={idx}>
                <strong>{alt.nome}</strong> (Cód: {alt.codigo}) — Atual: <strong>{alt.total} {alt.unidade}</strong> (Mínimo exigido: {alt.minimo} {alt.unidade})
              </li>
            ))}
          </ul>
        </div>
      )}

      <div style={styles.navTabs}>
        <button 
          onClick={() => setAbaAtiva('dashboard')} 
          style={{ ...styles.tabBtn, ...(abaAtiva === 'dashboard' ? styles.tabActive : {}) }}
        >
          📊 Dashboard em Tempo Real
        </button>
        <button 
          onClick={() => { setIdEditando(null); setForm({ tipoMovimento: 'entrada', codigo: '', nome: '', cor: '', localizacao: '', quantidade: '', metros: '', unidadeMedida: 'm', preco: '', estoqueMinimo: '', notaFiscal: '', fornecedor: '', foto: '' }); setAbaAtiva('entrada'); }} 
          style={{ ...styles.tabBtn, ...(abaAtiva === 'entrada' ? styles.tabActive : {}) }}
        >
          📥 Registrar Entrada (Compra)
        </button>
        <button 
          onClick={() => { setIdEditando(null); setForm({ tipoMovimento: 'saida', codigo: '', nome: '', cor: '', localizacao: '', quantidade: '', metros: '', unidadeMedida: 'm', preco: '', estoqueMinimo: '', notaFiscal: '', fornecedor: '', foto: '' }); setAbaAtiva('saida'); }} 
          style={{ ...styles.tabBtn, ...(abaAtiva === 'saida' ? styles.tabActive : {}) }}
        >
          📤 Registrar Saída (Uso)
        </button>
        <button 
          onClick={() => setAbaAtiva('historico')} 
          style={{ ...styles.tabBtn, ...(abaAtiva === 'historico' ? styles.tabActive : {}) }}
        >
          🔍 Localizar & Galpões
        </button>
      </div>

      {abaAtiva === 'dashboard' && (
        <div>
          <div style={styles.cardSection}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ ...styles.sectionTitle, margin: 0 }}>🔥 Top 5 Tecidos Mais Usados (Arraste para o lado ➔)</h3>
              <span style={{ fontSize: '11px', color: '#1a73e8', backgroundColor: '#e8f0fe', padding: '3px 8px', borderRadius: '12px', fontWeight: '600' }}>● Ao vivo</span>
            </div>
            
            {topTecidosMaisUsados.length === 0 ? (
              <p style={styles.empty}>Nenhuma saída registrada ainda para calcular os mais usados.</p>
            ) : (
              <div style={styles.carrosselContainer}>
                {topTecidosMaisUsados.map((tecido, index) => {
                  const posicoesNomes = ['1º Primeiro', '2º Segundo', '3º Terceiro', '4º Quarto', '5º Quinto'];
                  const coresBordas = ['#1a73e8', '#137333', '#f9ab00', '#c5221f', '#9334e6'];
                  return (
                    <div 
                      key={index} 
                      style={{ 
                        ...styles.carrosselCard, 
                        borderTop: `4px solid ${coresBordas[index] || '#1a73e8'}` 
                      }}
                    >
                      <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#5f6368', textTransform: 'uppercase', marginBottom: '4px', display: 'block' }}>
                        {posicoesNomes[index] || `${index + 1}º Lugar`}
                      </span>
                      <strong style={{ fontSize: '15px', color: '#202124', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {tecido.nome}
                      </strong>
                      <span style={{ fontSize: '12px', color: '#5f6368', display: 'block', marginBottom: '8px' }}>
                        Cor: {tecido.cor || 'N/D'} | Cód: {tecido.codigo}
                      </span>
                      <div style={{ fontSize: '16px', fontWeight: 'bold', color: coresBordas[index] || '#1a73e8', marginTop: 'auto' }}>
                        {tecido.totalUso.toLocaleString()} {tecido.unidade}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div style={styles.cardSection}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ ...styles.sectionTitle, margin: 0 }}>📥 Total de Entradas (Compras)</h3>
              <span style={{ fontSize: '12px', color: '#137333', backgroundColor: '#e6f4ea', padding: '3px 8px', borderRadius: '12px', fontWeight: '600' }}>● Tempo real</span>
            </div>
            <div style={styles.cardsContainer}>
              <div style={{...styles.card, borderLeft: '4px solid #137333'}}>
                <span style={styles.cardLabel}>Entradas em Metros</span>
                <strong style={{...styles.cardValue, color: '#137333'}}>{entradasMetros.toLocaleString()} m</strong>
              </div>
              <div style={{...styles.card, borderLeft: '4px solid #137333'}}>
                <span style={styles.cardLabel}>Entradas em Quilos</span>
                <strong style={{...styles.cardValue, color: '#137333'}}>{entradasKg.toLocaleString()} kg</strong>
              </div>
            </div>
          </div>

          <div style={styles.cardSection}>
            <h3 style={styles.sectionTitle}>📤 Total de Saídas (Uso na Produção)</h3>
            <div style={styles.cardsContainer}>
              <div style={{...styles.card, borderLeft: '4px solid #c5221f'}}>
                <span style={styles.cardLabel}>Saídas em Metros</span>
                <strong style={{...styles.cardValue, color: '#c5221f'}}>{saidasMetros.toLocaleString()} m</strong>
              </div>
              <div style={{...styles.card, borderLeft: '4px solid #c5221f'}}>
                <span style={styles.cardLabel}>Saídas em Quilos</span>
                <strong style={{...styles.cardValue, color: '#c5221f'}}>{saidasKg.toLocaleString()} kg</strong>
              </div>
            </div>
          </div>

          <div style={styles.cardSection}>
            <h3 style={styles.sectionTitle}>📦 Estoque Geral Atual</h3>
            <div style={styles.cardsContainer}>
              <div style={{...styles.card, borderLeft: '4px solid #1a73e8'}}>
                <span style={styles.cardLabel}>Saldo Líquido em Metros</span>
                <strong style={{...styles.cardValue, color: '#1a73e8'}}>{estoqueMetros.toLocaleString()} m</strong>
              </div>
              <div style={{...styles.card, borderLeft: '4px solid #f9ab00'}}>
                <span style={styles.cardLabel}>Saldo Líquido em Quilos</span>
                <strong style={{...styles.cardValue, color: '#e37400'}}>{estoqueKg.toLocaleString()} kg</strong>
              </div>
            </div>
          </div>

          <div style={styles.cardSection}>
            <h3 style={styles.sectionTitle}>🏢 Distribuição do Estoque por Galpão / Local</h3>
            <div style={styles.chartContainer}>
              {Object.keys(porLocalizacao).length === 0 ? (
                <p style={styles.empty}>Nenhum dado de localização cadastrado.</p>
              ) : (
                Object.entries(porLocalizacao).map(([local, vals]) => (
                  <div key={local} style={{...styles.chartBarWrapper, marginBottom: '12px', background: '#f8f9fa', padding: '10px', borderRadius: '6px'}}>
                    <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '4px'}}>
                      <span style={{...styles.chartLabelText, fontWeight: 'bold'}}>📍 {local}</span>
                    </div>
                    <div style={{display: 'flex', gap: '16px', fontSize: '14px'}}>
                      <span style={{color: '#1a73e8'}}>Metros: <strong>{vals.m} m</strong></span>
                      <span style={{color: '#e37400'}}>Quilos: <strong>{vals.kg} kg</strong></span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {abaAtiva === 'entrada' && (
        <div style={styles.cardSection}>
          <h3 style={styles.sectionTitle}>{idEditando ? '✏️ Editar Entrada de Tecido' : '📥 Registrar Compra / Entrada de Tecido'}</h3>
          <form onSubmit={registrarOuAtualizarMovimento} style={styles.formGrid}>
            <input 
              type="text" 
              placeholder="Código do Tecido (Ex: TEC-001)" 
              value={form.codigo} 
              onChange={(e) => setForm({...form, codigo: e.target.value})} 
              style={styles.input}
              required
            />
            <input 
              type="text" 
              placeholder="Nome do Tecido (Ex: Malha Canelada)" 
              value={form.nome} 
              onChange={(e) => setForm({...form, nome: e.target.value})} 
              style={styles.input}
              required
            />
            <input 
              type="text" 
              placeholder="Cor do Tecido (Ex: Azul Marinho)" 
              value={form.cor} 
              onChange={(e) => setForm({...form, cor: e.target.value})} 
              style={styles.input}
              required
            />
            <input 
              type="text" 
              placeholder="Localização (Ex: Sunny Galpão 1)" 
              value={form.localizacao} 
              onChange={(e) => setForm({...form, localizacao: e.target.value})} 
              style={styles.input}
              required
            />
            <div style={{display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '8px'}}>
              <input 
                type="number" 
                step="0.01"
                placeholder="Quantidade (Metros ou Kg)" 
                value={form.quantidade} 
                onChange={(e) => setForm({...form, quantidade: e.target.value, metros: e.target.value})} 
                style={styles.input}
                required
              />
              <select 
                value={form.unidadeMedida} 
                onChange={(e) => setForm({...form, unidadeMedida: e.target.value})}
                style={styles.input}
              >
                <option value="m">Metros (m)</option>
                <option value="kg">Quilos (kg)</option>
              </select>
            </div>
            <input 
              type="number" 
              step="0.01"
              placeholder="Estoque Mínimo (Alerta de Limite)" 
              value={form.estoqueMinimo} 
              onChange={(e) => setForm({...form, estoqueMinimo: e.target.value})} 
              style={styles.input}
            />
            <input 
              type="number" 
              step="0.01"
              placeholder="Valor Unitário (R$ Ex: 15.90 por m ou kg)" 
              value={form.preco} 
              onChange={(e) => setForm({...form, preco: e.target.value})} 
              style={styles.input}
            />
            <input 
              type="text" 
              placeholder="Número da Nota Fiscal" 
              value={form.notaFiscal} 
              onChange={(e) => setForm({...form, notaFiscal: e.target.value})} 
              style={styles.input}
            />
            <input 
              type="text" 
              placeholder="Nome do Fornecedor" 
              value={form.fornecedor} 
              onChange={(e) => setForm({...form, fornecedor: e.target.value})} 
              style={styles.input}
            />
            
            <div style={styles.fileContainer}>
              <label style={styles.fileLabel}>Foto do Tecido (Opcional):</label>
              <input type="file" accept="image/*" capture="environment" onChange={handleFotoChange} style={styles.inputFile} />
            </div>

            {form.foto && (
              <div style={styles.previewContainer}>
                <img src={form.foto} alt="Prévia" style={styles.previewImg} onClick={() => setFotoSelecionada(form.foto)} />
                <span style={styles.previewText}>Foto anexada! (Clique para ampliar)</span>
              </div>
            )}

            <button type="submit" disabled={carregando} style={{...styles.button, backgroundColor: idEditando ? '#f9ab00' : '#137333'}}>
              {carregando ? 'Salvando...' : (idEditando ? 'Salvar Alterações' : 'Salvar Entrada no Servidor')}
            </button>
          </form>
        </div>
      )}

      {abaAtiva === 'saida' && (
        <div style={styles.cardSection}>
          <h3 style={styles.sectionTitle}>{idEditando ? '✏️ Editar Saída de Tecido' : '📤 Registrar Uso / Saída de Tecido'}</h3>
          <form onSubmit={registrarOuAtualizarMovimento} style={styles.formGrid}>
            <input 
              type="text" 
              placeholder="Digite o Código ou Nome do Tecido para puxar automaticamente" 
              value={form.codigo} 
              onChange={(e) => handleBuscaSaidaChange(e.target.value)} 
              style={styles.input}
              required
            />
            <div style={{display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '8px'}}>
              <input 
                type="number" 
                step="0.01"
                placeholder="Quantidade Utilizada" 
                value={form.quantidade} 
                onChange={(e) => setForm({...form, quantidade: e.target.value, metros: e.target.value})} 
                style={styles.input}
                required
              />
              <select 
                value={form.unidadeMedida} 
                onChange={(e) => setForm({...form, unidadeMedida: e.target.value})}
                style={styles.input}
              >
                <option value="m">Metros (m)</option>
                <option value="kg">Quilos (kg)</option>
              </select>
            </div>

            <div style={{background: '#f8f9fa', padding: '12px', borderRadius: '6px', border: '1px solid #dadce0', display: 'flex', flexDirection: 'column', gap: '8px'}}>
              <span style={{fontSize: '12px', color: '#5f6368', fontWeight: 'bold'}}>📋 Informações puxadas do cadastro:</span>
              <div style={{fontSize: '13px', color: '#3c4043'}}><strong>Código / Nome:</strong> {form.codigo || '-'} / {form.nome || 'Aguardando...'} ({form.cor || '-'})</div>
              <div style={{fontSize: '13px', color: '#3c4043'}}><strong>Localização:</strong> {form.localizacao || '-'}</div>
              <div style={{fontSize: '13px', color: '#3c4043'}}><strong>Estoque Mínimo Configurado:</strong> {form.estoqueMinimo || '0'} {form.unidadeMedida}</div>
            </div>

            <button type="submit" disabled={carregando} style={{...styles.button, backgroundColor: idEditando ? '#f9ab00' : '#c5221f'}}>
              {carregando ? 'Salvando...' : (idEditando ? 'Salvar Alterações' : 'Registrar Saída no Servidor')}
            </button>
          </form>
        </div>
      )}

      {abaAtiva === 'historico' && (
        <div style={styles.cardSection}>
          <h3 style={styles.sectionTitle}>🔍 Localizar Tecidos, Notas Fiscais & Fornecedores</h3>
          <input 
            type="text" 
            placeholder="Digite para pesquisar (ex: Nome, Fornecedor, NF, Galpão, Código)..." 
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
                  <th style={styles.th}>Qtd & Mínimo</th>
                  <th style={styles.th}>Data</th>
                  <th style={styles.th}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {movFiltradas.length === 0 ? (
                  <tr>
                    <td colSpan="9" style={styles.empty}>Nenhum registro encontrado.</td>
                  </tr>
                ) : (
                  movFiltradas.map((item) => {
                    const precoUnit = Number(item.preco) || 0;
                    const qtd = Number(item.metros || item.quantidade || 0);
                    const unidade = item.unidademedida || item.unidadeMedida || 'm';
                    const tipoMovimentoNoBanco = obterTipo(item);
                    
                    let minimo = obterMinimo(item);

                    // Se não tiver mínimo, procura nas outras entradas do mesmo tecido
                    if (minimo === 0 && item.codigo) {
                      const regOrigem = movimentacoes.find(m => m.codigo && m.codigo.toLowerCase() === item.codigo.toLowerCase() && obterMinimo(m) > 0);
                      if (regOrigem) {
                        minimo = obterMinimo(regOrigem);
                      }
                    }

                    const custoTotal = qtd * precoUnit;
                    const nf = item.notafiscal || item.notaFiscal || '';
                    const fornecedor = item.fornecedor || '';
                    return (
                      <tr key={item.id} style={styles.tr}>
                        <td style={styles.td}>
                          {item.foto ? (
                            <img 
                              src={item.foto} 
                              alt="Tecido" 
                              style={styles.tableImgClickable} 
                              title="Clique para ampliar a foto"
                              onClick={() => setFotoSelecionada(item.foto)} 
                            />
                          ) : (
                            <span style={styles.noFoto}>Sem foto</span>
                          )}
                        </td>
                        <td style={styles.td}>
                          <span style={{
                            ...styles.badge, 
                            background: tipoMovimentoNoBanco === 'entrada' ? '#e6f4ea' : '#fce8e6',
                            color: tipoMovimentoNoBanco === 'entrada' ? '#137333' : '#c5221f'
                          }}>
                            {tipoMovimentoNoBanco === 'entrada' ? '📥 Entrada' : '📤 Saída'}
                          </span>
                        </td>
                        <td style={styles.td}><strong>{item.codigo}</strong></td>
                        <td style={styles.td}>{item.nome} ({item.cor})</td>
                        <td style={styles.td}>
                          <div style={{fontSize: '13px', fontWeight: '500', color: '#202124'}}>{fornecedor || 'Não informado'}</div>
                          <div style={{fontSize: '11px', color: '#5f6368'}}>NF: {nf || 'N/D'}</div>
                        </td>
                        <td style={styles.td}><span style={styles.localBadge}>📍 {item.localizacao}</span></td>
                        <td style={styles.td}>
                          <strong>{qtd} {unidade}</strong>
                          <div style={{fontSize: '11px', color: '#1a73e8'}}>Mín: {minimo} {unidade}</div>
                          <div style={{fontSize: '11px', color: '#5f6368'}}>
                            R$ {precoUnit.toFixed(2)} | <strong>Tot: R$ {custoTotal.toFixed(2)}</strong>
                          </div>
                        </td>
                        <td style={styles.td}>{item.data}</td>
                        <td style={styles.td}>
                          <button 
                            onClick={() => iniciarEdicao(item)} 
                            style={styles.btnEditar} 
                            title="Editar este registro"
                          >
                            ✏️
                          </button>
                          <button 
                            onClick={() => deletarItem(item.id)} 
                            style={styles.btnDeletar} 
                            title="Apagar este registro"
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
            <button style={styles.modalCloseBtn} onClick={() => setFotoSelecionada(null)}>✕ Fechar</button>
            <img src={fotoSelecionada} alt="Zoom do Tecido" style={styles.modalImg} />
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
    backgroundColor: '#f8f9fa',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  loginCard: {
    backgroundColor: '#ffffff',
    padding: '32px',
    borderRadius: '12px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    width: '100%',
    maxWidth: '380px',
    boxSizing: 'border-box',
  },
  loginLabel: {
    fontSize: '13px',
    color: '#5f6368',
    marginBottom: '6px',
    display: 'block',
    fontWeight: '500',
  },
  container: {
    maxWidth: '1050px',
    margin: '0 auto',
    padding: '16px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    backgroundColor: '#f8f9fa',
    minHeight: '100vh',
    boxSizing: 'border-box',
  },
  header: { marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' },
  title: { fontSize: '24px', color: '#1a73e8', margin: '0 0 4px 0' },
  subtitle: { fontSize: '14px', color: '#5f6368', margin: 0 },
  logoutBtn: {
    padding: '8px 14px',
    backgroundColor: '#fce8e6',
    color: '#c5221f',
    border: 'none',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  alertaContainer: {
    backgroundColor: '#fce8e6',
    border: '1px solid #f5c6cb',
    padding: '12px',
    borderRadius: '8px',
    marginBottom: '16px',
  },
  navTabs: {
    display: 'flex',
    gap: '8px',
    marginBottom: '16px',
    overflowX: 'auto',
    paddingBottom: '4px',
  },
  tabBtn: {
    padding: '10px 14px',
    backgroundColor: '#e8f0fe',
    color: '#1a73e8',
    border: 'none',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  tabActive: {
    backgroundColor: '#1a73e8',
    color: '#ffffff',
  },
  carrosselContainer: {
    display: 'flex',
    gap: '12px',
    overflowX: 'auto',
    paddingBottom: '8px',
    WebkitOverflowScrolling: 'touch',
  },
  carrosselCard: {
    backgroundColor: '#f8f9fa',
    border: '1px solid #dadce0',
    borderRadius: '8px',
    padding: '14px',
    minWidth: '200px',
    maxWidth: '200px',
    flexShrink: 0,
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
  },
  cardsContainer: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '12px',
  },
  card: {
    backgroundColor: '#ffffff',
    padding: '16px',
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
  },
  cardLabel: { fontSize: '12px', color: '#5f6368', marginBottom: '6px' },
  cardValue: { fontSize: '20px', fontWeight: 'bold' },
  cardSection: {
    backgroundColor: '#ffffff',
    padding: '16px',
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    marginBottom: '16px',
  },
  sectionTitle: { fontSize: '16px', color: '#202124', marginBottom: '12px', marginTop: 0 },
  formGrid: { display: 'grid', gridTemplateColumns: '1fr', gap: '12px' },
  input: {
    width: '100%',
    padding: '12px',
    borderRadius: '6px',
    border: '1px solid #dadce0',
    fontSize: '16px',
    outline: 'none',
    boxSizing: 'border-box',
    backgroundColor: '#fff',
  },
  inputFull: {
    width: '100%',
    padding: '12px',
    borderRadius: '6px',
    border: '1px solid #dadce0',
    fontSize: '16px',
    outline: 'none',
    boxSizing: 'border-box',
    backgroundColor: '#fff',
    marginBottom: '12px',
  },
  fileContainer: { display: 'flex', flexDirection: 'column', gap: '6px' },
  fileLabel: { fontSize: '14px', color: '#5f6368', fontWeight: '500' },
  inputFile: { fontSize: '14px', color: '#3c4043' },
  previewContainer: { display: 'flex', alignItems: 'center', gap: '12px', background: '#f1f3f4', padding: '8px', borderRadius: '6px' },
  previewImg: { width: '50px', height: '50px', objectFit: 'cover', borderRadius: '4px', cursor: 'pointer', border: '2px solid #1a73e8' },
  previewText: { fontSize: '13px', color: '#137333', fontWeight: '600' },
  button: {
    width: '100%',
    padding: '14px',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  chartContainer: { display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '10px' },
  chartBarWrapper: { display: 'flex', flexDirection: 'column', gap: '4px' },
  chartLabelText: { fontSize: '13px', color: '#5f6368', fontWeight: '500' },
  tableResponsive: { width: '100%', overflowX: 'auto', WebkitOverflowScrolling: 'touch' },
  table: { width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '800px' },
  thTr: { borderBottom: '2px solid #f1f3f4' },
  th: { padding: '10px 8px', fontSize: '12px', color: '#5f6368', textTransform: 'uppercase' },
  tr: { borderBottom: '1px solid #f1f3f4' },
  td: { padding: '12px 8px', fontSize: '14px', color: '#3c4043', verticalAlign: 'middle' },
  tableImgClickable: { width: '45px', height: '45px', objectFit: 'cover', borderRadius: '4px', border: '1px solid #dadce0', cursor: 'pointer', transition: 'transform 0.2s' },
  noFoto: { fontSize: '12px', color: '#80868b', fontStyle: 'italic' },
  badge: { padding: '4px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: '600', display: 'inline-block' },
  localBadge: { padding: '4px 8px', borderRadius: '6px', fontSize: '12px', backgroundColor: '#e8f0fe', color: '#1a73e8', fontWeight: '500' },
  btnEditar: {
    padding: '6px 8px',
    backgroundColor: '#e8f0fe',
    color: '#1a73e8',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    marginRight: '4px',
    fontSize: '14px',
  },
  btnDeletar: {
    padding: '6px 8px',
    backgroundColor: '#fce8e6',
    color: '#c5221f',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
  },
  empty: { textAlign: 'center', padding: '24px', color: '#80868b' },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    padding: '20px',
  },
  modalContent: {
    backgroundColor: '#fff',
    padding: '16px',
    borderRadius: '8px',
    maxWidth: '90vw',
    maxHeight: '90vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
  },
  modalCloseBtn: {
    backgroundColor: '#c5221f',
    color: '#fff',
    border: 'none',
    padding: '6px 12px',
    borderRadius: '4px',
    fontWeight: '600',
    cursor: 'pointer',
    marginBottom: '10px',
  },
  modalImg: {
    maxWidth: '80vw',
    maxHeight: '75vh',
    objectFit: 'contain',
    borderRadius: '4px',
  }
};

export default SunnyWearTecidos;