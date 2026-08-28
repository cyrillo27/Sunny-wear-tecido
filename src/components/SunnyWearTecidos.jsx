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

  const [abaAtiva, setAbaAtiva] = useState('dashboard');
  const [movimentacoes, setMovimentacoes] = useState([]);
  const [carregando, setCarregando] = useState(false);
  const [menuMobileAberto, setMenuMobileAberto] = useState(false);

  const [fotoSelecionada, setFotoSelecionada] = useState(null);
  const [qrSelecionado, setQrSelecionado] = useState(null);
  const [idEditando, setIdEditando] = useState(null);
  
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

  const [formSobra, setFormSobra] = useState({
    codigo: '',
    nome: '',
    cor: '',
    quantidade: '',
    unidadeMedida: 'm',
    localizacao: '',
    observacao: ''
  });
  const [buscaSobraTexto, setBuscaSobraTexto] = useState('');
  const [termoBuscaSobra, setTermoBuscaSobra] = useState('');

  const [formReserva, setFormReserva] = useState({
    codigo: '',
    nome: '',
    cor: '',
    quantidade: '',
    unidadeMedida: 'm',
    localizacao: '',
    observacao: ''
  });
  const [buscaReservaTexto, setBuscaReservaTexto] = useState('');
  const [termoBuscaReserva, setTermoBuscaReserva] = useState('');
  
  const [termoBuscaSaida, setTermoBuscaSaida] = useState('');
  const [busca, setBusca] = useState('');

  const API_URL = 'https://sunny-wear-tecido.onrender.com/api/movimentacoes';

  const parseNumero = (val) => {
    if (typeof val === 'number') return val;
    if (!val) return 0;
    const limpo = String(val).replace(',', '.');
    const num = Number(limpo);
    return isNaN(num) ? 0 : num;
  };

  const normalizarTexto = (str) => {
    if (!str) return '';
    return String(str)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  };

  const obterMinimo = (item) => {
    return parseNumero(item?.estoqueminimo || item?.estoqueMinimo || item?.estoque_minimo || 0);
  };
  
  const obterTipo = (item) => {
    const tipo = item?.tipomovimento || item?.tipoMovimento || 'entrada';
    return normalizarTexto(tipo);
  };

  const carregarDadosDoServidor = async () => {
    setCarregando(true);
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
    } finally {
      setCarregando(false);
    }
  };

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

  const reservas = movimentacoes.filter(m => {
    const t = obterTipo(m);
    const obs = String(m.observacao || '').toUpperCase();
    return t === 'reserva' || obs.includes('[RESERVA]');
  });

  const sobras = movimentacoes.filter(m => {
    const t = obterTipo(m);
    const obs = String(m.observacao || '').toUpperCase();
    return t === 'sobra' || obs.includes('[RETALHO]');
  });

  const sobrasSaidas = movimentacoes.filter(m => {
    const t = obterTipo(m);
    const obs = String(m.observacao || '').toUpperCase();
    return t === 'saida_sobra' || obs.includes('[USO-RETALHO]');
  });
  
  const listaSeguraCalculos = Array.isArray(movimentacoes) ? movimentacoes : [];

  const calcularEstoqueLivre = (codigo, cor, ignorarReservaId = null, ignorarSobraId = null) => {
    let bruto = 0;
    let res = 0;
    let sob = 0;

    const codBusca = normalizarTexto(codigo);
    const corBusca = normalizarTexto(cor);

    movimentacoes.forEach(m => {
      const codM = normalizarTexto(m.codigo);
      const corM = normalizarTexto(m.cor || 'N/D');
      
      const codigoBate = codM === codBusca;
      const corBate = !corBusca || corBusca === 'n/d' || corM === corBusca || corM === 'n/d';

      if (codigoBate && corBate) {
        const mId = m.id || m._id;
        const q = parseNumero(m.metros || m.quantidade || 0);
        const t = obterTipo(m);
        const obs = String(m.observacao || '').toUpperCase();

        const isReserva = t === 'reserva' || obs.includes('[RESERVA]');
        const isRetalho = t === 'sobra' || obs.includes('[RETALHO]');
        const isSaidaNormal = t === 'saida' && !isReserva && !isRetalho && !obs.includes('[USO-RETALHO]');
        const isEntradaNormal = t === 'entrada' && !isReserva && !isRetalho; // Proteção contra erro do servidor

        if (isEntradaNormal) bruto += q;
        if (isSaidaNormal) bruto -= q;
        
        if (isReserva && mId !== ignorarReservaId) res += q;
        if (isRetalho && mId !== ignorarSobraId) sob += q;
      }
    });

    return bruto - res - sob;
  };

  const executarBuscaReserva = () => {
    const termo = normalizarTexto(termoBuscaReserva);
    if (!termo) { alert('Digite o código para buscar.'); return; }
    
    const tecidoEncontrado = listaSeguraCalculos.find(m => normalizarTexto(m?.codigo).includes(termo) || normalizarTexto(m?.nome).includes(termo));
    if (tecidoEncontrado) {
      setFormReserva(prev => ({
        ...prev,
        codigo: tecidoEncontrado.codigo,
        nome: tecidoEncontrado.nome,
        cor: tecidoEncontrado.cor || '',
        localizacao: tecidoEncontrado.localizacao || '',
        unidadeMedida: tecidoEncontrado.unidademedida || tecidoEncontrado.unidadeMedida || 'm'
      }));
      alert(`✅ Item preenchido: ${tecidoEncontrado.nome} (Cor: ${tecidoEncontrado.cor})`);
    } else {
      alert('⚠️ Nenhum tecido encontrado.');
    }
  };

  const executarBuscaSobra = () => {
    const termo = normalizarTexto(termoBuscaSobra);
    if (!termo) { alert('Digite o código para buscar.'); return; }
    
    const tecidoEncontrado = listaSeguraCalculos.find(m => normalizarTexto(m?.codigo).includes(termo) || normalizarTexto(m?.nome).includes(termo));
    if (tecidoEncontrado) {
      setFormSobra(prev => ({
        ...prev,
        codigo: tecidoEncontrado.codigo,
        nome: tecidoEncontrado.nome,
        cor: tecidoEncontrado.cor || '',
        localizacao: tecidoEncontrado.localizacao || '',
        unidadeMedida: tecidoEncontrado.unidademedida || tecidoEncontrado.unidadeMedida || 'm'
      }));
      alert(`✅ Item preenchido: ${tecidoEncontrado.nome} (Cor: ${tecidoEncontrado.cor})`);
    } else {
      alert('⚠️ Nenhum tecido encontrado.');
    }
  };

  const cadastrarSobra = async (e) => {
    e.preventDefault();
    if (!formSobra.codigo || !formSobra.nome || !formSobra.quantidade || !formSobra.localizacao) {
      alert('Preencha os campos obrigatórios da sobra.');
      return;
    }

    const codigoLimpo = formSobra.codigo.trim();
    const corLimpa = (formSobra.cor || 'N/D').trim();
    const qtdSobra = parseNumero(formSobra.quantidade);

    const estoqueLivreAtual = calcularEstoqueLivre(codigoLimpo, corLimpa, null, idEditandoSobra);
    
    if (qtdSobra > estoqueLivreAtual) {
      alert(`⚠️ Estoque insuficiente! O estoque livre disponível para este tecido é de apenas ${estoqueLivreAtual}.`);
      return;
    }

    const obsVal = formSobra.observacao || 'Retalho / Sobra guardada';
    const finalObs = obsVal.includes('[RETALHO]') ? obsVal : `[RETALHO] ${obsVal}`;

    const novaSobra = {
      tipoMovimento: 'saida', // O servidor só aceita 'saida'
      codigo: codigoLimpo,
      nome: formSobra.nome,
      cor: corLimpa,
      quantidade: qtdSobra,
      metros: qtdSobra,
      unidadeMedida: formSobra.unidadeMedida,
      localizacao: formSobra.localizacao,
      observacao: finalObs
    };

    setCarregando(true);
    try {
      let resposta;
      if (idEditandoSobra) {
        resposta = await fetch(`${API_URL}/${encodeURIComponent(idEditandoSobra)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(novaSobra)
        });
      } else {
        resposta = await fetch(API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(novaSobra)
        });
      }

      if (!resposta.ok) {
        const erroMsg = await resposta.text();
        alert('❌ O Servidor recusou o salvamento: ' + erroMsg);
        return;
      }

      alert('✂️ Retalho salvo com sucesso!');
      setIdEditandoSobra(null);
      setFormSobra({ codigo: '', nome: '', cor: '', quantidade: '', unidadeMedida: 'm', localizacao: '', observacao: '' });
      await carregarDadosDoServidor();
    } catch (err) {
      console.error(err);
      alert('Erro de rede ao salvar no servidor.');
    } finally {
      setCarregando(false);
    }
  };

  const iniciarEdicaoSobra = (item) => {
    setIdEditandoSobra(item.id || item._id);
    setFormSobra({ 
      ...item, 
      observacao: (item.observacao || '').replace(/\[RETALHO\] /i, '').replace(/\[RETALHO\]/i, '')
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const usarSobra = async (item) => {
    if (!window.confirm(`Confirma a baixa e reuso deste retalho de ${item.nome} (${item.quantidade} ${item.unidadeMedida})?`)) return;
    
    setCarregando(true);
    try {
      const itemId = item.id || item._id;
      await fetch(`${API_URL}/${encodeURIComponent(itemId)}`, { method: 'DELETE' });

      const registroSaida = {
        ...item,
        tipoMovimento: 'saida',
        observacao: '[USO-RETALHO] ' + (item.observacao || '').replace(/\[RETALHO\] /i, '')
      };
      delete registroSaida.id;
      delete registroSaida._id;

      await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(registroSaida)
      });

      alert('✅ Retalho utilizado na produção!');
      await carregarDadosDoServidor();
    } catch (err) {
      console.error(err);
      alert('Erro ao processar baixa de retalho.');
    } finally {
      setCarregando(false);
    }
  };

  const deletarSobra = async (id) => {
    if (!window.confirm('Confirma a exclusão deste retalho? Ele retornará ao estoque principal.')) return;
    setCarregando(true);
    try {
      await fetch(`${API_URL}/${encodeURIComponent(id)}`, { method: 'DELETE' });
      alert('Retalho excluído.');
      await carregarDadosDoServidor();
    } catch (err) {
      alert('Erro ao excluir.');
    } finally {
      setCarregando(false);
    }
  };

  const cadastrarReserva = async (e) => {
    e.preventDefault();
    if (!formReserva.codigo || !formReserva.nome || !formReserva.quantidade || !formReserva.localizacao) {
      alert('Preencha os campos obrigatórios da reserva.');
      return;
    }

    const codigoLimpo = formReserva.codigo.trim();
    const corLimpa = (formReserva.cor || 'N/D').trim();
    const qtdReserva = parseNumero(formReserva.quantidade);

    const estoqueLivreAtual = calcularEstoqueLivre(codigoLimpo, corLimpa, idEditandoReserva, null);
    
    if (qtdReserva > estoqueLivreAtual) {
      alert(`⚠️ Estoque insuficiente! O estoque livre disponível para este tecido é de apenas ${estoqueLivreAtual}.`);
      return;
    }

    const obsVal = formReserva.observacao || 'Separado para uso futuro';
    const finalObs = obsVal.includes('[RESERVA]') ? obsVal : `[RESERVA] ${obsVal}`;

    const novaReserva = {
      tipoMovimento: 'saida', // Servidor só aceita saida, a identificação se dá pela observacao
      codigo: codigoLimpo,
      nome: formReserva.nome,
      cor: corLimpa,
      quantidade: qtdReserva,
      metros: qtdReserva,
      unidadeMedida: formReserva.unidadeMedida,
      localizacao: formReserva.localizacao,
      observacao: finalObs
    };

    setCarregando(true);
    try {
      let resposta;
      if (idEditandoReserva) {
        resposta = await fetch(`${API_URL}/${encodeURIComponent(idEditandoReserva)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(novaReserva)
        });
      } else {
        resposta = await fetch(API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(novaReserva)
        });
      }

      if (!resposta.ok) {
        const erroMsg = await resposta.text();
        alert('❌ Servidor recusou a reserva: ' + erroMsg);
        return; 
      }

      alert('📌 Reserva salva com sucesso e abatida do estoque!');
      setIdEditandoReserva(null);
      setFormReserva({ codigo: '', nome: '', cor: '', quantidade: '', unidadeMedida: 'm', localizacao: '', observacao: '' });
      await carregarDadosDoServidor();
    } catch (err) {
      console.error(err);
      alert('Erro de conexão ao salvar reserva.');
    } finally {
      setCarregando(false);
    }
  };

  const iniciarEdicaoReserva = (item) => {
    setIdEditandoReserva(item.id || item._id);
    setFormReserva({ 
      ...item, 
      observacao: (item.observacao || '').replace(/\[RESERVA\] /i, '').replace(/\[RESERVA\]/i, '')
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const concluirReserva = async (item) => {
    if (!window.confirm(`Confirma o consumo/baixa definitiva desta reserva de ${item.nome}?`)) return;
    
    setCarregando(true);
    try {
      const itemId = item.id || item._id;
      await fetch(`${API_URL}/${encodeURIComponent(itemId)}`, { method: 'DELETE' });

      const dadosSaida = {
        tipoMovimento: 'saida',
        codigo: item.codigo,
        nome: item.nome,
        cor: item.cor,
        quantidade: parseNumero(item.quantidade || item.metros),
        metros: parseNumero(item.quantidade || item.metros),
        unidadeMedida: item.unidadeMedida || item.unidademedida || 'm',
        localizacao: item.localizacao,
        observacao: 'Baixa de reserva: ' + (item.observacao || '').replace(/\[RESERVA\] /i, '')
      };

      await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dadosSaida)
      });

      alert('✅ Reserva consumida!');
      await carregarDadosDoServidor();
    } catch (erro) {
      console.error(erro);
      alert('Erro ao concluir reserva.');
    } finally {
      setCarregando(false);
    }
  };

  const cancelarReserva = async (id) => {
    if (!window.confirm('Confirma o cancelamento desta reserva (o tecido voltará para o estoque livre)?')) return;
    setCarregando(true);
    try {
      const resposta = await fetch(`${API_URL}/${encodeURIComponent(id)}`, { method: 'DELETE' });
      if (resposta.ok) {
        alert('🔄 Reserva cancelada e tecido retornado.');
        await carregarDadosDoServidor();
      } else {
        alert('Erro ao excluir reserva.');
      }
    } catch (err) {
      alert('Erro de conexão.');
    } finally {
      setCarregando(false);
    }
  };

  const executarBuscaSaida = () => {
    const termo = normalizarTexto(termoBuscaSaida);
    if (!termo) {
      alert('Informe um código ou nome para realizar a busca.');
      return;
    }
    const tecidoEncontrado = listaSeguraCalculos.find(
      m => normalizarTexto(m?.codigo).includes(termo) || 
           normalizarTexto(m?.nome).includes(termo)
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
      alert(`✅ Item localizado: ${tecidoEncontrado.nome} (Cód: ${tecidoEncontrado.codigo} - Cor: ${tecidoEncontrado.cor})`);
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

  const registrarOuAtualizarMovimento = async (e) => {
    e.preventDefault();
    const qtdValida = parseNumero(form.quantidade || form.metros);
    if (!form.codigo || !form.nome || !form.cor || !form.localizacao || qtdValida <= 0) {
      alert('Preencha os campos obrigatórios corretamente.');
      return;
    }

    const tipoFinal = abaAtiva === 'entrada' ? 'entrada' : 'saida';
    let minFinal = parseNumero(form.estoqueMinimo);

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
      const targetId = idEditando || form.id || form._id;
      if (targetId) {
        resposta = await fetch(`${API_URL}/${encodeURIComponent(targetId)}`, {
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
        alert(targetId ? 'Registro atualizado com sucesso!' : 'Lançamento efetuado com sucesso!');
        setForm({ tipoMovimento: 'entrada', codigo: '', nome: '', cor: '', localizacao: '', quantidade: '', metros: '', unidadeMedida: 'm', preco: '', estoqueMinimo: '', notaFiscal: '', fornecedor: '', foto: '', largura: '' });
        setTermoBuscaSaida('');
        setIdEditando(null);
        await carregarDadosDoServidor();
        setAbaAtiva('historico');
      } else {
        const erroServidor = await resposta.text();
        alert('❌ Erro no servidor: ' + erroServidor);
      }
    } catch (erro) {
      console.error('Erro de conexão:', erro);
      alert('Erro de rede.');
    } finally {
      setCarregando(false);
    }
  };

  const iniciarEdicao = (item) => {
    const itemId = item.id || item._id;
    if (!item || itemId === undefined || itemId === null) {
      alert('Erro: ID inválido.');
      return;
    }
    setIdEditando(itemId);
    const qtdItem = item.quantidade || item.metros || '';
    const minItem = obterMinimo(item);
    const tipoItem = obterTipo(item);
    
    setForm({
      ...item,
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

  const deletarItem = async (itemOrId) => {
    const id = typeof itemOrId === 'object' ? (itemOrId.id || itemOrId._id) : itemOrId;
    if (!id) {
      alert('Erro: ID inválido.');
      return;
    }
    if (!window.confirm('Confirma a exclusão definitiva deste registro?')) return;
    try {
      const resposta = await fetch(`${API_URL}/${encodeURIComponent(id)}`, { method: 'DELETE' });
      if (resposta.ok) {
        alert('Excluído com sucesso.');
        carregarDadosDoServidor();
      } else {
        alert('Erro ao excluir.');
      }
    } catch (erro) {
      alert('Erro de conexão.');
    }
  };

  const tecidosConsolidados = {};
  const usoTecidos = {};

  listaSeguraCalculos.forEach(m => {
    if (!m || !m.codigo) return;
    const cod = normalizarTexto(m.codigo);
    const cor = normalizarTexto(m.cor || 'ndef');
    const chave = `${cod}_${cor}`;
    const qtd = parseNumero(m.metros || m.quantidade || 0);
    const minReg = obterMinimo(m);
    
    const t = obterTipo(m);
    const obs = String(m.observacao || '').toUpperCase();
    
    const isReserva = t === 'reserva' || obs.includes('[RESERVA]');
    const isRetalho = t === 'sobra' || obs.includes('[RETALHO]');
    const isSaidaNormal = t === 'saida' && !isReserva && !isRetalho && !obs.includes('[USO-RETALHO]');
    const isEntradaNormal = t === 'entrada' && !isReserva && !isRetalho;

    if (!tecidosConsolidados[chave]) {
      tecidosConsolidados[chave] = {
        codigo: m.codigo,
        nome: m.nome,
        cor: m.cor,
        minimo: minReg,
        unidade: m.unidademedida || m.unidadeMedida || 'm',
        totalBruto: 0,
        totalReservas: 0,
        totalSobras: 0,
        total: 0
      };
    }

    if (isEntradaNormal) tecidosConsolidados[chave].totalBruto += qtd;
    if (isSaidaNormal) tecidosConsolidados[chave].totalBruto -= qtd;
    if (isReserva) tecidosConsolidados[chave].totalReservas += qtd;
    if (isRetalho) tecidosConsolidados[chave].totalSobras += qtd;

    if (!usoTecidos[chave]) {
      usoTecidos[chave] = { nome: m.nome || 'Tecido', codigo: m.codigo, cor: m.cor || 'N/D', totalUso: 0, unidade: m.unidademedida || m.unidadeMedida || 'm' };
    }
    
    if (isSaidaNormal || obs.includes('[USO-RETALHO]')) {
      usoTecidos[chave].totalUso += qtd;
    }

    if (minReg > 0) tecidosConsolidados[chave].minimo = minReg;
  });

  Object.keys(tecidosConsolidados).forEach(chave => {
    const item = tecidosConsolidados[chave];
    item.total = item.totalBruto - item.totalReservas - item.totalSobras;
  });

  const alertasEstoqueBaixo = Object.values(tecidosConsolidados).filter(t => t.minimo > 0 && t.total < t.minimo);

  const topTecidosMaisUsados = Object.values(usoTecidos)
    .filter(t => t.totalUso > 0)
    .sort((a, b) => b.totalUso - a.totalUso)
    .slice(0, 5);

  const maxUsoTop = topTecidosMaisUsados.length > 0 ? Math.max(...topTecidosMaisUsados.map(t => t.totalUso)) : 100;

  const entradasMetros = listaSeguraCalculos
    .filter(m => {
      const t = obterTipo(m);
      const obs = String(m.observacao || '').toUpperCase();
      return t === 'entrada' && !obs.includes('[RESERVA]') && !obs.includes('[RETALHO]') && (m?.unidademedida === 'm' || m?.unidadeMedida === 'm' || !m?.unidademedida);
    })
    .reduce((acc, m) => acc + parseNumero(m.metros || m.quantidade || 0), 0);

  const saidasMetros = listaSeguraCalculos
    .filter(m => {
      const t = obterTipo(m);
      const obs = String(m.observacao || '').toUpperCase();
      const isRes = t === 'reserva' || obs.includes('[RESERVA]');
      const isRet = t === 'sobra' || obs.includes('[RETALHO]');
      return t === 'saida' && !isRes && !isRet && (m?.unidademedida === 'm' || m?.unidadeMedida === 'm' || !m?.unidademedida);
    })
    .reduce((acc, m) => acc + parseNumero(m.metros || m.quantidade || 0), 0);

  const totalReservasMetros = reservas
    .filter(r => (r?.unidadeMedida === 'm' || !r?.unidadeMedida))
    .reduce((acc, r) => acc + parseNumero(r.quantidade || r.metros || 0), 0);
    
  const totalSobrasMetros = sobras
    .filter(s => s.unidadeMedida === 'm')
    .reduce((acc, s) => acc + parseNumero(s.quantidade || 0), 0);

  const estoqueBrutoMetros = entradasMetros - saidasMetros;
  const estoqueDisponivelMetros = estoqueBrutoMetros - totalReservasMetros - totalSobrasMetros;

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
        const qtd = parseNumero(m.metros || m.quantidade || 0);
        const un = normalizarTexto(m.unidademedida || m.unidadeMedida || 'm');
        const t = obterTipo(m);
        const obs = String(m.observacao || '').toUpperCase();
        
        const isReserva = t === 'reserva' || obs.includes('[RESERVA]');
        const isRetalho = t === 'sobra' || obs.includes('[RETALHO]');
        const isEntradaNormal = t === 'entrada' && !isReserva && !isRetalho;

        if (isEntradaNormal) {
          if (un === 'kg') kgTotal += qtd;
          else mTotal += qtd;
        } else if (t === 'saida' || isReserva || isRetalho) {
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
    const rawLoc = m.localizacao || 'Não definido';
    const chaveLoc = normalizarTexto(rawLoc).toUpperCase();

    if (!acc[chaveLoc]) {
      acc[chaveLoc] = { nomeExibicao: rawLoc.trim().toUpperCase(), m: 0, kg: 0 };
    }

    const qtd = parseNumero(m.metros || m.quantidade || 0);
    const unidade = normalizarTexto(m.unidademedida || m.unidadeMedida || 'm');
    const t = obterTipo(m);
    const obs = String(m.observacao || '').toUpperCase();
    
    const isReserva = t === 'reserva' || obs.includes('[RESERVA]');
    const isRetalho = t === 'sobra' || obs.includes('[RETALHO]');
    const isEntradaNormal = t === 'entrada' && !isReserva && !isRetalho;
    
    if (isEntradaNormal) {
      if (acc[chaveLoc][unidade] !== undefined) acc[chaveLoc][unidade] += qtd;
      else acc[chaveLoc][unidade] = qtd;
    } else if (t === 'saida' || isReserva || isRetalho) {
      if (acc[chaveLoc][unidade] !== undefined) acc[chaveLoc][unidade] -= qtd;
      else acc[chaveLoc][unidade] = -qtd;
    }
    return acc;
  }, {});

  const todosRegistrosHistorico = listaSeguraCalculos
    .filter(m => {
      const obs = String(m.observacao || '').toUpperCase();
      return !obs.includes('[USO-RETALHO]') && obterTipo(m) !== 'saida_sobra';
    })
    .map(m => {
      const t = obterTipo(m);
      const obs = String(m.observacao || '').toUpperCase();
      let tipoExibicao = t;
      let isExtra = false;
      
      if (t === 'reserva' || obs.includes('[RESERVA]')) { 
        tipoExibicao = 'reserva'; isExtra = true; 
      } else if (t === 'sobra' || obs.includes('[RETALHO]')) { 
        tipoExibicao = 'retalhos'; isExtra = true; 
      }
      return { ...m, _tipoExibicao: tipoExibicao, isExtra };
    });

  const movFiltradas = todosRegistrosHistorico.filter(m => {
    if (!m) return false; 
    const termo = normalizarTexto(busca);
    const codigo = normalizarTexto(m.codigo);
    const nome = normalizarTexto(m.nome);
    const cor = normalizarTexto(m.cor);
    const localizacao = normalizarTexto(m.localizacao);
    const fornecedor = normalizarTexto(m.fornecedor);
    const notaFiscal = normalizarTexto(m.notafiscal || m.notaFiscal);
    return codigo.includes(termo) || nome.includes(termo) || cor.includes(termo) || localizacao.includes(termo) || fornecedor.includes(termo) || notaFiscal.includes(termo);
  });

  const sobrasFiltradas = sobras.filter(s => {
    const termo = normalizarTexto(buscaSobraTexto);
    return (
      normalizarTexto(s.codigo).includes(termo) ||
      normalizarTexto(s.nome).includes(termo) ||
      normalizarTexto(s.cor).includes(termo) ||
      normalizarTexto(s.localizacao).includes(termo) ||
      normalizarTexto(s.observacao).includes(termo)
    );
  });

  const reservasFiltradas = reservas.filter(r => {
    const termo = normalizarTexto(buscaReservaTexto);
    return (
      normalizarTexto(r.codigo).includes(termo) ||
      normalizarTexto(r.nome).includes(termo) ||
      normalizarTexto(r.cor).includes(termo) ||
      normalizarTexto(r.localizacao).includes(termo) ||
      normalizarTexto(r.observacao).includes(termo)
    );
  });

  // TELA DO QR CODE COM VALORES FINANCEIROS RESTAURADOS
  if (codigoQrUrl) {
    const paramCodigoLpo = normalizarTexto(codigoQrUrl);
    const paramCorLpo = corQrUrl ? normalizarTexto(corQrUrl) : '';

    const movimentosDoTecido = listaSeguraCalculos.filter(m => {
      const mesmoCod = normalizarTexto(m?.codigo) === paramCodigoLpo;
      const mesmaCor = paramCorLpo ? (normalizarTexto(m?.cor) === paramCorLpo) : true;
      return mesmoCod && mesmaCor;
    });

    const infoTecido = movimentosDoTecido[movimentosDoTecido.length - 1] || { 
      codigo: codigoQrUrl, 
      cor: corQrUrl || 'N/D', 
      nome: 'Tecido não localizado', 
      localizacao: '-' 
    };
    
    let totalQtdBruta = 0;
    let totalReservaTecido = 0;
    let totalSobraTecido = 0;
    let totalSaidaNormal = 0;
    
    let somaPrecos = 0;
    let qtdPrecos = 0;

    movimentosDoTecido.forEach(m => {
      const q = parseNumero(m.metros || m.quantidade || 0);
      const t = obterTipo(m);
      const obs = String(m.observacao || '').toUpperCase();

      const isReserva = t === 'reserva' || obs.includes('[RESERVA]');
      const isRetalho = t === 'sobra' || obs.includes('[RETALHO]');
      const isSaidaNormal = t === 'saida' && !isReserva && !isRetalho && !obs.includes('[USO-RETALHO]');
      const isEntradaNormal = t === 'entrada' && !isReserva && !isRetalho;

      if (isEntradaNormal) { totalQtdBruta += q; }
      if (isSaidaNormal) { totalSaidaNormal += q; }
      if (isReserva) { totalReservaTecido += q; }
      if (isRetalho) { totalSobraTecido += q; }
      
      const p = parseNumero(m.preco);
      if (p > 0 && isEntradaNormal) {
        somaPrecos += p;
        qtdPrecos++;
      }
    });

    const estoqueBrutoReal = totalQtdBruta - totalSaidaNormal;
    const totalReservado = totalReservaTecido + totalSobraTecido;
    const totalDisponivelTecido = estoqueBrutoReal - totalReservado;
    const unidadeMed = infoTecido.unidademedida || infoTecido.unidadeMedida || 'm';

    const precoMedio = qtdPrecos > 0 ? somaPrecos / qtdPrecos : parseNumero(infoTecido.preco || 0);
    const valorTotalEstoque = totalDisponivelTecido * precoMedio;

    return (
      <div style={styles.qrViewContainer}>
        <div style={styles.qrViewCard}>
          <div style={{ textAlign: 'center', marginBottom: '16px' }}>
            <div style={styles.logoBadge}>SW</div>
            <h2 style={{ color: '#0F172A', margin: '10px 0 4px 0', fontSize: '20px', fontWeight: '800' }}>Consulta Rápida</h2>
            <p style={{ color: '#2563EB', fontSize: '11px', margin: 0, fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px' }}>
              Versão 3.5 • Nuvem
            </p>
          </div>

          <button 
            onClick={carregarDadosDoServidor}
            disabled={carregando}
            style={{...styles.qrBackBtn, backgroundColor: '#2563EB', color: '#FFF', marginBottom: '16px', border: 'none', boxShadow: '0 4px 10px rgba(37,99,235,0.3)'}}
          >
            {carregando ? '⏳ Sincronizando...' : '🔄 Atualizar Dados'}
          </button>

          {infoTecido.foto ? (
            <img src={infoTecido.foto} alt="Tecido" style={styles.qrViewImg} onClick={() => setFotoSelecionada(infoTecido.foto)} />
          ) : (
            <div style={styles.qrViewNoFoto}>Sem foto cadastrada</div>
          )}

          <div style={styles.qrInfoBox}>
            <div style={styles.qrInfoRow}><span>Código:</span> <strong>{infoTecido.codigo}</strong></div>
            <div style={styles.qrInfoRow}><span>Nome:</span> <strong>{infoTecido.nome || 'N/D'}</strong></div>
            <div style={styles.qrInfoRow}><span>Cor:</span> <strong style={{color: '#2563EB'}}>{infoTecido.cor || 'N/D'}</strong></div>
            <div style={styles.qrInfoRow}><span>Galpão / Local:</span> <strong style={{color: '#2563EB'}}>📍 {infoTecido.localizacao || 'N/D'}</strong></div>
            
            <div style={{borderTop: '1px dashed #CBD5E1', margin: '6px 0'}} />

            <div style={styles.qrInfoRow}><span>Total de Tecido (Bruto):</span> <strong style={{color: '#0F172A'}}>{estoqueBrutoReal} {unidadeMed}</strong></div>
            
            {/* CAIXA DE ESTOQUE LIVRE SIMPLIFICADA E DESTACADA */}
            <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', backgroundColor: '#ECFDF5', padding: '16px', borderRadius: '12px', border: '1px solid #A7F3D0', margin: '10px 0'}}>
              <span style={{fontSize: '12px', color: '#065F46', fontWeight: '700', textTransform: 'uppercase', marginBottom: '4px'}}>Estoque Atual Disponível</span>
              <strong style={{color: '#059669', fontSize: '26px'}}>{totalDisponivelTecido} {unidadeMed}</strong>
              <span style={{fontSize: '11px', color: '#047857', marginTop: '4px'}}>(Já subtraindo reservas e retalhos)</span>
            </div>

            <div style={{borderTop: '1px dashed #CBD5E1', margin: '6px 0'}} />

            <div style={styles.qrInfoRow}><span>Valor Unitário Médio:</span> <strong style={{color: '#D97706'}}>R$ {precoMedio.toFixed(2)}</strong></div>
            <div style={styles.qrInfoRow}><span>Valor Total (Estoque Livre):</span> <strong style={{color: '#D97706'}}>R$ {valorTotalEstoque.toFixed(2)}</strong></div>
          </div>

          <button 
            onClick={() => { window.location.href = window.location.pathname; }} 
            style={styles.qrBackBtn}
          >
            🏠 Acessar Sistema
          </button>
        </div>

        {fotoSelecionada && (
          <div style={styles.modalOverlay} onClick={() => setFotoSelecionada(null)}>
            <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
              <button style={styles.modalCloseBtn} onClick={() => setFotoSelecionada(null)}>✕ Fechar</button>
              <img src={fotoSelecionada} alt="Zoom" style={styles.modalImg} />
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={styles.appLayout} className="app-layout-container">
      <style>{`
        @media (max-width: 900px) {
          .app-layout-container {
            flex-direction: column !important;
          }
          aside {
            position: fixed !important;
            left: ${menuMobileAberto ? '0' : '-100%'} !important;
            top: 0 !important;
            height: 100vh !important;
            z-index: 1000 !important;
            transition: left 0.3s ease-in-out !important;
            box-shadow: 5px 0 25px rgba(0,0,0,0.15) !important;
            width: 280px !important;
          }
          main {
            padding: 16px !important;
            max-width: 100vw !important;
          }
          .charts-row-responsive {
            grid-template-columns: 1fr !important;
          }
          .form-grid-responsive {
            grid-template-columns: 1fr !important;
          }
          .menu-toggle-btn {
            display: flex !important;
          }
        }
      `}</style>

      {menuMobileAberto && (
        <div 
          onClick={() => setMenuMobileAberto(false)} 
          style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 999 }}
        />
      )}

      <aside style={styles.sidebar}>
        <div style={styles.sidebarHeader}>
          <div style={styles.logoBadge}>SW</div>
          <div>
            <h2 style={styles.sidebarTitle}>Sunny Wear</h2>
            <span style={styles.versionBadge}>v3.5 CLOUD</span>
          </div>
        </div>

        <div style={styles.sidebarNavGroup}>
          <button 
            onClick={() => { setAbaAtiva('dashboard'); setMenuMobileAberto(false); }} 
            style={{ ...styles.sidebarLink, ...(abaAtiva === 'dashboard' ? styles.sidebarLinkActive : {}) }}
          >
            📊 Visão Geral
          </button>
          <button 
            onClick={() => { setIdEditando(null); setForm({ tipoMovimento: 'entrada', codigo: '', nome: '', cor: '', localizacao: '', quantidade: '', metros: '', unidadeMedida: 'm', preco: '', estoqueMinimo: '', notaFiscal: '', fornecedor: '', foto: '', largura: '' }); setTermoBuscaSaida(''); setAbaAtiva('entrada'); setMenuMobileAberto(false); }} 
            style={{ ...styles.sidebarLink, ...(abaAtiva === 'entrada' ? styles.sidebarLinkActive : {}) }}
          >
            📥 Registrar Entrada
          </button>
          <button 
            onClick={() => { setIdEditando(null); setForm({ tipoMovimento: 'saida', codigo: '', nome: '', cor: '', localizacao: '', quantidade: '', metros: '', unidadeMedida: 'm', preco: '', estoqueMinimo: '', notaFiscal: '', fornecedor: '', foto: '', largura: '' }); setTermoBuscaSaida(''); setAbaAtiva('saida'); setMenuMobileAberto(false); }} 
            style={{ ...styles.sidebarLink, ...(abaAtiva === 'saida' ? styles.sidebarLinkActive : {}) }}
          >
            📤 Registrar Saída
          </button>
          <button 
            onClick={() => { setAbaAtiva('reservas'); setMenuMobileAberto(false); }} 
            style={{ ...styles.sidebarLink, ...(abaAtiva === 'reservas' ? styles.sidebarLinkActive : {}) }}
          >
            📌 Reservas de Tecidos
          </button>
          <button 
            onClick={() => { setAbaAtiva('sobras'); setMenuMobileAberto(false); }} 
            style={{ ...styles.sidebarLink, ...(abaAtiva === 'sobras' ? styles.sidebarLinkActive : {}) }}
          >
            ✂️ Sobras & Retalhos
          </button>
          <button 
            onClick={() => { setAbaAtiva('historico'); setMenuMobileAberto(false); }} 
            style={{ ...styles.sidebarLink, ...(abaAtiva === 'historico' ? styles.sidebarLinkActive : {}) }}
          >
            🔍 Consulta & Galpões
          </button>
        </div>
      </aside>

      <main style={styles.mainContent}>
        <header style={styles.topbar}>
          <button 
            style={{ display: 'none', alignItems: 'center', gap: '6px', background: '#2563EB', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: '8px', fontWeight: '700', cursor: 'pointer', fontSize: '13px' }}
            className="menu-toggle-btn"
            onClick={() => setMenuMobileAberto(!menuMobileAberto)}
          >
            ☰ Menu
          </button>
          <div style={styles.statusBadgeContainer}>
            <span style={styles.pulseDot}></span>
            <span style={styles.statusText}>Cloud Sync Ativo (v3.5)</span>
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
                  <strong>{alt.nome}</strong> ({alt.cor}) [Cód: {alt.codigo}] — Disponível: <strong>{alt.total} {alt.unidade}</strong> | Mínimo: {alt.minimo} {alt.unidade}
                </li>
              ))}
            </ul>
          </div>
        )}

        {abaAtiva === 'dashboard' && (
          <div>
            <div style={styles.metricsGrid}>
              <div style={styles.metricCard}>
                <span style={styles.metricLabel}>Estoque Disponível</span>
                <strong style={{...styles.metricVal, color: '#2563EB'}}>{estoqueDisponivelMetros.toLocaleString()} m</strong>
                <span style={styles.metricSub}>Livre (Sem reservas e retalhos)</span>
              </div>
              <div style={styles.metricCard}>
                <span style={styles.metricLabel}>Tecidos Reservados</span>
                <strong style={{...styles.metricVal, color: '#D97706'}}>{totalReservasMetros.toLocaleString()} m</strong>
                <span style={styles.metricSub}>Separado para uso futuro</span>
              </div>
              <div style={styles.metricCard}>
                <span style={styles.metricLabel}>Retalhos Disponíveis</span>
                <strong style={{...styles.metricVal, color: '#9333EA'}}>{totalSobrasMetros.toLocaleString()} m</strong>
                <span style={styles.metricSub}>Sobras guardadas</span>
              </div>
              <div style={styles.metricCard}>
                <span style={styles.metricLabel}>Entradas Hoje</span>
                <strong style={{...styles.metricVal, color: '#059669'}}>{entradasMetros.toLocaleString()} m</strong>
                <span style={styles.metricSub}>Aquisições registradas</span>
              </div>
              <div style={styles.metricCard}>
                <span style={styles.metricLabel}>Saídas Hoje</span>
                <strong style={{...styles.metricVal, color: '#DC2626'}}>{saidasMetros.toLocaleString()} m</strong>
                <span style={styles.metricSub}>Consumo / Baixas</span>
              </div>
            </div>

            <div style={styles.chartsRow} className="charts-row-responsive">
              <div style={styles.chartBoxWide}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <h3 style={{ ...styles.sectionTitle, margin: 0 }}>Top 5 Tecidos Mais Utilizados</h3>
                  <button style={styles.verTodosBtn}>Ver todos</button>
                </div>

                {topTecidosMaisUsados.length === 0 ? (
                  <p style={styles.empty}>Aguardando registros de saída para análise de consumo.</p>
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
                                {tecido.nome} ({tecido.cor})
                              </strong>
                              <strong style={{ fontSize: '13px', color: '#0F172A', whiteSpace: 'nowrap' }}>
                                {tecido.totalUso.toLocaleString()} {tecido.unidade}
                              </strong>
                            </div>
                            <span style={{ fontSize: '11px', color: '#64748B', display: 'block', marginBottom: '6px' }}>
                              Cód: {tecido.codigo}
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

              <div style={styles.chartBoxWide}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
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

            <div style={styles.cardSection}>
              <h3 style={styles.sectionTitle}>🏢 Logística e Distribuição por Galpão</h3>
              <div style={styles.chartContainer}>
                {Object.keys(porLocalizacao).length === 0 ? (
                  <p style={styles.empty}>Nenhum local cadastrado até o momento.</p>
                ) : (
                  Object.entries(porLocalizacao).map(([chave, vals]) => (
                    <div key={chave} style={{...styles.chartBarWrapper, marginBottom: '10px', background: 'rgba(255,255,255,0.8)', padding: '14px 18px', borderRadius: '10px', border: '1px solid rgba(0,0,0,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px'}}>
                      <span style={{fontWeight: '700', color: '#0F172A', fontSize: '14px'}}>📍 {vals.nomeExibicao}</span>
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

        {abaAtiva === 'entrada' && (
          <div style={styles.cardSection}>
            <div style={{ borderBottom: '1px solid rgba(0,0,0,0.06)', paddingBottom: '14px', marginBottom: '20px' }}>
              <h3 style={{ ...styles.sectionTitle, margin: 0 }}>{idEditando ? '✏️ Atualizar Dados de Entrada' : '📥 Cadastro de Nova Entrada / Compra'}</h3>
              <p style={{ color: '#64748B', fontSize: '13px', margin: '4px 0 0 0' }}>Preencha os campos abaixo para registrar novos tecidos ou lotes no sistema.</p>
            </div>
            
            <form onSubmit={registrarOuAtualizarMovimento} style={styles.formGrid} className="form-grid-responsive">
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
                <input type="text" placeholder="Ex: 1.50" value={form.largura} onChange={(e) => setForm({...form, largura: e.target.value})} style={styles.input} />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Localização / Galpão *</label>
                <input type="text" placeholder="Ex: Galpão A - Setor 2" value={form.localizacao} onChange={(e) => setForm({...form, localizacao: e.target.value})} style={styles.input} required />
              </div>
              <div style={{display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '10px'}}>
                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Quantidade *</label>
                  <input type="text" placeholder="0.00" value={form.quantidade} onChange={(e) => setForm({...form, quantidade: e.target.value, metros: e.target.value})} style={styles.input} required />
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
                <input type="text" placeholder="Ex: 180" value={form.estoqueMinimo} onChange={(e) => setForm({...form, estoqueMinimo: e.target.value})} style={styles.input} />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Valor Unitário (R$)</label>
                <input type="text" placeholder="Ex: 15.90" value={form.preco} onChange={(e) => setForm({...form, preco: e.target.value})} style={styles.input} />
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

            <form onSubmit={registrarOuAtualizarMovimento} style={styles.formGrid} className="form-grid-responsive">
              <div style={{gridColumn: '1 / -1'}}>
                <label style={styles.formLabel}>Localizar Tecido (Código ou Nome)</label>
                <div style={{display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap'}}>
                  <input type="text" placeholder="Ex: TEC-001 ou Malha" value={termoBuscaSaida} onChange={(e) => setTermoBuscaSaida(e.target.value)} style={{...styles.input, flex: 1, minWidth: '200px'}} />
                  <button type="button" onClick={executarBuscaSaida} style={{padding: '12px 20px', background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: '700', cursor: 'pointer', whiteSpace: 'nowrap', fontSize: '13px'}}>Buscar Tecido</button>
                </div>
              </div>

              <div style={{gridColumn: '1 / -1', display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '10px'}}>
                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Quantidade Utilizada *</label>
                  <input type="text" placeholder="0.00" value={form.quantidade} onChange={(e) => setForm({...form, quantidade: e.target.value, metros: e.target.value})} style={styles.input} required />
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
                  {carregando ? 'Processando dados...' : (idEditando ? 'Salvar Alterações' : 'Confirmar Saída na Base')}
                </button>
              </div>
            </form>
          </div>
        )}

        {abaAtiva === 'reservas' && (
          <div style={styles.cardSection}>
            <div style={{ borderBottom: '1px solid rgba(0,0,0,0.06)', paddingBottom: '14px', marginBottom: '20px' }}>
              <h3 style={{ ...styles.sectionTitle, margin: 0 }}>{idEditandoReserva ? '✏️ Ajustar Reserva' : '📌 Cadastro e Consulta de Reservas'}</h3>
              <p style={{ color: '#64748B', fontSize: '13px', margin: '4px 0 0 0' }}>Separe tecidos do estoque geral para uso futuro. O sistema abate o valor do estoque livre instantaneamente.</p>
            </div>

            <form onSubmit={cadastrarReserva} style={styles.formGrid} className="form-grid-responsive">
              
              {!idEditandoReserva && (
                <div style={{gridColumn: '1 / -1', background: '#F8FAFC', padding: '16px', borderRadius: '10px', border: '1px dashed #CBD5E1', marginBottom: '10px'}}>
                  <label style={styles.formLabel}>Autopreencher (Evite erros de digitação!)</label>
                  <div style={{display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap'}}>
                    <input type="text" placeholder="Digite Código ou Nome do Tecido" value={termoBuscaReserva} onChange={(e) => setTermoBuscaReserva(e.target.value)} style={{...styles.input, flex: 1, minWidth: '200px'}} />
                    <button type="button" onClick={executarBuscaReserva} style={{padding: '12px 20px', background: '#475569', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: '700', cursor: 'pointer', fontSize: '13px'}}>Buscar Tecido</button>
                  </div>
                </div>
              )}

              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Código do Tecido *</label>
                <input type="text" placeholder="Ex: TEC-001" value={formReserva.codigo} onChange={(e) => setFormReserva({...formReserva, codigo: e.target.value})} style={styles.input} required disabled={!!idEditandoReserva} />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Nome do Tecido *</label>
                <input type="text" placeholder="Ex: Malha Canelada" value={formReserva.nome} onChange={(e) => setFormReserva({...formReserva, nome: e.target.value})} style={styles.input} required />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Cor *</label>
                <input type="text" placeholder="Ex: Azul Marinho" value={formReserva.cor} onChange={(e) => setFormReserva({...formReserva, cor: e.target.value})} style={styles.input} required disabled={!!idEditandoReserva} />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Local Onde a Reserva Vai Ficar Guardada *</label>
                <input type="text" placeholder="Ex: Prateleira de Separação / Mesa 2" value={formReserva.localizacao} onChange={(e) => setFormReserva({...formReserva, localizacao: e.target.value})} style={styles.input} required />
              </div>
              <div style={{display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '10px', gridColumn: '1 / -1'}}>
                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Quantidade Reservada *</label>
                  <input type="text" placeholder="Ex: 50" value={formReserva.quantidade} onChange={(e) => setFormReserva({...formReserva, quantidade: e.target.value})} style={styles.input} required />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Unidade</label>
                  <select value={formReserva.unidadeMedida} onChange={(e) => setFormReserva({...formReserva, unidadeMedida: e.target.value})} style={styles.input}>
                    <option value="m">Metros (m)</option>
                    <option value="kg">Quilos (kg)</option>
                  </select>
                </div>
              </div>
              <div style={{gridColumn: '1 / -1'}}>
                <label style={styles.formLabel}>Observação / Destino (Opcional)</label>
                <input type="text" placeholder="Ex: Separado para o lote de vestidos da próxima semana" value={formReserva.observacao} onChange={(e) => setFormReserva({...formReserva, observacao: e.target.value})} style={styles.input} />
              </div>

              <div style={{gridColumn: '1 / -1', marginTop: '8px'}}>
                <button type="submit" disabled={carregando} style={{...styles.button, background: idEditandoReserva ? '#D97706' : 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)', color: '#fff'}}>
                  {idEditandoReserva ? '💾 Salvar Ajuste da Reserva na Base' : '📌 Salvar Reserva (Abater do Estoque Central)'}
                </button>
                {idEditandoReserva && (
                  <button type="button" onClick={() => { setIdEditandoReserva(null); setFormReserva({ codigo: '', nome: '', cor: '', quantidade: '', unidadeMedida: 'm', localizacao: '', observacao: '' }); }} style={{...styles.button, background: '#64748B', color: '#fff', marginTop: '8px'}}>
                    Cancelar Ajuste
                  </button>
                )}
              </div>
            </form>

            <div style={{ marginTop: '36px', borderTop: '1px solid rgba(0,0,0,0.06)', paddingTop: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
                <h4 style={{ margin: 0, fontSize: '15px', color: '#0F172A', fontWeight: '700' }}>📋 Lista de Tecidos Reservados Atualmente</h4>
                <span style={{ fontSize: '12px', color: '#64748B' }}>Total de reservas ativas: <strong>{reservasFiltradas.length}</strong></span>
              </div>

              <input 
                type="text" 
                placeholder="Pesquisar reserva por nome, cor, código, local ou observação..." 
                value={buscaReservaTexto} 
                onChange={(e) => setBuscaReservaTexto(e.target.value)} 
                style={styles.inputFull}
              />

              <div style={styles.tableResponsive}>
                <table style={styles.table}>
                  <thead>
                    <tr style={styles.thTr}>
                      <th style={styles.th}>Código</th>
                      <th style={styles.th}>Tecido / Cor</th>
                      <th style={styles.th}>Qtd Reservada</th>
                      <th style={styles.th}>Local Guardado</th>
                      <th style={styles.th}>Observação / Destino</th>
                      <th style={styles.th}>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reservasFiltradas.length === 0 ? (
                      <tr>
                        <td colSpan="6" style={styles.empty}>Nenhuma reserva registrada no banco.</td>
                      </tr>
                    ) : (
                      reservasFiltradas.map((item) => (
                        <tr key={item.id || item._id} style={styles.tr}>
                          <td style={styles.td}><strong style={{ color: '#0F172A' }}>{item.codigo}</strong></td>
                          <td style={styles.td}>
                            <div style={{ fontWeight: '600', color: '#0F172A' }}>{item.nome} (<span style={{color: '#2563EB'}}>{item.cor}</span>)</div>
                          </td>
                          <td style={styles.td}><strong style={{ color: '#D97706', fontSize: '14px' }}>{item.quantidade} {item.unidadeMedida}</strong></td>
                          <td style={styles.td}><span style={styles.localBadge}>📍 {item.localizacao}</span></td>
                          <td style={styles.td}><span style={{ color: '#64748B', fontSize: '12px' }}>{(item.observacao || '').replace(/\[RESERVA\]/i, '')}</span></td>
                          <td style={styles.td}>
                            <button onClick={() => concluirReserva(item)} style={styles.btnUsarSobra} title="Consumir / Dar baixa definitiva">✅ Usar</button>
                            <button onClick={() => setQrSelecionado(item)} style={styles.btnQr} title="Gerar QR Code da Reserva">🔲</button>
                            <button onClick={() => iniciarEdicaoReserva(item)} style={styles.btnEditar} title="Ajustar quantidade da reserva">✏️</button>
                            <button onClick={() => cancelarReserva(item.id || item._id)} style={styles.btnDeletar} title="Cancelar reserva e devolver ao estoque">🗑️</button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {abaAtiva === 'sobras' && (
          <div style={styles.cardSection}>
            <div style={{ borderBottom: '1px solid rgba(0,0,0,0.06)', paddingBottom: '14px', marginBottom: '20px' }}>
              <h3 style={{ ...styles.sectionTitle, margin: 0 }}>{idEditandoSobra ? '✏️ Ajustar Retalho' : '✂️ Cadastro e Consulta de Sobras e Retalhos'}</h3>
              <p style={{ color: '#64748B', fontSize: '13px', margin: '4px 0 0 0' }}>Cadastre os pedaços que sobraram, consulte e dê baixa ao reutilizá-los. Abate automaticamente do estoque central.</p>
            </div>

            <form onSubmit={cadastrarSobra} style={styles.formGrid} className="form-grid-responsive">

              {!idEditandoSobra && (
                <div style={{gridColumn: '1 / -1', background: '#F8FAFC', padding: '16px', borderRadius: '10px', border: '1px dashed #CBD5E1', marginBottom: '10px'}}>
                  <label style={styles.formLabel}>Autopreencher (Evite erros de digitação!)</label>
                  <div style={{display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap'}}>
                    <input type="text" placeholder="Digite Código ou Nome do Tecido" value={termoBuscaSobra} onChange={(e) => setTermoBuscaSobra(e.target.value)} style={{...styles.input, flex: 1, minWidth: '200px'}} />
                    <button type="button" onClick={executarBuscaSobra} style={{padding: '12px 20px', background: '#475569', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: '700', cursor: 'pointer', fontSize: '13px'}}>Buscar Tecido</button>
                  </div>
                </div>
              )}

              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Código do Tecido *</label>
                <input type="text" placeholder="Ex: TEC-001" value={formSobra.codigo} onChange={(e) => setFormSobra({...formSobra, codigo: e.target.value})} style={styles.input} required disabled={!!idEditandoSobra} />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Nome do Tecido *</label>
                <input type="text" placeholder="Ex: Malha Canelada" value={formSobra.nome} onChange={(e) => setFormSobra({...formSobra, nome: e.target.value})} style={styles.input} required />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Cor *</label>
                <input type="text" placeholder="Ex: Azul Marinho" value={formSobra.cor} onChange={(e) => setFormSobra({...formSobra, cor: e.target.value})} style={styles.input} required disabled={!!idEditandoSobra} />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Localização / Caixa de Retalhos *</label>
                <input type="text" placeholder="Ex: Caixa de Retalhos - Prateleira B" value={formSobra.localizacao} onChange={(e) => setFormSobra({...formSobra, localizacao: e.target.value})} style={styles.input} required />
              </div>
              <div style={{display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '10px', gridColumn: '1 / -1'}}>
                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Quantidade da Sobra *</label>
                  <input type="text" placeholder="Ex: 2.5" value={formSobra.quantidade} onChange={(e) => setFormSobra({...formSobra, quantidade: e.target.value})} style={styles.input} required />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Unidade</label>
                  <select value={formSobra.unidadeMedida} onChange={(e) => setFormSobra({...formSobra, unidadeMedida: e.target.value})} style={styles.input}>
                    <option value="m">Metros (m)</option>
                    <option value="kg">Quilos (kg)</option>
                  </select>
                </div>
              </div>
              <div style={{gridColumn: '1 / -1'}}>
                <label style={styles.formLabel}>Observação / De onde sobrou?</label>
                <input type="text" placeholder="Ex: Sobra do corte da Coleção Verão" value={formSobra.observacao} onChange={(e) => setFormSobra({...formSobra, observacao: e.target.value})} style={styles.input} />
              </div>

              <div style={{gridColumn: '1 / -1', marginTop: '8px'}}>
                <button type="submit" disabled={carregando} style={{...styles.button, background: idEditandoSobra ? '#D97706' : 'linear-gradient(135deg, #9333EA 0%, #7E22CE 100%)', color: '#fff'}}>
                  {idEditandoSobra ? '💾 Salvar Ajuste de Retalho na Base' : '💾 Salvar Retalho e Abater Estoque'}
                </button>
                {idEditandoSobra && (
                  <button type="button" onClick={() => { setIdEditandoSobra(null); setFormSobra({ codigo: '', nome: '', cor: '', quantidade: '', unidadeMedida: 'm', localizacao: '', observacao: '' }); }} style={{...styles.button, background: '#64748B', color: '#fff', marginTop: '8px'}}>
                    Cancelar Ajuste
                  </button>
                )}
              </div>
            </form>

            <div style={{ marginTop: '36px', borderTop: '1px solid rgba(0,0,0,0.06)', paddingTop: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
                <h4 style={{ margin: 0, fontSize: '15px', color: '#0F172A', fontWeight: '700' }}>🔎 Retalhos Disponíveis para Reuso</h4>
                <span style={{ fontSize: '12px', color: '#64748B' }}>Total de sobras: <strong>{sobrasFiltradas.length}</strong></span>
              </div>

              <input 
                type="text" 
                placeholder="Pesquisar sobra por nome, cor, código ou observação..." 
                value={buscaSobraTexto} 
                onChange={(e) => setBuscaSobraTexto(e.target.value)} 
                style={styles.inputFull}
              />

              <div style={styles.tableResponsive}>
                <table style={styles.table}>
                  <thead>
                    <tr style={styles.thTr}>
                      <th style={styles.th}>Código</th>
                      <th style={styles.th}>Tecido / Cor</th>
                      <th style={styles.th}>Qtd Disponível</th>
                      <th style={styles.th}>Onde Encontrar</th>
                      <th style={styles.th}>Observação</th>
                      <th style={styles.th}>Data</th>
                      <th style={styles.th}>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sobrasFiltradas.length === 0 ? (
                      <tr>
                        <td colSpan="7" style={styles.empty}>Nenhuma sobra cadastrada no banco.</td>
                      </tr>
                    ) : (
                      sobrasFiltradas.map((item) => (
                        <tr key={item.id || item._id} style={styles.tr}>
                          <td style={styles.td}><strong style={{ color: '#0F172A' }}>{item.codigo}</strong></td>
                          <td style={styles.td}>
                            <div style={{ fontWeight: '600', color: '#0F172A' }}>{item.nome} ({item.cor})</div>
                          </td>
                          <td style={styles.td}><strong style={{ color: '#9333EA', fontSize: '14px' }}>{item.quantidade} {item.unidadeMedida}</strong></td>
                          <td style={styles.td}><span style={styles.localBadge}>📍 {item.localizacao}</span></td>
                          <td style={styles.td}><span style={{ color: '#64748B', fontSize: '12px' }}>{(item.observacao || '').replace(/\[RETALHO\]/i, '')}</span></td>
                          <td style={styles.td}><span style={{ color: '#64748B' }}>{item.data}</span></td>
                          <td style={styles.td}>
                            <button onClick={() => usarSobra(item)} style={styles.btnUsarSobra} title="Dar baixa e usar retalho">✅ Usar</button>
                            <button onClick={() => setQrSelecionado(item)} style={styles.btnQr} title="Gerar QR Code">🔲</button>
                            <button onClick={() => iniciarEdicaoSobra(item)} style={styles.btnEditar} title="Ajustar quantidade do retalho">✏️</button>
                            <button onClick={() => deletarSobra(item.id || item._id)} style={styles.btnDeletar} title="Excluir">🗑️</button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div style={{ marginTop: '36px', borderTop: '1px solid rgba(0,0,0,0.06)', paddingTop: '24px' }}>
              <h4 style={{ margin: '0 0 16px 0', fontSize: '15px', color: '#0F172A', fontWeight: '700' }}>📤 Histórico de Saída de Sobras (Reutilizadas)</h4>
              <div style={styles.tableResponsive}>
                <table style={styles.table}>
                  <thead>
                    <tr style={styles.thTr}>
                      <th style={styles.th}>Código</th>
                      <th style={styles.th}>Tecido / Cor</th>
                      <th style={styles.th}>Qtd Utilizada</th>
                      <th style={styles.th}>Local de Origem</th>
                      <th style={styles.th}>Observação</th>
                      <th style={styles.th}>Data da Baixa</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sobrasSaidas.length === 0 ? (
                      <tr>
                        <td colSpan="6" style={styles.empty}>Nenhuma saída de sobra registrada até o momento.</td>
                      </tr>
                    ) : (
                      sobrasSaidas.map((item) => (
                        <tr key={item.id || item._id} style={styles.tr}>
                          <td style={styles.td}><strong style={{ color: '#0F172A' }}>{item.codigo}</strong></td>
                          <td style={styles.td}>
                            <div style={{ fontWeight: '600', color: '#0F172A' }}>{item.nome} ({item.cor})</div>
                          </td>
                          <td style={styles.td}><strong style={{ color: '#D97706', fontSize: '14px' }}>{item.quantidade} {item.unidadeMedida}</strong></td>
                          <td style={styles.td}><span style={styles.localBadge}>📍 {item.localizacao}</span></td>
                          <td style={styles.td}><span style={{ color: '#64748B', fontSize: '12px' }}>{(item.observacao || '').replace(/\[USO-RETALHO\]/i, '')}</span></td>
                          <td style={styles.td}><span style={{ color: '#64748B' }}>{item.dataBaixa || item.data}</span></td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {abaAtiva === 'historico' && (
          <div style={styles.cardSection}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
              <h3 style={{ ...styles.sectionTitle, margin: 0 }}>🔍 Consulta de Histórico e Galpões</h3>
              <span style={{ fontSize: '12px', color: '#64748B' }}>Total de registros visíveis: <strong>{movFiltradas.length}</strong></span>
            </div>

            <input 
              type="text" 
              placeholder="Pesquisar por nome, código (exato p/ resumo), fornecedor, nota fiscal ou galpão..." 
              value={busca} 
              onChange={(e) => setBusca(e.target.value)} 
              style={styles.inputFull}
            />

            {(() => {
              const termo = normalizarTexto(busca);
              if (!termo) return null;
              
              const tecidoResumo = Object.values(tecidosConsolidados).find(t => normalizarTexto(t.codigo) === termo);
              if (!tecidoResumo) return null;

              const resExatas = reservas.filter(r => normalizarTexto(r.codigo) === termo);
              const sobExatas = sobras.filter(s => normalizarTexto(s.codigo) === termo);

              return (
                <div style={{ background: '#FFFFFF', border: '2px solid #2563EB', padding: '20px', borderRadius: '12px', marginBottom: '24px', boxShadow: '0 8px 20px rgba(37,99,235,0.1)' }}>
                  <h4 style={{ margin: '0 0 16px 0', color: '#1E3A8A', fontSize: '16px' }}>📊 Resumo Analítico: {tecidoResumo.codigo} - {tecidoResumo.nome}</h4>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '20px' }}>
                    <div style={{ background: '#F1F5F9', padding: '12px', borderRadius: '8px' }}>
                      <div style={{ fontSize: '11px', color: '#64748B', fontWeight: '700' }}>ESTOQUE TOTAL (BRUTO)</div>
                      <div style={{ fontSize: '18px', fontWeight: '800', color: '#0F172A' }}>{tecidoResumo.totalBruto} {tecidoResumo.unidade}</div>
                    </div>
                    <div style={{ background: '#FEF3C7', padding: '12px', borderRadius: '8px' }}>
                      <div style={{ fontSize: '11px', color: '#92400E', fontWeight: '700' }}>TOTAL RESERVADO</div>
                      <div style={{ fontSize: '18px', fontWeight: '800', color: '#B45309' }}>- {tecidoResumo.totalReservas} {tecidoResumo.unidade}</div>
                    </div>
                    <div style={{ background: '#F3E8FF', padding: '12px', borderRadius: '8px' }}>
                      <div style={{ fontSize: '11px', color: '#6B21A8', fontWeight: '700' }}>TOTAL DE RETALHOS</div>
                      <div style={{ fontSize: '18px', fontWeight: '800', color: '#7E22CE' }}>- {tecidoResumo.totalSobras || 0} {tecidoResumo.unidade}</div>
                    </div>
                    <div style={{ background: '#DEF7EC', padding: '12px', borderRadius: '8px', border: '1px solid #31C48D' }}>
                      <div style={{ fontSize: '11px', color: '#03543F', fontWeight: '700' }}>QUANTIDADE FINAL DISPONÍVEL</div>
                      <div style={{ fontSize: '20px', fontWeight: '900', color: '#059669' }}>{tecidoResumo.total} {tecidoResumo.unidade}</div>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
                    <div>
                      <strong style={{ fontSize: '13px', color: '#0F172A' }}>📌 Todas as Reservas (Detalhamento):</strong>
                      {resExatas.length === 0 ? <div style={{ fontSize: '12px', color: '#64748B', marginTop: '4px' }}>Nenhuma reserva pendente.</div> : (
                        <ul style={{ margin: '8px 0 0 16px', padding: 0, fontSize: '12px', color: '#334155' }}>
                          {resExatas.map(r => <li key={r.id || r._id} style={{marginBottom: '4px'}}><strong>{r.quantidade} {r.unidadeMedida}</strong> - {(r.observacao || 'Sem obs.').replace(/\[RESERVA\]/i, '')} (Cor: {r.cor} | 📍 {r.localizacao})</li>)}
                        </ul>
                      )}
                    </div>
                    <div>
                      <strong style={{ fontSize: '13px', color: '#0F172A' }}>✂️ Todos os Retalhos (Detalhamento):</strong>
                      {sobExatas.length === 0 ? <div style={{ fontSize: '12px', color: '#64748B', marginTop: '4px' }}>Nenhum retalho guardado.</div> : (
                        <ul style={{ margin: '8px 0 0 16px', padding: 0, fontSize: '12px', color: '#334155' }}>
                          {sobExatas.map(s => <li key={s.id || s._id} style={{marginBottom: '4px'}}><strong>{s.quantidade} {s.unidadeMedida}</strong> - {(s.observacao || 'Sem obs.').replace(/\[RETALHO\]/i, '')} (Cor: {s.cor} | 📍 {s.localizacao})</li>)}
                        </ul>
                      )}
                    </div>
                  </div>
                </div>
              );
            })()}

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
                      <td colSpan="9" style={styles.empty}>Nenhum registro encontrado na consulta.</td>
                    </tr>
                  ) : (
                    movFiltradas.map((item) => {
                      const itemId = item.id || item._id;
                      const precoUnit = parseNumero(item.preco) || 0;
                      const qtd = parseNumero(item.metros || item.quantidade || 0);
                      const unidade = item.unidademedida || item.unidadeMedida || 'm';
                      const tipoMovimentoReal = item._tipoExibicao;
                      
                      const minimo = obterMinimo(item);
                      const custoTotal = qtd * precoUnit;
                      const nf = item.notafiscal || item.notaFiscal || '';
                      const fornecedor = item.fornecedor || '';

                      let badgeBg = '#DEF7EC';
                      let badgeColor = '#03543F';
                      let badgeText = '📥 Entrada';
                      
                      const tReal = (tipoMovimentoReal || '').toLowerCase();
                      
                      if (tReal === 'saida') {
                        badgeBg = '#FDE8E8';
                        badgeColor = '#9B1C1C';
                        badgeText = '📤 Saída';
                      } else if (tReal === 'reserva') {
                        badgeBg = '#FEF3C7';
                        badgeColor = '#92400E';
                        badgeText = '📌 Reserva';
                      } else if (tReal === 'retalhos') {
                        badgeBg = '#F3E8FF';
                        badgeColor = '#6B21A8';
                        badgeText = '✂️ Retalhos';
                      }

                      return (
                        <tr key={itemId} style={styles.tr}>
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
                            <div style={{ fontWeight: '600', color: '#0F172A' }}>{item.nome} <span style={{color: '#2563EB'}}>({item.cor})</span></div>
                            {item.largura ? <div style={{fontSize: '11px', color: '#2563EB', fontWeight: '500'}}>Largura: {item.largura}m</div> : null}
                          </td>
                          <td style={styles.td}>
                            <div style={{fontSize: '13px', fontWeight: '600', color: '#0F172A'}}>{fornecedor || '-'}</div>
                            <div style={{fontSize: '11px', color: '#64748B'}}>NF: {nf || 'N/D'}</div>
                          </td>
                          <td style={styles.td}><span style={styles.localBadge}>📍 {item.localizacao}</span></td>
                          <td style={styles.td}>
                            <strong style={{ color: '#0F172A' }}>{qtd} {unidade}</strong>
                            {!item.isExtra && (
                              <>
                                <div style={{fontSize: '11px', color: '#64748B'}}>Mín: {minimo} {unidade}</div>
                                <div style={{fontSize: '11px', color: '#059669', fontWeight: '600'}}>
                                  R$ {precoUnit.toFixed(2)} | Tot: R$ {custoTotal.toFixed(2)}
                                </div>
                              </>
                            )}
                          </td>
                          <td style={styles.td}><span style={{color: '#64748B'}}>{item.data}</span></td>
                          <td style={styles.td}>
                            {item.isExtra ? (
                              <span style={{ fontSize: '11px', color: '#64748B' }}>Gerencie na aba<br/>correspondente</span>
                            ) : (
                              <>
                                <button onClick={() => setQrSelecionado(item)} style={styles.btnQr} title="Gerar QR Code">🔲</button>
                                <button onClick={() => iniciarEdicao(item)} style={styles.btnEditar} title="Editar registro">✏️</button>
                                <button onClick={() => deletarItem(itemId)} style={styles.btnDeletar} title="Remover registro">🗑️</button>
                              </>
                            )}
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

      {qrSelecionado && (
        <div style={styles.modalOverlay} onClick={() => setQrSelecionado(null)}>
          <div style={{...styles.modalContent, alignItems: 'center'}} onClick={(e) => e.stopPropagation()}>
            <button style={styles.modalCloseBtn} onClick={() => setQrSelecionado(null)}>✕ Fechar</button>
            <h3 style={{ margin: '0 0 4px 0', fontSize: '16px', color: '#0F172A', fontWeight: '800' }}>QR Code Interativo</h3>
            <p style={{ fontSize: '13px', color: '#64748B', marginBottom: '16px', textAlign: 'center' }}>
              <strong>{qrSelecionado.codigo}</strong> - {qrSelecionado.nome} (<span style={{color: '#2563EB', fontWeight: '700'}}>{qrSelecionado.cor}</span>)
            </p>
            <div style={styles.qrCodeBox}>
              <img 
                src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(`${window.location.origin}/?codigo=${qrSelecionado.codigo}&cor=${encodeURIComponent(qrSelecionado.cor)}`)}`} 
                alt="QR Code" 
                style={{ width: '200px', height: '200px', display: 'block' }} 
              />
            </div>
            <span style={{ fontSize: '11px', color: '#64748B', textAlign: 'center', maxWidth: '280px', lineHeight: '1.4' }}>
              📱 Ao apontar a câmera do celular, ele carregará diretamente o status deste rolo, revelando a quantidade livre.
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  qrViewContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    backgroundColor: '#F1F5F9',
    padding: '16px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  qrViewCard: {
    backgroundColor: '#FFFFFF',
    padding: '28px',
    borderRadius: '20px',
    boxShadow: '0 15px 35px rgba(0, 0, 0, 0.08)',
    width: '100%',
    maxWidth: '400px',
    boxSizing: 'border-box',
    border: '1px solid #E2E8F0',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  qrViewImg: {
    width: '100px',
    height: '100px',
    objectFit: 'cover',
    borderRadius: '12px',
    marginBottom: '16px',
    border: '2px solid #2563EB',
    cursor: 'pointer',
  },
  qrViewNoFoto: {
    fontSize: '12px',
    color: '#94A3B8',
    marginBottom: '16px',
    fontStyle: 'italic',
    backgroundColor: '#F8FAFC',
    padding: '12px 24px',
    borderRadius: '8px',
  },
  qrInfoBox: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: '12px',
    padding: '14px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    marginBottom: '20px',
    border: '1px solid #E2E8F0',
    boxSizing: 'border-box',
  },
  qrInfoRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '13px',
    color: '#475569',
  },
  qrBackBtn: {
    width: '100%',
    padding: '12px',
    backgroundColor: '#F1F5F9',
    color: '#334155',
    border: '1px solid #CBD5E1',
    borderRadius: '10px',
    fontWeight: '700',
    cursor: 'pointer',
    fontSize: '13px',
  },
  appLayout: {
    display: 'flex',
    minHeight: '100vh',
    backgroundColor: '#F4F7FC',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  sidebar: {
    width: '260px',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
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
    justifyContent: 'space-between',
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
    gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
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
  btnUsarSobra: {
    padding: '6px 10px',
    backgroundColor: '#DEF7EC',
    color: '#03543F',
    border: '1px solid #A7F3D0',
    borderRadius: '8px',
    cursor: 'pointer',
    marginRight: '6px',
    fontSize: '12px',
    fontWeight: '700',
  },
  btnQr: {
    padding: '6px 10px',
    backgroundColor: '#F3E8FF',
    color: '#7E22CE',
    border: '1px solid #D8B4FE',
    borderRadius: '8px',
    cursor: 'pointer',
    marginRight: '6px',
    fontSize: '12px',
    fontWeight: '700',
  },
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