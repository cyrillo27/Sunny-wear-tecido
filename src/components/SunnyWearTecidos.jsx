import React, { useState, useEffect } from 'react';

const SunnyWearTecidos = () => {
  const [codigoQrUrl, setCodigoQrUrl] = useState(() => {
    try {
      if (typeof window === 'undefined') return null;
      const params = new URLSearchParams(window.location.search);
      return params.get('codigo');
    } catch (e) {
      return null;
    }
  });
  
  const [corQrUrl, setCorQrUrl] = useState(() => {
    try {
      if (typeof window === 'undefined') return null;
      const params = new URLSearchParams(window.location.search);
      return params.get('cor');
    } catch (e) {
      return null;
    }
  });

  const [loteQrUrl, setLoteQrUrl] = useState(() => {
    try {
      if (typeof window === 'undefined') return null;
      const params = new URLSearchParams(window.location.search);
      return params.get('lote');
    } catch (e) {
      return null;
    }
  });

  const [abaAtiva, setAbaAtiva] = useState('dashboard');
  const [movimentacoes, setMovimentacoes] = useState([]);
  const [carregando, setCarregando] = useState(false);
  const [menuMobileAberto, setMenuMobileAberto] = useState(false);

  const [fotoSelecionada, setFotoSelecionada] = useState(null);
  const [qrSelecionado, setQrSelecionado] = useState(null);
  const [idEditando, setIdEditando] = useState(null);
  const [corSelecionadaDetalhe, setCorSelecionadaDetalhe] = useState(null);
  const [loteSelecionadoDetalhe, setLoteSelecionadoDetalhe] = useState(null);
  
  const [idEditandoReserva, setIdEditandoReserva] = useState(null);
  const [idEditandoSobra, setIdEditandoSobra] = useState(null);
  
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

  // Estados do Lote
  const [formLote, setFormLote] = useState({ numeroLote: '', fornecedor: '', notaFiscal: '', observacao: '' });
  const [itensLoteDraft, setItensLoteDraft] = useState([]);
  const [formItemLote, setFormItemLote] = useState({
    codigo: '', nome: '', cor: '', largura: '', localizacao: '', quantidade: '', unidadeMedida: 'm', preco: ''
  });

  const [sobras, setSobras] = useState(() => {
    try {
      if (typeof window === 'undefined') return [];
      const salvas = localStorage.getItem('sunny_sobras');
      return salvas ? JSON.parse(salvas) : [];
    } catch (e) {
      return [];
    }
  });

  const [sobrasSaidas, setSobrasSaidas] = useState(() => {
    try {
      if (typeof window === 'undefined') return [];
      const salvas = localStorage.getItem('sunny_sobras_saidas');
      return salvas ? JSON.parse(salvas) : [];
    } catch (e) {
      return [];
    }
  });

  const [reservas, setReservas] = useState(() => {
    try {
      if (typeof window === 'undefined') return [];
      const salvas = localStorage.getItem('sunny_reservas');
      return salvas ? JSON.parse(salvas) : [];
    } catch (e) {
      return [];
    }
  });

  const [formSobra, setFormSobra] = useState({
    codigo: '', nome: '', cor: '', quantidade: '', unidadeMedida: 'm', localizacao: '', observacao: ''
  });
  const [buscaSobra, setBuscaSobra] = useState('');

  const [formReserva, setFormReserva] = useState({
    codigo: '', nome: '', cor: '', quantidade: '', unidadeMedida: 'm', localizacao: '', observacao: ''
  });
  const [buscaReserva, setBuscaReserva] = useState('');
  const [busca, setBusca] = useState('');
  const [buscaEstoque, setBuscaEstoque] = useState('');

  const API_URL = 'https://sunny-wear-tecido.onrender.com/api/movimentacoes';

  const normalizarTexto = (str) => {
    if (!str) return '';
    return String(str)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  };

  const obterMinimo = (item) => {
    return Number(item?.estoqueminimo || item?.estoqueMinimo || item?.estoque_minimo || 0);
  };
  
  const obterTipo = (item) => {
    const tipo = item?.tipomovimento || item?.tipoMovimento || 'entrada';
    return normalizarTexto(tipo);
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
      console.error('Erro ao conectar:', erro);
      setMovimentacoes([]);
    }
  };

  useEffect(() => {
    try { localStorage.setItem('sunny_sobras', JSON.stringify(sobras)); } catch (e) {}
  }, [sobras]);

  useEffect(() => {
    try { localStorage.setItem('sunny_sobras_saidas', JSON.stringify(sobrasSaidas)); } catch (e) {}
  }, [sobrasSaidas]);

  useEffect(() => {
    try { localStorage.setItem('sunny_reservas', JSON.stringify(reservas)); } catch (e) {}
  }, [reservas]);

  useEffect(() => {
    carregarDadosDoServidor();
    const intervalo = setInterval(carregarDadosDoServidor, 5000);
    return () => clearInterval(intervalo);
  }, []);

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

  const calcularEstoqueLivre = (codigo, cor, ignorarReservaId = null, ignorarSobraId = null) => {
    let bruto = 0;
    movimentacoes.forEach(m => {
      if (normalizarTexto(m.codigo) === normalizarTexto(codigo) && normalizarTexto(m.cor || 'N/D') === normalizarTexto(cor)) {
        const q = Number(m.metros || m.quantidade || 0);
        const t = obterTipo(m);
        if (t === 'entrada') bruto += q;
        else if (t === 'saida') bruto -= q;
      }
    });

    let res = 0;
    reservas.forEach(r => {
      if (normalizarTexto(r.codigo) === normalizarTexto(codigo) && normalizarTexto(r.cor || 'N/D') === normalizarTexto(cor)) {
        if (r.id !== ignorarReservaId) res += Number(r.quantidade || r.metros || 0);
      }
    });

    let sob = 0;
    sobras.forEach(s => {
      if (normalizarTexto(s.codigo) === normalizarTexto(codigo) && normalizarTexto(s.cor || 'N/D') === normalizarTexto(cor)) {
        if (s.id !== ignorarSobraId) sob += Number(s.quantidade || 0);
      }
    });

    return bruto - res - sob;
  };

  const tecidosConsolidados = {};
  const usoTecidos = {};
  const listaSeguraCalculos = Array.isArray(movimentacoes) ? movimentacoes : [];

  listaSeguraCalculos.forEach(m => {
    if (!m || !m.codigo) return;
    const cod = normalizarTexto(m.codigo);
    const cor = normalizarTexto(m.cor || 'ndef');
    const chave = `${cod}_${cor}`;
    const qtd = Number(m.metros || m.quantidade || 0);
    const minReg = obterMinimo(m);
    const tipoM = obterTipo(m);

    if (!tecidosConsolidados[chave]) {
      tecidosConsolidados[chave] = { codigo: m.codigo, nome: m.nome, cor: m.cor, minimo: minReg, unidade: m.unidademedida || m.unidadeMedida || 'm', totalBruto: 0, totalReservas: 0, totalSobras: 0, total: 0 };
    }

    if (tipoM === 'entrada') tecidosConsolidados[chave].totalBruto += qtd;
    else if (tipoM === 'saida') tecidosConsolidados[chave].totalBruto -= qtd;

    if (!usoTecidos[chave]) usoTecidos[chave] = { nome: m.nome || 'Tecido', codigo: m.codigo, cor: m.cor || 'N/D', totalUso: 0, unidade: m.unidademedida || m.unidadeMedida || 'm' };
    if (tipoM === 'saida') usoTecidos[chave].totalUso += qtd;
    if (minReg > 0) tecidosConsolidados[chave].minimo = minReg;
  });

  reservas.forEach(r => {
    if (!r || !r.codigo) return;
    const cod = normalizarTexto(r.codigo);
    const cor = normalizarTexto(r.cor || 'ndef');
    const chave = `${cod}_${cor}`;
    const qtd = Number(r.quantidade || r.metros || 0);
    if (!tecidosConsolidados[chave]) tecidosConsolidados[chave] = { codigo: r.codigo, nome: r.nome, cor: r.cor, minimo: 0, unidade: r.unidadeMedida || 'm', totalBruto: 0, totalReservas: 0, totalSobras: 0, total: 0 };
    tecidosConsolidados[chave].totalReservas += qtd;
  });

  sobras.forEach(s => {
    if (!s || !s.codigo) return;
    const cod = normalizarTexto(s.codigo);
    const cor = normalizarTexto(s.cor || 'ndef');
    const chave = `${cod}_${cor}`;
    const qtd = Number(s.quantidade || 0);
    if (!tecidosConsolidados[chave]) tecidosConsolidados[chave] = { codigo: s.codigo, nome: s.nome, cor: s.cor, minimo: 0, unidade: s.unidadeMedida || 'm', totalBruto: 0, totalReservas: 0, totalSobras: 0, total: 0 };
    tecidosConsolidados[chave].totalSobras += qtd;
  });

  Object.keys(tecidosConsolidados).forEach(chave => {
    const item = tecidosConsolidados[chave];
    item.total = item.totalBruto - item.totalReservas - item.totalSobras;
  });

  // Funções Lote
  const adicionarItemAoLote = (e) => {
    e.preventDefault();
    if (!formItemLote.codigo || !formItemLote.nome || !formItemLote.cor || !formItemLote.quantidade || !formItemLote.localizacao) {
      alert('Preencha os campos obrigatórios do item.'); return;
    }
    setItensLoteDraft([...itensLoteDraft, { ...formItemLote, idDraft: Date.now() }]);
    setFormItemLote({ codigo: '', nome: '', cor: '', largura: '', localizacao: formItemLote.localizacao, quantidade: '', unidadeMedida: 'm', preco: '' });
  };

  const removerItemDoLote = (idDraft) => {
    setItensLoteDraft(prev => prev.filter(i => i.idDraft !== idDraft));
  };

  const salvarLoteDefinitivo = async () => {
    if (!formLote.numeroLote) { alert('Digite o Nome ou Número do Lote.'); return; }
    if (itensLoteDraft.length === 0) { alert('Adicione pelo menos um tecido na lista do lote.'); return; }

    setCarregando(true);
    const loteId = 'LOTE-' + Date.now();
    try {
      for (const item of itensLoteDraft) {
        const dadosEntrada = {
          tipoMovimento: 'entrada',
          codigo: item.codigo,
          nome: item.nome,
          cor: item.cor,
          largura: item.largura,
          localizacao: item.localizacao,
          quantidade: item.quantidade,
          metros: item.quantidade,
          unidadeMedida: item.unidadeMedida,
          estoqueMinimo: 0,
          estoqueminimo: 0,
          preco: item.preco,
          notaFiscal: formLote.notaFiscal,
          fornecedor: formLote.fornecedor,
          observacao: formLote.observacao,
          loteId: loteId,
          nomeLote: formLote.numeroLote
        };
        await fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dadosEntrada) });
      }

      alert(`✅ Lote "${formLote.numeroLote}" salvo na nuvem com sucesso! Todos os itens entraram no estoque.`);
      setFormLote({ numeroLote: '', fornecedor: '', notaFiscal: '', observacao: '' });
      setItensLoteDraft([]);
      await carregarDadosDoServidor();
    } catch (e) {
      alert('Erro de conexão ao salvar lote.');
    } finally {
      setCarregando(false);
    }
  };

  const lotesNaNuvem = {};
  listaSeguraCalculos.forEach(m => {
    if (m.loteId && obterTipo(m) === 'entrada') {
      if (!lotesNaNuvem[m.loteId]) {
        lotesNaNuvem[m.loteId] = {
          id: m.loteId,
          nome: m.nomeLote || m.loteId,
          fornecedor: m.fornecedor || '-',
          notaFiscal: m.notaFiscal || m.notafiscal || '-',
          observacao: m.observacao || '-',
          data: m.data ? m.data.split('T')[0] : '-',
          itens: []
        };
      }
      lotesNaNuvem[m.loteId].itens.push(m);
    }
  });
  const listaDeLotes = Object.values(lotesNaNuvem).sort((a,b) => b.id.localeCompare(a.id));

  // Funções Sobra, Reserva, etc.
  const cadastrarSobra = (e) => {
    e.preventDefault();
    if (!formSobra.codigo || !formSobra.nome || !formSobra.quantidade || !formSobra.localizacao) { alert('Preencha os campos obrigatórios da sobra.'); return; }
    const codigoLimpo = formSobra.codigo.trim();
    const corLimpa = (formSobra.cor || 'N/D').trim();
    const qtdSobra = Number(formSobra.quantidade);
    const chaveValidacao = `${normalizarTexto(codigoLimpo)}_${normalizarTexto(corLimpa)}`;
    if (!tecidosConsolidados[chaveValidacao] && !idEditandoSobra) { alert('⚠️ AÇÃO BLOQUEADA: Este tecido/cor não está cadastrado no estoque livre.'); return; }
    const estoqueLivreAtual = calcularEstoqueLivre(codigoLimpo, corLimpa, null, idEditandoSobra);
    if (qtdSobra > estoqueLivreAtual) { alert(`⚠️ Estoque insuficiente! O estoque livre disponível para este tecido/cor é de apenas ${estoqueLivreAtual}.`); return; }
    const novaSobra = { id: idEditandoSobra || 'SOBRA-' + Date.now(), codigo: codigoLimpo, nome: formSobra.nome, cor: corLimpa, quantidade: qtdSobra, unidadeMedida: formSobra.unidadeMedida, localizacao: formSobra.localizacao, observacao: formSobra.observacao || 'Retalho / Sobra', data: new Date().toLocaleDateString('pt-BR') };
    if (idEditandoSobra) { setSobras(prev => prev.map(s => s.id === idEditandoSobra ? novaSobra : s)); setIdEditandoSobra(null); alert('✂️ Retalho ajustado!'); } else { setSobras(prev => [novaSobra, ...prev]); alert('✂️ Sobra cadastrada e abatida do estoque com sucesso!'); }
    setFormSobra({ codigo: '', nome: '', cor: '', quantidade: '', unidadeMedida: 'm', localizacao: '', observacao: '' });
  };

  const iniciarEdicaoSobra = (item) => { setIdEditandoSobra(item.id); setFormSobra({ ...item }); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const usarSobra = (item) => {
    if (!window.confirm(`Confirma a baixa e reuso deste retalho de ${item.nome} (${item.quantidade} ${item.unidadeMedida})?`)) return;
    setSobras(prev => prev.filter(s => s.id !== item.id));
    setSobrasSaidas(prev => [{...item, id: 'SAIDA-SOBRA-' + Date.now(), dataBaixa: new Date().toLocaleDateString('pt-BR')}, ...prev]);
    alert('✅ Retalho utilizado na produção!');
  };
  const deletarSobra = (id) => { if (!window.confirm('Confirma a exclusão deste retalho? Ele retornará ao estoque principal.')) return; setSobras(prev => prev.filter(s => s.id !== id)); };

  const cadastrarReserva = (e) => {
    e.preventDefault();
    if (!formReserva.codigo || !formReserva.nome || !formReserva.quantidade || !formReserva.localizacao) { alert('Preencha os campos obrigatórios da reserva.'); return; }
    const codigoLimpo = formReserva.codigo.trim();
    const corLimpa = (formReserva.cor || 'N/D').trim();
    const qtdReserva = Number(formReserva.quantidade);
    const chaveValidacao = `${normalizarTexto(codigoLimpo)}_${normalizarTexto(corLimpa)}`;
    if (!tecidosConsolidados[chaveValidacao] && !idEditandoReserva) { alert('⚠️ AÇÃO BLOQUEADA: Este tecido/cor não está cadastrado no estoque livre.'); return; }
    const estoqueLivreAtual = calcularEstoqueLivre(codigoLimpo, corLimpa, idEditandoReserva, null);
    if (qtdReserva > estoqueLivreAtual) { alert(`⚠️ Estoque insuficiente! O estoque livre disponível para este tecido/cor é de apenas ${estoqueLivreAtual}.`); return; }
    const novaReserva = { id: idEditandoReserva || 'RESERVA-' + Date.now(), codigo: codigoLimpo, nome: formReserva.nome, cor: corLimpa, quantidade: qtdReserva, metros: qtdReserva, unidadeMedida: formReserva.unidadeMedida, localizacao: formReserva.localizacao, observacao: formReserva.observacao || 'Separado para uso futuro', data: new Date().toLocaleDateString('pt-BR') };
    if (idEditandoReserva) { setReservas(prev => prev.map(r => r.id === idEditandoReserva ? novaReserva : r)); setIdEditandoReserva(null); alert('📌 Reserva ajustada!'); } else { setReservas(prev => [novaReserva, ...prev]); alert('📌 Reserva salva com sucesso e abatida do estoque!'); }
    setFormReserva({ codigo: '', nome: '', cor: '', quantidade: '', unidadeMedida: 'm', localizacao: '', observacao: '' });
  };
  const iniciarEdicaoReserva = (item) => { setIdEditandoReserva(item.id); setFormReserva({ ...item }); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const concluirReserva = async (item) => {
    if (!window.confirm(`Confirma o consumo/baixa definitiva desta reserva de ${item.nome}?`)) return;
    setCarregando(true);
    try {
      setReservas(prev => prev.filter(r => r.id !== item.id));
      await fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tipoMovimento: 'saida', codigo: item.codigo, nome: item.nome, cor: item.cor, quantidade: item.quantidade || item.metros, metros: item.quantidade || item.metros, unidadeMedida: item.unidadeMedida || 'm', localizacao: item.localizacao, observacao: 'Baixa de reserva: ' + (item.observacao || ''), data: new Date().toISOString() }) });
      alert('✅ Reserva consumida!'); carregarDadosDoServidor();
    } catch (erro) { alert('Erro ao concluir reserva.'); } finally { setCarregando(false); }
  };
  const cancelarReserva = (id) => { if (!window.confirm('Confirma o cancelamento desta reserva?')) return; setReservas(prev => prev.filter(r => r.id !== id)); alert('🔄 Reserva cancelada e devolvida ao estoque.'); };

  const registrarOuAtualizarMovimento = async (e) => {
    e.preventDefault();
    const qtdValida = form.quantidade || form.metros;
    if (!form.codigo || !form.nome || !form.cor || !form.localizacao || !qtdValida) return;
    const tipoFinal = abaAtiva === 'entrada' ? 'entrada' : 'saida';
    if (tipoFinal === 'saida' && !idEditando) {
      const chaveValidacao = `${normalizarTexto(form.codigo)}_${normalizarTexto(form.cor)}`;
      if (!tecidosConsolidados[chaveValidacao]) { alert('⚠️ AÇÃO BLOQUEADA: Este tecido/cor não estão cadastrados no estoque!'); return; }
    }
    setCarregando(true);
    try {
      const dadosParaEnviar = { ...form, tipoMovimento: tipoFinal, quantidade: qtdValida, metros: qtdValida, estoqueMinimo: form.estoqueMinimo ? Number(form.estoqueMinimo) : 0, estoqueminimo: form.estoqueMinimo ? Number(form.estoqueMinimo) : 0 };
      const targetId = idEditando || form.id || form._id;
      let resposta = targetId ? await fetch(`${API_URL}/${encodeURIComponent(targetId)}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dadosParaEnviar) }) : await fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dadosParaEnviar) });
      if (resposta.ok) { alert('Sucesso!'); setForm({ tipoMovimento: 'entrada', codigo: '', nome: '', cor: '', localizacao: '', quantidade: '', metros: '', unidadeMedida: 'm', preco: '', estoqueMinimo: '', notaFiscal: '', fornecedor: '', foto: '', largura: '' }); setIdEditando(null); await carregarDadosDoServidor(); setAbaAtiva('historico'); }
    } catch (erro) { alert('Erro de conexão com o servidor.'); } finally { setCarregando(false); }
  };

  const iniciarEdicao = (item) => {
    setIdEditando(item.id || item._id);
    const tipoItem = obterTipo(item);
    setForm({ ...item, tipoMovimento: tipoItem, quantidade: item.quantidade || item.metros || '', metros: item.quantidade || item.metros || '', unidadeMedida: item.unidademedida || item.unidadeMedida || 'm', estoqueMinimo: obterMinimo(item) || '' });
    setAbaAtiva(tipoItem === 'saida' ? 'saida' : 'entrada');
  };
  const deletarItem = async (itemOrId) => {
    const id = typeof itemOrId === 'object' ? (itemOrId.id || itemOrId._id) : itemOrId;
    if (!window.confirm('Confirma exclusão definitiva?')) return;
    try { const resposta = await fetch(`${API_URL}/${encodeURIComponent(id)}`, { method: 'DELETE' }); if (resposta.ok) { alert('Excluído!'); carregarDadosDoServidor(); } } catch (erro) { alert('Erro de conexão.'); }
  };

  const alertasEstoqueBaixo = Object.values(tecidosConsolidados).filter(t => t.minimo > 0 && t.total < t.minimo);
  const topTecidosMaisUsados = Object.values(usoTecidos).filter(t => t.totalUso > 0).sort((a, b) => b.totalUso - a.totalUso).slice(0, 5);
  const maxUsoTop = topTecidosMaisUsados.length > 0 ? Math.max(...topTecidosMaisUsados.map(t => t.totalUso)) : 100;
  const estoqueDisponivelMetros = (listaSeguraCalculos.filter(m => obterTipo(m) === 'entrada' && (m?.unidademedida === 'm' || m?.unidadeMedida === 'm' || !m?.unidademedida)).reduce((acc, m) => acc + Number(m.metros || m.quantidade || 0), 0)) - (listaSeguraCalculos.filter(m => obterTipo(m) === 'saida' && (m?.unidademedida === 'm' || m?.unidadeMedida === 'm' || !m?.unidademedida)).reduce((acc, m) => acc + Number(m.metros || m.quantidade || 0), 0)) - reservas.filter(r => (r?.unidadeMedida === 'm' || !r?.unidadeMedida)).reduce((acc, r) => acc + Number(r.quantidade || r.metros || 0), 0) - sobras.filter(s => s.unidadeMedida === 'm').reduce((acc, s) => acc + Number(s.quantidade || 0), 0);
  const entradasMetros = listaSeguraCalculos.filter(m => obterTipo(m) === 'entrada' && (m?.unidademedida === 'm' || m?.unidadeMedida === 'm' || !m?.unidademedida)).reduce((acc, m) => acc + Number(m.metros || m.quantidade || 0), 0);
  const saidasMetros = listaSeguraCalculos.filter(m => obterTipo(m) === 'saida' && (m?.unidademedida === 'm' || m?.unidadeMedida === 'm' || !m?.unidademedida)).reduce((acc, m) => acc + Number(m.metros || m.quantidade || 0), 0);
  const totalReservasMetros = reservas.filter(r => (r?.unidadeMedida === 'm' || !r?.unidadeMedida)).reduce((acc, r) => acc + Number(r.quantidade || r.metros || 0), 0);
  const totalSobrasMetros = sobras.filter(s => s.unidadeMedida === 'm').reduce((acc, s) => acc + Number(s.quantidade || 0), 0);

  const diasEvolucao = []; const dadosEvolucaoMetros = []; const dadosEvolucaoKg = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    diasEvolucao.push(`${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`);
    let mTotal = 0; let kgTotal = 0;
    listaSeguraCalculos.forEach(m => {
      if ((m.data || '').split('T')[0] <= d.toISOString().split('T')[0]) {
        const qtd = Number(m.metros || m.quantidade || 0);
        const un = normalizarTexto(m.unidademedida || m.unidadeMedida || 'm');
        if (obterTipo(m) === 'entrada') { if (un === 'kg') kgTotal += qtd; else mTotal += qtd; }
        else if (obterTipo(m) === 'saida') { if (un === 'kg') kgTotal -= qtd; else mTotal -= qtd; }
      }
    });
    dadosEvolucaoMetros.push(mTotal); dadosEvolucaoKg.push(kgTotal);
  }
  const valoresGraficoAtual = unidadeGrafico.includes('Quilos') ? dadosEvolucaoKg : dadosEvolucaoMetros;
  const maxValGrafico = Math.max(...valoresGraficoAtual, 10);
  const getX = (idx) => 50 + idx * 80;
  const getY = (val) => 140 - (val / maxValGrafico) * (140 - 20);
  const pontosPath = valoresGraficoAtual.map((val, idx) => `${idx === 0 ? 'M' : 'L'} ${getX(idx)},${getY(val)}`).join(' ');
  const areaPath = `${pontosPath} L ${getX(6)},160 L ${getX(0)},160 Z`;

  const porLocalizacao = listaSeguraCalculos.reduce((acc, m) => {
    if (!m) return acc;
    const chaveLoc = normalizarTexto(m.localizacao || 'Não definido').toUpperCase();
    if (!acc[chaveLoc]) acc[chaveLoc] = { nomeExibicao: (m.localizacao || 'Não definido').trim().toUpperCase(), m: 0, kg: 0 };
    const qtd = Number(m.metros || m.quantidade || 0);
    const un = normalizarTexto(m.unidademedida || m.unidadeMedida || 'm');
    if (obterTipo(m) === 'entrada') { acc[chaveLoc][un] = (acc[chaveLoc][un] || 0) + qtd; }
    else if (obterTipo(m) === 'saida') { acc[chaveLoc][un] = (acc[chaveLoc][un] || 0) - qtd; }
    return acc;
  }, {});

  const todosRegistrosHistorico = [
    ...listaSeguraCalculos.map(m => ({ ...m, _tipoExibicao: obterTipo(m) })),
    ...reservas.map(r => ({ ...r, _tipoExibicao: 'Reserva', isExtra: true })),
    ...sobras.map(s => ({ ...s, _tipoExibicao: 'Retalhos', isExtra: true }))
  ];

  const movFiltradas = todosRegistrosHistorico.filter(m => {
    if (!m) return false; 
    const termo = normalizarTexto(busca);
    return normalizarTexto(m.codigo).includes(termo) || normalizarTexto(m.nome).includes(termo) || normalizarTexto(m.cor).includes(termo) || normalizarTexto(m.localizacao).includes(termo) || normalizarTexto(m.fornecedor).includes(termo) || normalizarTexto(m.notafiscal || m.notaFiscal).includes(termo);
  });
  const sobrasFiltradas = sobras.filter(s => normalizarTexto(s.codigo).includes(normalizarTexto(buscaSobra)) || normalizarTexto(s.nome).includes(normalizarTexto(buscaSobra)) || normalizarTexto(s.cor).includes(normalizarTexto(buscaSobra)));
  const reservasFiltradas = reservas.filter(r => normalizarTexto(r.codigo).includes(normalizarTexto(buscaReserva)) || normalizarTexto(r.nome).includes(normalizarTexto(buscaReserva)) || normalizarTexto(r.cor).includes(normalizarTexto(buscaReserva)));

  // === MODO VISUALIZAÇÃO QR CODE: LOTE ===
  if (loteQrUrl) {
    const infoLoteNuvem = lotesNaNuvem[loteQrUrl];
    
    return (
      <div style={styles.qrViewContainer}>
        <div style={{...styles.qrViewCard, maxWidth: '600px', width: '100%'}}>
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <div style={styles.logoBadge}>SW</div>
            <h2 style={{ color: '#0F172A', margin: '10px 0 4px 0', fontSize: '20px', fontWeight: '800' }}>Sunny Wear • Consulta de Lote</h2>
            <p style={{ color: '#2563EB', fontSize: '11px', margin: 0, fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px' }}>Detalhes do Romaneio</p>
          </div>

          {!infoLoteNuvem ? (
            <div style={{textAlign: 'center', padding: '40px 0'}}>
              <p style={{color: '#64748B'}}>Buscando dados do lote na nuvem...</p>
            </div>
          ) : (
            <>
              <div style={styles.qrInfoBox}>
                <div style={styles.qrInfoRow}><span>Nome / Ref. do Lote:</span> <strong style={{color: '#2563EB', fontSize: '15px'}}>{infoLoteNuvem.nome}</strong></div>
                <div style={styles.qrInfoRow}><span>ID do Sistema:</span> <strong>{infoLoteNuvem.id}</strong></div>
                <div style={styles.qrInfoRow}><span>Fornecedor:</span> <strong>{infoLoteNuvem.fornecedor}</strong></div>
                <div style={styles.qrInfoRow}><span>Nota Fiscal:</span> <strong>{infoLoteNuvem.notaFiscal}</strong></div>
                <div style={styles.qrInfoRow}><span>Data da Entrada:</span> <strong>{infoLoteNuvem.data}</strong></div>
                <div style={styles.qrInfoRow}><span>Observação:</span> <strong>{infoLoteNuvem.observacao}</strong></div>
              </div>

              <h3 style={{fontSize: '15px', color: '#0F172A', fontWeight: '800', marginTop: '20px', marginBottom: '10px', width: '100%'}}>📦 Tecidos neste Lote ({infoLoteNuvem.itens.length})</h3>
              
              <div style={{...styles.tableResponsive, maxHeight: '350px', overflowY: 'auto', marginBottom: '20px', border: '1px solid #E2E8F0', borderRadius: '10px'}}>
                <table style={{...styles.table, minWidth: '100%'}}>
                  <thead>
                    <tr style={styles.thTr}>
                      <th style={{...styles.th, fontSize: '10px'}}>Código</th>
                      <th style={{...styles.th, fontSize: '10px'}}>Tecido/Cor</th>
                      <th style={{...styles.th, fontSize: '10px'}}>Qtd</th>
                      <th style={{...styles.th, fontSize: '10px'}}>Local</th>
                    </tr>
                  </thead>
                  <tbody>
                    {infoLoteNuvem.itens.map(it => (
                      <tr key={it.id || it._id} style={styles.tr}>
                        <td style={{...styles.td, fontSize: '11px', fontWeight: '700'}}>{it.codigo}</td>
                        <td style={{...styles.td, fontSize: '11px'}}>{it.nome} <br/><span style={{color:'#2563EB', fontWeight:'700'}}>{it.cor}</span></td>
                        <td style={{...styles.td, fontSize: '11px', fontWeight: '700', color: '#059669'}}>{it.quantidade || it.metros} {it.unidademedida || it.unidadeMedida || 'm'}</td>
                        <td style={{...styles.td, fontSize: '11px'}}>{it.localizacao}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          <button onClick={() => { window.location.href = window.location.pathname; }} style={styles.qrBackBtn}>
            🏠 Acessar Sistema Completo
          </button>
        </div>
      </div>
    );
  }

  // === MODO VISUALIZAÇÃO QR CODE: TECIDO ===
  if (codigoQrUrl) {
    const paramCodigoLpo = normalizarTexto(codigoQrUrl);
    const paramCorLpo = corQrUrl ? normalizarTexto(corQrUrl) : '';
    const movimentosDoTecido = listaSeguraCalculos.filter(m => normalizarTexto(m?.codigo) === paramCodigoLpo && (paramCorLpo ? (normalizarTexto(m?.cor) === paramCorLpo) : true));
    const infoTecido = movimentosDoTecido[movimentosDoTecido.length - 1] || { codigo: codigoQrUrl, cor: corQrUrl || 'N/D', nome: 'Tecido não localizado', localizacao: '-' };
    let totalQtdBruta = 0;
    movimentosDoTecido.forEach(m => { const q = Number(m.metros || m.quantidade || 0); const t = obterTipo(m); if (t === 'entrada') totalQtdBruta += q; else if (t === 'saida') totalQtdBruta -= q; });
    let totalReservaTecido = 0;
    reservas.forEach(r => { if (normalizarTexto(r?.codigo) === paramCodigoLpo && (paramCorLpo ? (normalizarTexto(r?.cor || 'N/D') === paramCorLpo) : true)) totalReservaTecido += Number(r.quantidade || r.metros || 0); });
    let totalSobraTecido = 0;
    sobras.forEach(s => { if (normalizarTexto(s?.codigo) === paramCodigoLpo && (paramCorLpo ? (normalizarTexto(s?.cor || 'N/D') === paramCorLpo) : true)) totalSobraTecido += Number(s.quantidade || 0); });
    const totalDisponivelTecido = totalQtdBruta - totalReservaTecido - totalSobraTecido;
    const unidadeMed = infoTecido.unidademedida || infoTecido.unidadeMedida || 'm';

    return (
      <div style={styles.qrViewContainer}>
        <div style={styles.qrViewCard}>
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <div style={styles.logoBadge}>SW</div>
            <h2 style={{ color: '#0F172A', margin: '10px 0 4px 0', fontSize: '20px', fontWeight: '800' }}>Sunny Wear • Consulta QR Code</h2>
            <p style={{ color: '#2563EB', fontSize: '11px', margin: 0, fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px' }}>Informações do Rolo</p>
          </div>

          {infoTecido.foto ? ( <img src={infoTecido.foto} alt="Tecido" style={styles.qrViewImg} onClick={() => setFotoSelecionada(infoTecido.foto)} /> ) : ( <div style={styles.qrViewNoFoto}>Sem foto cadastrada</div> )}

          <div style={styles.qrInfoBox}>
            <div style={styles.qrInfoRow}><span>Código:</span> <strong>{infoTecido.codigo}</strong></div>
            <div style={styles.qrInfoRow}><span>Nome:</span> <strong>{infoTecido.nome || 'N/D'}</strong></div>
            <div style={styles.qrInfoRow}><span>Cor:</span> <strong style={{color: '#2563EB'}}>{infoTecido.cor || 'N/D'}</strong></div>
            <div style={styles.qrInfoRow}><span>Largura:</span> <strong>{infoTecido.largura ? `${infoTecido.largura}m` : 'Não informada'}</strong></div>
            <div style={styles.qrInfoRow}><span>Galpão / Local:</span> <strong style={{color: '#2563EB'}}>📍 {infoTecido.localizacao || 'N/D'}</strong></div>
            <div style={{borderTop: '1px dashed #CBD5E1', margin: '6px 0'}} />
            <div style={{...styles.qrInfoRow, alignItems: 'center'}}>
              <span>Estoque Total Disponível:</span> 
              <strong style={{color: '#059669', fontSize: '18px'}}>{totalDisponivelTecido} {unidadeMed}</strong>
            </div>
          </div>

          <button onClick={() => { window.location.href = window.location.pathname; }} style={styles.qrBackBtn}>🏠 Acessar Sistema Completo</button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.appLayout} className="app-layout-container">
      <style>{`
        @media (max-width: 900px) {
          .app-layout-container { flex-direction: column !important; }
          aside { position: fixed !important; left: ${menuMobileAberto ? '0' : '-100%'} !important; top: 0 !important; height: 100vh !important; z-index: 1000 !important; transition: left 0.3s ease-in-out !important; box-shadow: 5px 0 25px rgba(0,0,0,0.15) !important; width: 280px !important; }
          main { padding: 16px !important; max-width: 100vw !important; }
          .charts-row-responsive, .form-grid-responsive { grid-template-columns: 1fr !important; }
          .menu-toggle-btn { display: flex !important; }
        }
      `}</style>

      {menuMobileAberto && <div onClick={() => setMenuMobileAberto(false)} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 999 }} />}

      <aside style={styles.sidebar}>
        <div style={styles.sidebarHeader}>
          <div style={styles.logoBadge}>SW</div>
          <div><h2 style={styles.sidebarTitle}>Sunny Wear</h2><span style={styles.versionBadge}>v2.9 LOTES</span></div>
        </div>
        <div style={styles.sidebarNavGroup}>
          <button onClick={() => { setAbaAtiva('dashboard'); setMenuMobileAberto(false); }} style={{ ...styles.sidebarLink, ...(abaAtiva === 'dashboard' ? styles.sidebarLinkActive : {}) }}>📊 Visão Geral</button>
          <button onClick={() => { setAbaAtiva('estoque'); setMenuMobileAberto(false); }} style={{ ...styles.sidebarLink, ...(abaAtiva === 'estoque' ? styles.sidebarLinkActive : {}) }}>📦 Estoque Total</button>
          <button onClick={() => { setIdEditando(null); setForm({ tipoMovimento: 'entrada', codigo: '', nome: '', cor: '', localizacao: '', quantidade: '', metros: '', unidadeMedida: 'm', preco: '', estoqueMinimo: '', notaFiscal: '', fornecedor: '', foto: '', largura: '' }); setAbaAtiva('entrada'); setMenuMobileAberto(false); }} style={{ ...styles.sidebarLink, ...(abaAtiva === 'entrada' ? styles.sidebarLinkActive : {}) }}>📥 Entrada Avulsa</button>
          
          <button onClick={() => { setAbaAtiva('lotes'); setMenuMobileAberto(false); }} style={{ ...styles.sidebarLink, ...(abaAtiva === 'lotes' ? styles.sidebarLinkActive : {}) }}>📦 Entradas em Lote <span style={{backgroundColor:'#1D4ED8', color:'#fff', padding:'2px 6px', borderRadius:'4px', fontSize:'9px', marginLeft:'auto'}}>NOVO</span></button>

          <button onClick={() => { setIdEditando(null); setForm({ tipoMovimento: 'saida', codigo: '', nome: '', cor: '', localizacao: '', quantidade: '', metros: '', unidadeMedida: 'm', preco: '', estoqueMinimo: '', notaFiscal: '', fornecedor: '', foto: '', largura: '' }); setAbaAtiva('saida'); setMenuMobileAberto(false); }} style={{ ...styles.sidebarLink, ...(abaAtiva === 'saida' ? styles.sidebarLinkActive : {}) }}>📤 Registrar Saída</button>
          <button onClick={() => { setAbaAtiva('reservas'); setMenuMobileAberto(false); }} style={{ ...styles.sidebarLink, ...(abaAtiva === 'reservas' ? styles.sidebarLinkActive : {}) }}>📌 Reservas de Tecidos</button>
          <button onClick={() => { setAbaAtiva('sobras'); setMenuMobileAberto(false); }} style={{ ...styles.sidebarLink, ...(abaAtiva === 'sobras' ? styles.sidebarLinkActive : {}) }}>✂️ Sobras & Retalhos</button>
          <button onClick={() => { setAbaAtiva('historico'); setMenuMobileAberto(false); }} style={{ ...styles.sidebarLink, ...(abaAtiva === 'historico' ? styles.sidebarLinkActive : {}) }}>🔍 Movimentações</button>
        </div>
      </aside>

      <main style={styles.mainContent}>
        <header style={styles.topbar}>
          <button style={{ display: 'none', alignItems: 'center', gap: '6px', background: '#2563EB', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: '8px', fontWeight: '700', cursor: 'pointer', fontSize: '13px' }} className="menu-toggle-btn" onClick={() => setMenuMobileAberto(!menuMobileAberto)}>☰ Menu</button>
          <div style={styles.statusBadgeContainer}><span style={styles.pulseDot}></span><span style={styles.statusText}>Cloud Sync Ativo</span></div>
        </header>

        {alertasEstoqueBaixo.length > 0 && (
          <div style={styles.alertaContainer}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}><span style={{ fontSize: '16px' }}>⚡</span><strong style={{ color: '#991B1B', fontSize: '14px' }}>ALERTA CRÍTICO: ESTOQUE ABAIXO DO MÍNIMO</strong></div>
            <ul style={{ margin: '6px 0 0 24px', padding: 0, fontSize: '13px', color: '#7F1D1D' }}>
              {alertasEstoqueBaixo.map((alt, idx) => ( <li key={idx} style={{ marginBottom: '4px' }}><strong>{alt.nome}</strong> ({alt.cor}) [Cód: {alt.codigo}] — Disp: <strong>{alt.total} {alt.unidade}</strong> | Mín: {alt.minimo}</li> ))}
            </ul>
          </div>
        )}

        {abaAtiva === 'dashboard' && (
          <div>
            <div style={styles.metricsGrid}>
              <div style={styles.metricCard}><span style={styles.metricLabel}>Estoque Disponível</span><strong style={{...styles.metricVal, color: '#2563EB'}}>{estoqueDisponivelMetros.toLocaleString()} m</strong><span style={styles.metricSub}>Livre (Sem reservas/retalhos)</span></div>
              <div style={styles.metricCard}><span style={styles.metricLabel}>Tecidos Reservados</span><strong style={{...styles.metricVal, color: '#D97706'}}>{totalReservasMetros.toLocaleString()} m</strong><span style={styles.metricSub}>Separado para uso</span></div>
              <div style={styles.metricCard}><span style={styles.metricLabel}>Retalhos Disponíveis</span><strong style={{...styles.metricVal, color: '#9333EA'}}>{totalSobrasMetros.toLocaleString()} m</strong><span style={styles.metricSub}>Sobras guardadas</span></div>
              <div style={styles.metricCard}><span style={styles.metricLabel}>Entradas Hoje</span><strong style={{...styles.metricVal, color: '#059669'}}>{entradasMetros.toLocaleString()} m</strong><span style={styles.metricSub}>Aquisições registradas</span></div>
              <div style={styles.metricCard}><span style={styles.metricLabel}>Saídas Hoje</span><strong style={{...styles.metricVal, color: '#DC2626'}}>{saidasMetros.toLocaleString()} m</strong><span style={styles.metricSub}>Consumo / Baixas</span></div>
            </div>

            <div style={styles.chartsRow} className="charts-row-responsive">
              <div style={styles.chartBoxWide}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <h3 style={{ ...styles.sectionTitle, margin: 0 }}>Top 5 Tecidos Mais Utilizados</h3>
                  <button style={styles.verTodosBtn} onClick={() => setAbaAtiva('historico')}>Ver todos</button>
                </div>
                {topTecidosMaisUsados.length === 0 ? ( <p style={styles.empty}>Aguardando registros de saída.</p> ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {topTecidosMaisUsados.map((tecido, index) => {
                      const pct = Math.min(100, Math.max(12, (tecido.totalUso / maxUsoTop) * 100));
                      const badgeCores = ['#2563EB', '#059669', '#D97706', '#475569', '#64748B'];
                      return (
                        <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                          <span style={{ ...styles.rankBadge, backgroundColor: badgeCores[index] || '#2563EB' }}>{index + 1}º</span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                              <strong style={{ fontSize: '13px', color: '#0F172A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{tecido.nome} ({tecido.cor})</strong>
                              <strong style={{ fontSize: '13px', color: '#0F172A' }}>{tecido.totalUso.toLocaleString()} {tecido.unidade}</strong>
                            </div>
                            <span style={{ fontSize: '11px', color: '#64748B', display: 'block', marginBottom: '6px' }}>Cód: {tecido.codigo}</span>
                            <div style={styles.progressBarBg}><div style={{ ...styles.progressBarFill, width: `${pct}%`, backgroundColor: badgeCores[index] || '#2563EB' }} /></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div style={styles.chartBoxWide}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
                  <h3 style={{ ...styles.sectionTitle, margin: 0 }}>Evolução do Estoque <span style={{fontSize: '11px', color: '#64748B', fontWeight: '500'}}>(7 dias)</span></h3>
                  <select style={styles.chartSelect} value={unidadeGrafico} onChange={(e) => setUnidadeGrafico(e.target.value)}>
                    <option>Metros (m)</option><option>Quilos (kg)</option>
                  </select>
                </div>
                <div style={styles.svgChartContainer}>
                  <svg viewBox="0 0 600 200" style={{ width: '100%', height: '150px', overflow: 'visible' }}>
                    <defs>
                      <linearGradient id="gradEstoque" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#2563EB" stopOpacity="0.35" /><stop offset="100%" stopColor="#2563EB" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>
                    <line x1="0" y1="0" x2="600" y2="0" stroke="#E2E8F0" strokeDasharray="4" /><line x1="0" y1="50" x2="600" y2="50" stroke="#E2E8F0" strokeDasharray="4" />
                    <line x1="0" y1="100" x2="600" y2="100" stroke="#E2E8F0" strokeDasharray="4" /><line x1="0" y1="150" x2="600" y2="150" stroke="#E2E8F0" strokeDasharray="4" />
                    <path d={areaPath} fill="url(#gradEstoque)" /><path d={pontosPath} fill="none" stroke="#2563EB" strokeWidth="3" strokeLinecap="round" />
                    {valoresGraficoAtual.map((val, idx) => ( <circle key={idx} cx={getX(idx)} cy={getY(val)} r="5" fill="#2563EB" stroke="#FFFFFF" strokeWidth="2" /> ))}
                  </svg>
                  <div style={styles.chartXAxis}>{diasEvolucao.map((dia, idx) => ( <span key={idx}>{dia}</span> ))}</div>
                </div>
              </div>
            </div>

            <div style={styles.cardSection}>
              <h3 style={styles.sectionTitle}>🏢 Logística e Distribuição por Galpão</h3>
              <div style={styles.chartContainer}>
                {Object.keys(porLocalizacao).length === 0 ? ( <p style={styles.empty}>Nenhum local cadastrado.</p> ) : (
                  Object.entries(porLocalizacao).map(([chave, vals]) => (
                    <div key={chave} style={{...styles.chartBarWrapper, marginBottom: '10px', background: 'rgba(255,255,255,0.8)', padding: '14px 18px', borderRadius: '10px', border: '1px solid rgba(0,0,0,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px'}}>
                      <span style={{fontWeight: '700', color: '#0F172A', fontSize: '14px'}}>📍 {vals.nomeExibicao}</span>
                      <div style={{display: 'flex', gap: '24px', fontSize: '13px'}}>
                        <span style={{color: '#64748B'}}>Metros livres: <strong style={{color: '#2563EB'}}>{vals.m} m</strong></span>
                        <span style={{color: '#64748B'}}>Quilos livres: <strong style={{color: '#D97706'}}>{vals.kg} kg</strong></span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {abaAtiva === 'estoque' && (
          <div style={styles.cardSection}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
              <h3 style={{ ...styles.sectionTitle, margin: 0 }}>📦 Estoque Total Consolidado</h3>
              <span style={{ fontSize: '12px', color: '#64748B' }}>Visão agrupada por tecidos e cores</span>
            </div>
            <input type="text" placeholder="Pesquisar tecido por código ou nome..." value={buscaEstoque} onChange={(e) => setBuscaEstoque(e.target.value)} style={styles.inputFull} />
            {(() => {
              const agrupadoPorCodigo = {};
              Object.values(tecidosConsolidados).forEach(t => {
                const codNorm = normalizarTexto(t.codigo);
                if (!agrupadoPorCodigo[codNorm]) agrupadoPorCodigo[codNorm] = { codigoOriginal: t.codigo, nomeOriginal: t.nome, unidade: t.unidade, totalGeral: 0, cores: [] };
                agrupadoPorCodigo[codNorm].totalGeral += t.total;
                agrupadoPorCodigo[codNorm].cores.push({ cor: t.cor, total: t.total, bruto: t.totalBruto, reservas: t.totalReservas, sobras: t.totalSobras, minimo: t.minimo });
              });
              const filtrados = Object.values(agrupadoPorCodigo).filter(t => !normalizarTexto(buscaEstoque) || normalizarTexto(t.codigoOriginal).includes(normalizarTexto(buscaEstoque)) || normalizarTexto(t.nomeOriginal).includes(normalizarTexto(buscaEstoque)));
              if (filtrados.length === 0) return <div style={styles.empty}>Nenhum tecido encontrado.</div>;

              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {filtrados.map((item, idx) => (
                    <div key={idx} style={{ background: '#FFFFFF', padding: '20px', borderRadius: '12px', border: '1px solid #E2E8F0', boxShadow: '0 4px 6px rgba(0,0,0,0.02)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #E2E8F0', paddingBottom: '12px', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
                        <h4 style={{ margin: 0, fontSize: '16px', color: '#0F172A' }}>{item.codigoOriginal} - {item.nomeOriginal}</h4>
                        <span style={{ fontSize: '14px', fontWeight: '800', color: '#2563EB', backgroundColor: '#EFF6FF', padding: '6px 12px', borderRadius: '8px' }}>Total do Modelo: {item.totalGeral} {item.unidade}</span>
                      </div>
                      <div>
                        <span style={{ fontSize: '12px', color: '#64748B', fontWeight: '700', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>🎨 Cores (Clique para ver detalhes):</span>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          {item.cores.map((c, cIdx) => (
                            <button key={cIdx} onClick={() => setCorSelecionadaDetalhe({ codigo: item.codigoOriginal, nome: item.nomeOriginal, unidade: item.unidade, ...c })}
                              style={{ padding: '8px 16px', backgroundColor: '#F8FAFC', border: '1px solid #CBD5E1', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', color: '#0F172A', fontWeight: '600', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '8px' }}
                              onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#EFF6FF'; e.currentTarget.style.borderColor = '#93C5FD'; }}
                              onMouseOut={(e) => { e.currentTarget.style.backgroundColor = '#F8FAFC'; e.currentTarget.style.borderColor = '#CBD5E1'; }}>
                              <span style={{ width: '14px', height: '14px', borderRadius: '50%', backgroundColor: c.cor.toLowerCase().includes('black') || c.cor.toLowerCase().includes('preto') ? '#000' : c.cor.toLowerCase().includes('white') || c.cor.toLowerCase().includes('branco') ? '#FFF' : '#CBD5E1', border: '1px solid #94A3B8' }}></span>
                              {c.cor} <span style={{ color: c.total < 0 ? '#DC2626' : '#059669', marginLeft: '4px' }}>({c.total} {item.unidade})</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        )}

        {/* NOVA ABA: LOTES */}
        {abaAtiva === 'lotes' && (
          <div style={styles.cardSection}>
            <div style={{ borderBottom: '1px solid rgba(0,0,0,0.06)', paddingBottom: '14px', marginBottom: '20px' }}>
              <h3 style={{ ...styles.sectionTitle, margin: 0 }}>📦 Cadastrar Nova Entrada em Lote / Romaneio</h3>
              <p style={{ color: '#64748B', fontSize: '13px', margin: '4px 0 0 0' }}>Cadastre vários tecidos de uma vez. No final, será gerado um Lote com QR Code único aglomerando todas as peças.</p>
            </div>

            {/* Cabeçalho do Lote */}
            <div style={{ background: '#F8FAFC', padding: '20px', borderRadius: '12px', border: '1px solid #E2E8F0', marginBottom: '24px' }}>
              <h4 style={{ margin: '0 0 16px 0', fontSize: '14px', color: '#0F172A' }}>1. Informações Gerais do Lote</h4>
              <div style={styles.formGrid} className="form-grid-responsive">
                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Nome / Número do Lote (Obrigatório)</label>
                  <input type="text" placeholder="Ex: LOTE INVERNO 2026" value={formLote.numeroLote} onChange={(e) => setFormLote({...formLote, numeroLote: e.target.value})} style={styles.input} />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Fornecedor</label>
                  <input type="text" placeholder="Ex: Têxtil Silva" value={formLote.fornecedor} onChange={(e) => setFormLote({...formLote, fornecedor: e.target.value})} style={styles.input} />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Nota Fiscal</label>
                  <input type="text" placeholder="Ex: NF-45889" value={formLote.notaFiscal} onChange={(e) => setFormLote({...formLote, notaFiscal: e.target.value})} style={styles.input} />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Observação / Container</label>
                  <input type="text" placeholder="Ex: Entregue pelo portão 2" value={formLote.observacao} onChange={(e) => setFormLote({...formLote, observacao: e.target.value})} style={styles.input} />
                </div>
              </div>
            </div>

            {/* Inserir Itens no Lote */}
            <div style={{ background: '#FFFFFF', padding: '20px', borderRadius: '12px', border: '1px dashed #CBD5E1', marginBottom: '24px' }}>
              <h4 style={{ margin: '0 0 16px 0', fontSize: '14px', color: '#1D4ED8', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{background:'#DBEAFE', padding:'4px 8px', borderRadius:'6px'}}>2.</span> Adicionar Tecidos ao Lote
              </h4>
              <form onSubmit={adicionarItemAoLote} style={{...styles.formGrid, gridTemplateColumns: '1fr 1fr 1fr'}} className="form-grid-responsive">
                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Código *</label>
                  <input type="text" placeholder="Código" value={formItemLote.codigo} 
                    onChange={(e) => {
                      const val = e.target.value;
                      let novoNome = formItemLote.nome;
                      const tecido = Object.values(tecidosConsolidados).find(t => normalizarTexto(t.codigo) === normalizarTexto(val));
                      if (tecido) novoNome = tecido.nome;
                      setFormItemLote({...formItemLote, codigo: val, nome: novoNome});
                    }} 
                    style={styles.input} required />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Nome do Tecido *</label>
                  <input type="text" placeholder="Nome" value={formItemLote.nome} onChange={(e) => setFormItemLote({...formItemLote, nome: e.target.value})} style={styles.input} required />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Cor *</label>
                  <input type="text" placeholder="Cor" value={formItemLote.cor} onChange={(e) => setFormItemLote({...formItemLote, cor: e.target.value})} style={styles.input} required />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Quantidade *</label>
                  <div style={{display:'flex', gap:'6px'}}>
                    <input type="number" step="0.01" placeholder="Qtd" value={formItemLote.quantidade} onChange={(e) => setFormItemLote({...formItemLote, quantidade: e.target.value})} style={styles.input} required />
                    <select value={formItemLote.unidadeMedida} onChange={(e) => setFormItemLote({...formItemLote, unidadeMedida: e.target.value})} style={{...styles.input, width:'80px', padding:'12px 6px'}}>
                      <option value="m">m</option><option value="kg">kg</option>
                    </select>
                  </div>
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Localização / Galpão *</label>
                  <input type="text" placeholder="Localização" value={formItemLote.localizacao} onChange={(e) => setFormItemLote({...formItemLote, localizacao: e.target.value})} style={styles.input} required />
                </div>
                <div style={{display: 'flex', alignItems: 'flex-end'}}>
                  <button type="submit" style={{...styles.button, background: '#F1F5F9', color: '#1D4ED8', border: '1px solid #BFDBFE', padding: '13px', boxShadow: 'none'}}>+ Incluir na Lista</button>
                </div>
              </form>
            </div>

            {/* Lista de Itens no Draft */}
            {itensLoteDraft.length > 0 && (
              <div style={{marginBottom: '24px'}}>
                <h4 style={{ margin: '0 0 10px 0', fontSize: '13px', color: '#0F172A' }}>Rascunho de Tecidos deste Lote ({itensLoteDraft.length} itens):</h4>
                <div style={{border: '1px solid #E2E8F0', borderRadius: '10px', overflow: 'hidden'}}>
                  <table style={{...styles.table, minWidth: '100%'}}>
                    <thead style={{background: '#F8FAFC'}}>
                      <tr>
                        <th style={styles.th}>Código</th>
                        <th style={styles.th}>Tecido/Cor</th>
                        <th style={styles.th}>Qtd</th>
                        <th style={styles.th}>Local</th>
                        <th style={styles.th}>Ação</th>
                      </tr>
                    </thead>
                    <tbody>
                      {itensLoteDraft.map(item => (
                        <tr key={item.idDraft} style={{borderTop: '1px solid #E2E8F0'}}>
                          <td style={{...styles.td, padding: '10px 12px'}}><strong>{item.codigo}</strong></td>
                          <td style={{...styles.td, padding: '10px 12px'}}>{item.nome} <br/><span style={{color: '#2563EB', fontSize: '11px'}}>{item.cor}</span></td>
                          <td style={{...styles.td, padding: '10px 12px'}}><strong>{item.quantidade} {item.unidadeMedida}</strong></td>
                          <td style={{...styles.td, padding: '10px 12px', fontSize: '12px'}}>{item.localizacao}</td>
                          <td style={{...styles.td, padding: '10px 12px'}}>
                            <button onClick={() => removerItemDoLote(item.idDraft)} style={styles.btnDeletar}>Remover</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                <button onClick={salvarLoteDefinitivo} disabled={carregando} style={{...styles.button, background: 'linear-gradient(135deg, #059669 0%, #047857 100%)', color: '#fff', marginTop: '16px'}}>
                  {carregando ? 'Salvando na Nuvem...' : '💾 Salvar Lote e Lançar no Estoque'}
                </button>
              </div>
            )}

            <hr style={{border: 'none', borderTop: '1px dashed #CBD5E1', margin: '36px 0'}} />

            {/* TABELA DE LOTES SALVOS */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
              <h3 style={{ ...styles.sectionTitle, margin: 0 }}>📋 Histórico de Lotes / Romaneios na Nuvem</h3>
            </div>
            
            <div style={styles.tableResponsive}>
              <table style={styles.table}>
                <thead>
                  <tr style={styles.thTr}>
                    <th style={styles.th}>Identificador do Lote</th>
                    <th style={styles.th}>Fornecedor & NF</th>
                    <th style={styles.th}>Data Cadastro</th>
                    <th style={styles.th}>Qtd Tecidos</th>
                    <th style={styles.th}>Ações do Lote</th>
                  </tr>
                </thead>
                <tbody>
                  {listaDeLotes.length === 0 ? (
                    <tr><td colSpan="5" style={styles.empty}>Nenhum lote foi cadastrado na nuvem ainda.</td></tr>
                  ) : (
                    listaDeLotes.map(lote => (
                      <tr key={lote.id} style={styles.tr}>
                        <td style={styles.td}>
                          <strong style={{color: '#0F172A', fontSize: '14px'}}>{lote.nome}</strong><br/>
                          <span style={{fontSize: '10px', color: '#94A3B8'}}>{lote.id}</span>
                        </td>
                        <td style={styles.td}>
                          <div style={{fontSize: '13px', fontWeight: '600'}}>{lote.fornecedor}</div>
                          <div style={{fontSize: '11px', color: '#64748B'}}>NF: {lote.notaFiscal}</div>
                        </td>
                        <td style={styles.td}><span style={{color: '#64748B'}}>{lote.data}</span></td>
                        <td style={styles.td}><span style={{background: '#EFF6FF', color: '#1D4ED8', padding: '4px 8px', borderRadius: '6px', fontWeight: '700'}}>{lote.itens.length} itens</span></td>
                        <td style={styles.td}>
                          <button onClick={() => setLoteSelecionadoDetalhe(lote)} style={{...styles.btnEditar, marginRight:'6px'}} title="Ver tecidos do lote">👁️ Ver Itens</button>
                          <button onClick={() => setQrSelecionado({ isLote: true, id: lote.id, nome: lote.nome })} style={styles.btnQr} title="Gerar QR Code do Lote Inteiro">🔲 QR Code Lote</button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

          </div>
        )}

        {/* RESTANTE DAS ABAS... */}
        {abaAtiva === 'entrada' && (
          <div style={styles.cardSection}>
            <div style={{ borderBottom: '1px solid rgba(0,0,0,0.06)', paddingBottom: '14px', marginBottom: '20px' }}>
              <h3 style={{ ...styles.sectionTitle, margin: 0 }}>{idEditando ? '✏️ Atualizar Dados de Entrada' : '📥 Cadastro de Entrada Avulsa'}</h3>
              <p style={{ color: '#64748B', fontSize: '13px', margin: '4px 0 0 0' }}>Para dar entrada em muitos itens juntos, use a aba "Entradas em Lote".</p>
            </div>
            <form onSubmit={registrarOuAtualizarMovimento} style={styles.formGrid} className="form-grid-responsive">
              <div style={styles.formGroup}><label style={styles.formLabel}>Código do Tecido *</label><input type="text" placeholder="Ex: TEC-001" value={form.codigo} onChange={(e) => setForm({...form, codigo: e.target.value})} style={styles.input} required /></div>
              <div style={styles.formGroup}><label style={styles.formLabel}>Nome do Tecido *</label><input type="text" placeholder="Ex: Malha Canelada" value={form.nome} onChange={(e) => setForm({...form, nome: e.target.value})} style={styles.input} required /></div>
              <div style={styles.formGroup}><label style={styles.formLabel}>Cor do Tecido *</label><input type="text" placeholder="Ex: Azul Marinho" value={form.cor} onChange={(e) => setForm({...form, cor: e.target.value})} style={styles.input} required /></div>
              <div style={styles.formGroup}><label style={styles.formLabel}>Largura (m)</label><input type="number" step="0.01" placeholder="Ex: 1.50" value={form.largura} onChange={(e) => setForm({...form, largura: e.target.value})} style={styles.input} /></div>
              <div style={styles.formGroup}><label style={styles.formLabel}>Localização / Galpão *</label><input type="text" placeholder="Ex: Galpão A - Setor 2" value={form.localizacao} onChange={(e) => setForm({...form, localizacao: e.target.value})} style={styles.input} required /></div>
              <div style={{display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '10px'}}>
                <div style={styles.formGroup}><label style={styles.formLabel}>Quantidade *</label><input type="number" step="0.01" placeholder="0.00" value={form.quantidade} onChange={(e) => setForm({...form, quantidade: e.target.value, metros: e.target.value})} style={styles.input} required /></div>
                <div style={styles.formGroup}><label style={styles.formLabel}>Unidade</label><select value={form.unidadeMedida} onChange={(e) => setForm({...form, unidadeMedida: e.target.value})} style={styles.input}><option value="m">Metros (m)</option><option value="kg">Quilos (kg)</option></select></div>
              </div>
              <div style={styles.formGroup}><label style={styles.formLabel}>Estoque Mínimo</label><input type="number" step="0.01" placeholder="Ex: 180" value={form.estoqueMinimo} onChange={(e) => setForm({...form, estoqueMinimo: e.target.value})} style={styles.input} /></div>
              <div style={styles.formGroup}><label style={styles.formLabel}>Valor Unitário (R$)</label><input type="number" step="0.01" placeholder="Ex: 15.90" value={form.preco} onChange={(e) => setForm({...form, preco: e.target.value})} style={styles.input} /></div>
              <div style={styles.formGroup}><label style={styles.formLabel}>Nota Fiscal</label><input type="text" placeholder="Ex: 45892" value={form.notaFiscal} onChange={(e) => setForm({...form, notaFiscal: e.target.value})} style={styles.input} /></div>
              <div style={styles.formGroup}><label style={styles.formLabel}>Fornecedor</label><input type="text" placeholder="Ex: Têxtil Exemplo" value={form.fornecedor} onChange={(e) => setForm({...form, fornecedor: e.target.value})} style={styles.input} /></div>
              
              <div style={{gridColumn: '1 / -1'}}><label style={styles.formLabel}>Anexar Imagem (Opcional)</label><input type="file" accept="image/*" capture="environment" onChange={handleFotoChange} style={styles.inputFile} /></div>
              {form.foto && (<div style={{gridColumn: '1 / -1', ...styles.previewContainer}}><img src={form.foto} alt="Prévia" style={styles.previewImg} onClick={() => setFotoSelecionada(form.foto)} /><div><strong style={{display: 'block', color: '#065F46', fontSize: '13px'}}>Imagem anexada com sucesso</strong><span style={{color: '#64748B', fontSize: '11px', cursor: 'pointer'}} onClick={() => setFotoSelecionada(form.foto)}>Clique na miniatura para ampliar</span></div></div>)}

              <div style={{gridColumn: '1 / -1', marginTop: '8px'}}><button type="submit" disabled={carregando} style={{...styles.button, background: idEditando ? '#D97706' : 'linear-gradient(135deg, #059669 0%, #047857 100%)', color: '#fff'}}>{carregando ? 'Processando...' : (idEditando ? 'Salvar Alterações' : 'Salvar Entrada')}</button></div>
            </form>
          </div>
        )}

        {abaAtiva === 'saida' && (
          <div style={styles.cardSection}>
            <div style={{ borderBottom: '1px solid rgba(0,0,0,0.06)', paddingBottom: '14px', marginBottom: '20px' }}>
              <h3 style={{ ...styles.sectionTitle, margin: 0 }}>{idEditando ? '✏️ Editar Saída de Tecido' : '📤 Lançamento de Baixa / Saída'}</h3>
            </div>
            <form onSubmit={registrarOuAtualizarMovimento} style={styles.formGrid} className="form-grid-responsive">
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Código do Tecido *</label>
                <input type="text" placeholder="Digite o código" value={form.codigo} 
                  onChange={(e) => {
                    const val = e.target.value; let novoNome = form.nome;
                    const tecidoEncontrado = Object.values(tecidosConsolidados).find(t => normalizarTexto(t.codigo) === normalizarTexto(val));
                    if (tecidoEncontrado) novoNome = tecidoEncontrado.nome;
                    setForm({...form, codigo: val, nome: novoNome, cor: ''});
                  }} 
                  style={styles.input} required />
              </div>

              {form.codigo && !idEditando && (
                (() => {
                  const coresDoCodigo = Object.values(tecidosConsolidados).filter(t => normalizarTexto(t.codigo) === normalizarTexto(form.codigo));
                  if (coresDoCodigo.length === 0) return (<div style={{gridColumn: '1 / -1', background: '#FEF2F2', padding: '14px', borderRadius: '10px', border: '1px solid #FCA5A5'}}><span style={{fontSize: '13px', color: '#991B1B', fontWeight: '700'}}>⚠️ CÓDIGO NÃO ENCONTRADO NO ESTOQUE!</span></div>);
                  return (
                    <div style={{gridColumn: '1 / -1', background: '#EFF6FF', padding: '14px', borderRadius: '10px', border: '1px solid #BFDBFE'}}>
                      <span style={{fontSize: '11px', color: '#1D4ED8', fontWeight: '700', display: 'block', marginBottom: '8px'}}>🎨 Selecione a cor:</span>
                      <div style={{display: 'flex', gap: '8px', flexWrap: 'wrap'}}>
                        {coresDoCodigo.map((tItem, idx) => {
                          const isSelected = normalizarTexto(form.cor) === normalizarTexto(tItem.cor);
                          return (
                            <button key={idx} type="button" onClick={() => setForm(prev => ({ ...prev, nome: tItem.nome || prev.nome, cor: tItem.cor || '', unidadeMedida: tItem.unidade || 'm', estoqueMinimo: tItem.minimo || '' }))}
                              style={{ padding: '8px 14px', backgroundColor: isSelected ? '#2563EB' : '#FFFFFF', color: isSelected ? '#FFFFFF' : '#1D4ED8', border: '1px solid #93C5FD', borderRadius: '8px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}>
                              ✓ {tItem.cor} ({tItem.total} {tItem.unidade} disp.)
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()
              )}

              <div style={styles.formGroup}><label style={styles.formLabel}>Nome do Tecido *</label><input type="text" placeholder="Preenchido automaticamente" value={form.nome} onChange={(e) => setForm({...form, nome: e.target.value})} style={!idEditando ? {...styles.input, backgroundColor: '#F1F5F9', color: '#64748B', cursor: 'not-allowed'} : styles.input} readOnly={!idEditando} required /></div>
              <div style={styles.formGroup}><label style={styles.formLabel}>Cor do Tecido *</label><input type="text" placeholder={!idEditando ? "Selecione a cor acima" : "Cor"} value={form.cor} onChange={(e) => setForm({...form, cor: e.target.value})} style={!idEditando ? {...styles.input, backgroundColor: '#F1F5F9', color: '#64748B', cursor: 'not-allowed'} : styles.input} readOnly={!idEditando} required /></div>
              <div style={styles.formGroup}><label style={styles.formLabel}>Largura (m)</label><input type="number" step="0.01" value={form.largura} onChange={(e) => setForm({...form, largura: e.target.value})} style={styles.input} /></div>
              <div style={styles.formGroup}><label style={styles.formLabel}>Localização / Galpão *</label><input type="text" value={form.localizacao} onChange={(e) => setForm({...form, localizacao: e.target.value})} style={styles.input} required /></div>
              <div style={{display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '10px'}}>
                <div style={styles.formGroup}><label style={styles.formLabel}>Quantidade Utilizada *</label><input type="number" step="0.01" value={form.quantidade} onChange={(e) => setForm({...form, quantidade: e.target.value, metros: e.target.value})} style={styles.input} required /></div>
                <div style={styles.formGroup}><label style={styles.formLabel}>Unidade</label><select value={form.unidadeMedida} onChange={(e) => setForm({...form, unidadeMedida: e.target.value})} style={styles.input}><option value="m">m</option><option value="kg">kg</option></select></div>
              </div>
              <div style={styles.formGroup}><label style={styles.formLabel}>Estoque Mínimo</label><input type="number" step="0.01" value={form.estoqueMinimo} onChange={(e) => setForm({...form, estoqueMinimo: e.target.value})} style={styles.input} /></div>
              <div style={styles.formGroup}><label style={styles.formLabel}>Valor Unitário (R$)</label><input type="number" step="0.01" value={form.preco} onChange={(e) => setForm({...form, preco: e.target.value})} style={styles.input} /></div>
              <div style={styles.formGroup}><label style={styles.formLabel}>NF / Ref</label><input type="text" value={form.notaFiscal} onChange={(e) => setForm({...form, notaFiscal: e.target.value})} style={styles.input} /></div>
              <div style={styles.formGroup}><label style={styles.formLabel}>Destino</label><input type="text" value={form.fornecedor} onChange={(e) => setForm({...form, fornecedor: e.target.value})} style={styles.input} /></div>

              <div style={{gridColumn: '1 / -1', marginTop: '8px'}}><button type="submit" disabled={carregando} style={{...styles.button, background: idEditando ? '#D97706' : 'linear-gradient(135deg, #DC2626 0%, #B91C1C 100%)', color: '#fff'}}>{carregando ? 'Processando...' : (idEditando ? 'Salvar Alterações' : 'Confirmar Saída')}</button></div>
            </form>
          </div>
        )}

        {/* ... RESERVAS, SOBRAS, HISTORICO ficam praticamente idênticos ... */}
        {abaAtiva === 'historico' && (
          <div style={styles.cardSection}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
              <h3 style={{ ...styles.sectionTitle, margin: 0 }}>🔍 Movimentações</h3>
              <span style={{ fontSize: '12px', color: '#64748B' }}>Total de registros: <strong>{movFiltradas.length}</strong></span>
            </div>
            <input type="text" placeholder="Pesquisar por nome, código, cor, NF ou Lote..." value={busca} onChange={(e) => setBusca(e.target.value)} style={styles.inputFull} />
            <div style={styles.tableResponsive}>
              <table style={styles.table}>
                <thead>
                  <tr style={styles.thTr}>
                    <th style={styles.th}>Tipo</th>
                    <th style={styles.th}>Código</th>
                    <th style={styles.th}>Tecido / Cor</th>
                    <th style={styles.th}>Qtd</th>
                    <th style={styles.th}>Lote / NF</th>
                    <th style={styles.th}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {movFiltradas.map((item) => {
                    const itemId = item.id || item._id;
                    const tipoMovimentoReal = item._tipoExibicao;
                    let badgeBg = '#DEF7EC'; let badgeColor = '#03543F'; let badgeText = '📥 Entrada';
                    if (tipoMovimentoReal === 'saida') { badgeBg = '#FDE8E8'; badgeColor = '#9B1C1C'; badgeText = '📤 Saída'; } 
                    else if (tipoMovimentoReal === 'Reserva') { badgeBg = '#FEF3C7'; badgeColor = '#92400E'; badgeText = '📌 Reserva'; } 
                    else if (tipoMovimentoReal === 'Retalhos') { badgeBg = '#F3E8FF'; badgeColor = '#6B21A8'; badgeText = '✂️ Retalho'; }

                    return (
                      <tr key={itemId} style={styles.tr}>
                        <td style={styles.td}><span style={{...styles.badge, background: badgeBg, color: badgeColor}}>{badgeText}</span></td>
                        <td style={styles.td}><strong style={{color: '#0F172A'}}>{item.codigo}</strong></td>
                        <td style={styles.td}><div style={{ fontWeight: '600' }}>{item.nome} <span style={{color: '#2563EB'}}>({item.cor})</span></div></td>
                        <td style={styles.td}><strong>{item.quantidade || item.metros} {item.unidademedida || item.unidadeMedida || 'm'}</strong></td>
                        <td style={styles.td}>
                          {item.nomeLote ? <div style={{fontSize:'11px', background:'#DBEAFE', color:'#1E3A8A', padding:'2px 4px', borderRadius:'4px', display:'inline-block'}}>{item.nomeLote}</div> : '-'}
                          <div style={{fontSize:'10px', color:'#64748B'}}>{item.notafiscal || item.notaFiscal || ''}</div>
                        </td>
                        <td style={styles.td}>
                          {!item.isExtra && (
                            <>
                              <button onClick={() => setQrSelecionado({isLote: false, ...item})} style={styles.btnQr} title="Gerar QR Code">🔲</button>
                              <button onClick={() => iniciarEdicao(item)} style={styles.btnEditar}>✏️</button>
                              <button onClick={() => deletarItem(itemId)} style={styles.btnDeletar}>🗑️</button>
                            </>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* MODAL DETALHE DO LOTE PARA VER ITENS */}
      {loteSelecionadoDetalhe && (
        <div style={styles.modalOverlay} onClick={() => setLoteSelecionadoDetalhe(null)}>
          <div style={{...styles.modalContent, alignItems: 'flex-start', maxWidth: '800px', width: '100%'}} onClick={(e) => e.stopPropagation()}>
            <button style={styles.modalCloseBtn} onClick={() => setLoteSelecionadoDetalhe(null)}>✕ Fechar</button>
            <h3 style={{ margin: '0 0 10px 0', color: '#1E3A8A', fontSize: '18px' }}>Lote: {loteSelecionadoDetalhe.nome}</h3>
            <p style={{ margin: '0 0 20px 0', fontSize: '13px', color: '#64748B' }}>
              Fornecedor: <strong>{loteSelecionadoDetalhe.fornecedor}</strong> | NF: <strong>{loteSelecionadoDetalhe.notaFiscal}</strong> | Entrada: {loteSelecionadoDetalhe.data}
            </p>
            <div style={{...styles.tableResponsive, maxHeight: '50vh', overflowY: 'auto', border: '1px solid #E2E8F0', borderRadius: '8px'}}>
              <table style={{...styles.table, minWidth: '100%'}}>
                <thead style={{background: '#F8FAFC'}}>
                  <tr><th style={styles.th}>Código</th><th style={styles.th}>Tecido / Cor</th><th style={styles.th}>Quantidade</th><th style={styles.th}>Local</th></tr>
                </thead>
                <tbody>
                  {loteSelecionadoDetalhe.itens.map(it => (
                    <tr key={it.id || it._id} style={{borderTop: '1px solid #E2E8F0'}}>
                      <td style={styles.td}><strong>{it.codigo}</strong></td>
                      <td style={styles.td}>{it.nome} <br/><span style={{color:'#2563EB', fontSize:'11px'}}>{it.cor}</span></td>
                      <td style={styles.td}><strong>{it.quantidade || it.metros} {it.unidademedida || it.unidadeMedida || 'm'}</strong></td>
                      <td style={styles.td}>{it.localizacao}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL QR CODE UNIFICADO (Tecido ou Lote) */}
      {qrSelecionado && (
        <div style={styles.modalOverlay} onClick={() => setQrSelecionado(null)}>
          <div style={{...styles.modalContent, alignItems: 'center'}} onClick={(e) => e.stopPropagation()}>
            <button style={styles.modalCloseBtn} onClick={() => setQrSelecionado(null)}>✕ Fechar</button>
            <h3 style={{ margin: '0 0 4px 0', fontSize: '16px', color: '#0F172A', fontWeight: '800' }}>
              {qrSelecionado.isLote ? 'QR Code do Lote Inteiro' : 'QR Code do Rolo'}
            </h3>
            <p style={{ fontSize: '13px', color: '#64748B', marginBottom: '16px', textAlign: 'center' }}>
              {qrSelecionado.isLote ? (
                <>Romaneio: <strong>{qrSelecionado.nome}</strong></>
              ) : (
                <><strong>{qrSelecionado.codigo}</strong> - {qrSelecionado.nome} (<span style={{color: '#2563EB', fontWeight: '700'}}>{qrSelecionado.cor}</span>)</>
              )}
            </p>
            <div style={{ background: '#FFFFFF', padding: '16px', borderRadius: '12px', border: '1px solid #CBD5E1', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', marginBottom: '14px' }}>
              <img 
                src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(
                  qrSelecionado.isLote 
                    ? `${window.location.origin}/?lote=${qrSelecionado.id}`
                    : `${window.location.origin}/?codigo=${qrSelecionado.codigo}&cor=${encodeURIComponent(qrSelecionado.cor)}`
                )}`} 
                alt="QR Code" 
                style={{ width: '200px', height: '200px', display: 'block' }} 
              />
            </div>
            <span style={{ fontSize: '11px', color: '#64748B', textAlign: 'center', maxWidth: '280px', lineHeight: '1.4' }}>
              {qrSelecionado.isLote 
                ? '📱 Apontar a câmera para este QR Code exibirá uma página contendo TODOS os tecidos e quantidades que vieram dentro deste lote.'
                : '📱 Ao apontar a câmera do celular, ele carregará diretamente o status deste rolo, revelando a quantidade final disponível.'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

// ========================
// STYLES 
// ========================
const styles = {
  qrViewContainer: { display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: '#F1F5F9', padding: '16px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' },
  qrViewCard: { backgroundColor: '#FFFFFF', padding: '28px', borderRadius: '20px', boxShadow: '0 15px 35px rgba(0, 0, 0, 0.08)', width: '100%', maxWidth: '400px', boxSizing: 'border-box', border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', alignItems: 'center' },
  qrViewImg: { width: '100px', height: '100px', objectFit: 'cover', borderRadius: '12px', marginBottom: '16px', border: '2px solid #2563EB', cursor: 'pointer' },
  qrViewNoFoto: { fontSize: '12px', color: '#94A3B8', marginBottom: '16px', fontStyle: 'italic', backgroundColor: '#F8FAFC', padding: '12px 24px', borderRadius: '8px' },
  qrInfoBox: { width: '100%', backgroundColor: '#F8FAFC', borderRadius: '12px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px', border: '1px solid #E2E8F0', boxSizing: 'border-box' },
  qrInfoRow: { display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#475569' },
  qrBackBtn: { width: '100%', padding: '12px', backgroundColor: '#F1F5F9', color: '#334155', border: '1px solid #CBD5E1', borderRadius: '10px', fontWeight: '700', cursor: 'pointer', fontSize: '13px' },
  appLayout: { display: 'flex', minHeight: '100vh', backgroundColor: '#F4F7FC', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' },
  sidebar: { width: '260px', backgroundColor: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(12px)', borderRight: '1px solid rgba(226, 232, 240, 0.8)', display: 'flex', flexDirection: 'column', padding: '24px 16px', boxSizing: 'border-box', position: 'sticky', top: 0, height: '100vh', zIndex: 100 },
  sidebarHeader: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px', paddingLeft: '4px' },
  sidebarTitle: { fontSize: '16px', fontWeight: '800', color: '#0F172A', margin: 0, letterSpacing: '-0.3px' },
  versionBadge: { fontSize: '10px', fontWeight: '700', color: '#2563EB', backgroundColor: 'rgba(37,99,235,0.08)', padding: '2px 6px', borderRadius: '4px', border: '1px solid rgba(37,99,235,0.2)' },
  logoBadge: { width: '38px', height: '38px', background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff', fontSize: '15px', fontWeight: '900', boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)', flexShrink: 0 },
  sidebarNavGroup: { display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 },
  sidebarLink: { display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '12px 14px', backgroundColor: 'transparent', color: '#64748B', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s' },
  sidebarLinkActive: { backgroundColor: '#2563EB', color: '#ffffff', boxShadow: '0 4px 15px rgba(37, 99, 235, 0.3)', fontWeight: '700' },
  mainContent: { flex: 1, padding: '32px', boxSizing: 'border-box', maxWidth: 'calc(100vw - 260px)', overflowX: 'auto' },
  topbar: { marginBottom: '28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', backgroundColor: 'rgba(255, 255, 255, 0.75)', backdropFilter: 'blur(12px)', padding: '16px 28px', borderRadius: '16px', boxShadow: '0 10px 30px rgba(0, 0, 0, 0.04)', border: '1px solid rgba(255, 255, 255, 0.9)' },
  statusBadgeContainer: { display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: 'rgba(16, 185, 129, 0.08)', padding: '6px 14px', borderRadius: '20px', border: '1px solid rgba(16, 185, 129, 0.3)' },
  pulseDot: { width: '8px', height: '8px', backgroundColor: '#059669', borderRadius: '50%', display: 'inline-block', boxShadow: '0 0 6px #059669' },
  statusText: { fontSize: '12px', color: '#047857', fontWeight: '700' },
  alertaContainer: { backgroundColor: 'rgba(254, 242, 242, 0.9)', border: '1px solid #FCA5A5', padding: '16px 20px', borderRadius: '12px', marginBottom: '24px' },
  metricsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '16px', marginBottom: '24px' },
  metricCard: { backgroundColor: 'rgba(255, 255, 255, 0.75)', padding: '18px 20px', borderRadius: '14px', border: '1px solid rgba(255, 255, 255, 0.9)', display: 'flex', flexDirection: 'column' },
  metricLabel: { fontSize: '11px', color: '#64748B', marginBottom: '6px', fontWeight: '700', textTransform: 'uppercase' },
  metricVal: { fontSize: '22px', fontWeight: '900', marginBottom: '2px' },
  metricSub: { fontSize: '11px', color: '#94A3B8' },
  chartsRow: { display: 'grid', gridTemplateColumns: '1fr 1.3fr', gap: '24px', marginBottom: '24px' },
  chartBoxWide: { backgroundColor: 'rgba(255, 255, 255, 0.75)', padding: '24px', borderRadius: '16px', border: '1px solid rgba(255, 255, 255, 0.9)' },
  cardSection: { backgroundColor: 'rgba(255, 255, 255, 0.75)', padding: '26px', borderRadius: '16px', border: '1px solid rgba(255, 255, 255, 0.9)', marginBottom: '24px' },
  sectionTitle: { fontSize: '15px', color: '#0F172A', marginBottom: '16px', marginTop: 0, fontWeight: '800' },
  formGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px' },
  formGroup: { display: 'flex', flexDirection: 'column' },
  formLabel: { fontSize: '11px', color: '#475569', marginBottom: '6px', fontWeight: '700', textTransform: 'uppercase' },
  input: { width: '100%', padding: '12px 16px', borderRadius: '10px', border: '1px solid #CBD5E1', fontSize: '14px', outline: 'none', boxSizing: 'border-box' },
  inputFull: { width: '100%', padding: '12px 16px', borderRadius: '10px', border: '1px solid #CBD5E1', fontSize: '14px', outline: 'none', boxSizing: 'border-box', marginBottom: '18px' },
  button: { width: '100%', padding: '14px', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: '800', cursor: 'pointer', boxShadow: '0 4px 15px rgba(0,0,0,0.08)' },
  tableResponsive: { width: '100%', overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '900px' },
  thTr: { borderBottom: '2px solid #E2E8F0', backgroundColor: 'rgba(248, 250, 252, 0.8)' },
  th: { padding: '14px 12px', fontSize: '11px', color: '#475569', textTransform: 'uppercase', fontWeight: '800' },
  tr: { borderBottom: '1px solid #E2E8F0' },
  td: { padding: '16px 12px', fontSize: '13px', color: '#334155' },
  btnEditar: { padding: '6px 10px', backgroundColor: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: '700' },
  btnQr: { padding: '6px 10px', backgroundColor: '#F3E8FF', color: '#7E22CE', border: '1px solid #D8B4FE', borderRadius: '8px', cursor: 'pointer', marginRight: '6px', fontSize: '12px', fontWeight: '700' },
  btnDeletar: { padding: '6px 10px', backgroundColor: '#FEE2E2', color: '#991B1B', border: '1px solid #FCA5A5', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: '700' },
  empty: { textAlign: 'center', padding: '36px', color: '#94A3B8', fontSize: '14px' },
  modalOverlay: { position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(6px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: '1000', padding: '20px' },
  modalContent: { backgroundColor: '#ffffff', padding: '24px', borderRadius: '16px', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px rgba(0, 0, 0, 0.25)', border: '1px solid #E2E8F0' },
  modalCloseBtn: { backgroundColor: '#DC2626', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: '8px', fontWeight: '700', cursor: 'pointer', marginBottom: '12px', fontSize: '12px' },
};

export default SunnyWearTecidos;