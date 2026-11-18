import './calculator.css';
import { simular, mensagemWhatsApp, WHATSAPP, AVISO_SEM_REGISTRO } from './model.js';
import { MODALIDADES, ROTULOS_AVISO, parseDataLocal, formatarMoeda } from './vendor/rescisao.js';

const root = document.getElementById('laborCalculator');
if (root) {
  const get = id => root.querySelector(`#${id}`);
  const form = get('calculatorForm');
  let modo = 'acerto';
  let etapa = 1;
  const hoje = new Date();
  const isoHoje = [hoje.getFullYear(), String(hoje.getMonth() + 1).padStart(2, '0'), String(hoje.getDate()).padStart(2, '0')].join('-');
  get('calcAdmissao').max = isoHoje;
  get('calcSaida').max = isoHoje;

  function erros(mensagens = []) {
    get('calculatorErrors').textContent = mensagens.join(' ');
    get('calculatorErrors').hidden = !mensagens.length;
  }

  function mostrarEtapa(numero) {
    etapa = numero;
    get('calculatorStepOne').hidden = numero !== 1;
    get('calculatorStepTwo').hidden = numero !== 2;
    form.hidden = numero === 3;
    get('calculatorResult').hidden = numero !== 3;
    erros();
  }

  function atualizarAviso(reset = false) {
    const select = get('calcAviso');
    const anterior = select.value;
    const opcoes = modo === 'registro' ? AVISO_SEM_REGISTRO[get('calcModalidade').value]
      : MODALIDADES[get('calcModalidade').value].avisos.map(valor => [valor, ROTULOS_AVISO[valor]]);
    select.replaceChildren(...opcoes.map(([valor, rotulo]) => {
      const option = document.createElement('option');
      option.value = valor;
      option.textContent = rotulo;
      return option;
    }));
    if (!reset && [...select.options].some(option => option.value === anterior)) select.value = anterior;
    get('calcAvisoLabel').textContent = modo === 'registro' ? 'Como foi sua saída em relação ao aviso?' : 'Aviso prévio';
    get('calcAvisoField').classList.toggle('calculator-field--full', modo === 'registro');
    atualizarExplicacaoAviso();
    get('calcFGTSField').hidden = modo === 'registro';
  }

  function atualizarExplicacaoAviso() {
    const semAviso = modo === 'registro' && get('calcAviso').value === 'sem_aviso';
    get('calcAvisoHelp').hidden = !semAviso;
    get('calcAvisoHelp').textContent = semAviso ? 'Você saiu na hora, sem aviso e sem pagamento por esse período. A simulação inclui o aviso que pode ser devido. Informe no acerto recebido qualquer valor que já tenha recebido.' : '';
  }

  function atualizarPagamento() {
    get('calcRecebidoField').hidden = get('calcPagamento').value !== 'sim';
  }

  function validarInicio() {
    const inicio = parseDataLocal(get('calcAdmissao').value);
    const fim = parseDataLocal(get('calcSaida').value);
    const salario = Number(get('calcSalario').value);
    if (!Number.isFinite(salario) || salario <= 0 || salario > 10000000) return ['Informe um salário bruto válido, maior que zero e de até R$ 10.000.000,00.'];
    if (!inicio || !fim) return ['Preencha as duas datas de trabalho.'];
    if (inicio.getFullYear() < 1950 || inicio > fim) return ['Confira as datas: o início não pode ser depois da saída.'];
    if (fim > new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate())) return ['A data de saída não pode estar no futuro.'];
    return [];
  }

  function linha(titulo, valor) {
    const row = document.createElement('div');
    const dt = document.createElement('dt');
    dt.textContent = titulo;
    const dd = document.createElement('dd');
    dd.textContent = formatarMoeda(valor);
    row.append(dt, dd);
    return row;
  }

  function exibir(simulacao) {
    const { resultado, recebido, diferenca, pagamento, fgtsPeriodo, fgtsEstimado, fgtsAnterior, ferias, tributosCompletos } = simulacao;
    get('calcTotalLabel').textContent = !tributosCompletos ? 'Estimativa antes de impostos' : ferias.parcial ? 'Acerto líquido parcial' : 'Acerto líquido estimado';
    get('calcTotal').textContent = formatarMoeda(resultado.total);
    get('calcPaid').textContent = pagamento === 'incerto' ? 'Não informado' : pagamento === 'nao' ? 'Não recebido' : formatarMoeda(recebido);
    get('calcFGTSExtra').hidden = modo !== 'registro';
    get('calcFGTSExtraValue').textContent = formatarMoeda(fgtsPeriodo);
    get('calcFGTSResult').hidden = modo === 'registro';
    get('calcDifferenceLabel').textContent = diferenca !== null && diferenca < 0 ? 'Recebido acima da estimativa' : 'Diferença estimada';
    get('calcDifference').textContent = diferenca === null ? 'A conferir' : formatarMoeda(Math.abs(diferenca));
    get('calcMessage').textContent = ferias.parcial
      ? 'As férias antigas ainda precisam ser conferidas. O valor é parcial; não calculamos uma diferença final enquanto essa informação estiver pendente.'
      : !tributosCompletos
        ? 'Não há tabelas de impostos cadastradas para todas as datas deste caso. Exibimos o valor antes de impostos, sem compará-lo ao líquido recebido.'
      : diferenca === null
      ? 'Confira o demonstrativo e os comprovantes para comparar com a simulação.'
      : diferenca > 0
        ? 'A simulação aponta uma diferença. A conferência dos documentos pode esclarecer os valores.'
        : diferenca < 0
          ? 'O valor informado é maior que a estimativa. Confira a composição: podem existir outras verbas no pagamento.'
          : 'Os valores coincidem nesta simulação. Isso não substitui a conferência das verbas e dos documentos.';
    get('calcFGTSResult').textContent = modo === 'registro'
      ? `FGTS estimado do período: ${formatarMoeda(fgtsPeriodo)}, incluindo depósitos rescisórios e eventual multa. Separado do acerto acima; não significa saque imediato. Pressupõe salário constante e nenhum depósito anterior.`
      : fgtsEstimado
        ? `FGTS estimado pelo tempo de trabalho: ${formatarMoeda(fgtsPeriodo)}, incluindo depósitos rescisórios e eventual multa. Usamos o último salário como referência para todo o período, com 13º. É uma estimativa dos depósitos devidos, sem confirmar o saldo existente, saques ou disponibilidade. Separado do acerto acima.`
        : `FGTS de referência: ${formatarMoeda(fgtsPeriodo)} (base informada + depósitos rescisórios + eventual multa). Separado do acerto; não significa saque imediato.`;
    const composicao = [
      ...resultado.verbas.map(v => linha(v.titulo, v.valor)),
      linha('Total bruto do acerto', resultado.bruto),
      linha('Descontos e adiantamentos considerados', resultado.bruto - resultado.total),
      ...resultado.descontos.filter(v => /^(INSS|IRRF)/.test(v.titulo)).map(v => linha(`Detalhe: ${v.titulo}`, -v.valor)),
      linha(!tributosCompletos ? 'Estimativa antes de impostos' : ferias.parcial ? 'Acerto líquido parcial' : 'Acerto líquido estimado', resultado.total),
      linha(fgtsEstimado ? 'FGTS anterior estimado pelo tempo de trabalho' : 'Base anterior do FGTS informada', fgtsAnterior),
      ...resultado.fgts.map(v => linha(v.titulo, v.valor)),
    ];
    get('calcBreakdown').replaceChildren(...composicao);
    const observacoes = [
      ...resultado.observacoes,
      `Férias informadas: ${ferias.descricao}`,
      ...(ferias.pendenciasInformadas ? ['As férias pendentes que você informou entram com 1/3 no acerto. Eventual dobra não é presumida sem as datas de gozo e pagamento: atraso na concessão e atraso no pagamento exigem análises diferentes.'] : []),
      'A estimativa de férias considera 30 dias por ano, sem faltas que reduzam esse direito ou afastamentos que alterem a aquisição. Os períodos são contados desde a admissão, com projeção do aviso indenizado.',
      'Descontos estimados na data da saída. Pagamentos em outro mês/ano, rendimentos acumulados e valores apurados em processo judicial exigem cálculo tributário específico. Não há atualização monetária, juros ou avaliação de prescrição nesta simulação.',
      ...(fgtsEstimado ? ['O FGTS foi estimado com o último salário constante e 13º durante todo o vínculo. Não inclui atualização, juros, lucros distribuídos, terço de férias gozadas ou histórico salarial; não confirma depósitos feitos nem saldo disponível. A multa continua separada da base dos depósitos.'] : []),
      ...(modo === 'registro' ? ['A existência do vínculo de emprego não é determinada pela calculadora. A estimativa depende do reconhecimento e das provas do caso.', 'O FGTS anterior usa o último salário como constante durante todo o período, incluindo 13º. Não acrescenta novamente salários mensais que já foram pagos.'] : []),
    ];
    get('calcAssumptions').replaceChildren(...observacoes.map(texto => {
      const item = document.createElement('li'); item.textContent = texto; return item;
    }));
    get('calcContact').textContent = modo === 'registro' ? 'Avaliar meu período sem registro' : diferenca > 0 ? 'Analisar essa diferença' : 'Conferir meu acerto com o escritório';
    get('calcContact').href = `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(mensagemWhatsApp(simulacao))}`;
    mostrarEtapa(3);
    get('calcEdit').focus({ preventScroll: true });
  }

  root.querySelectorAll('[data-calc-mode]').forEach(button => button.addEventListener('click', () => {
    modo = button.dataset.calcMode;
    root.querySelectorAll('[data-calc-mode]').forEach(other => other.setAttribute('aria-pressed', String(other === button)));
    get('calcRegistroNote').hidden = modo !== 'registro';
    atualizarAviso(true);
    mostrarEtapa(1);
  }));
  root.querySelector('[data-calc-back]').addEventListener('click', () => { mostrarEtapa(1); get('calcSalario').focus({ preventScroll: true }); });
  get('calcEdit').addEventListener('click', () => { mostrarEtapa(2); get('calcModalidade').focus({ preventScroll: true }); });
  get('calcModalidade').addEventListener('change', () => atualizarAviso());
  get('calcAviso').addEventListener('change', atualizarExplicacaoAviso);
  get('calcPagamento').addEventListener('change', atualizarPagamento);
  function atualizarFerias() {
    const resposta = get('calcFerias').value;
    const pendentes = resposta === 'parte';
    get('calcVacationCountField').hidden = !pendentes;
    get('calcVacationDaysField').hidden = !pendentes;
    get('calcVacationCount').required = pendentes;
    get('calcVacationHelp').textContent = pendentes
      ? 'Informe abaixo o que ainda não foi pago. Vamos incluir essas férias com 1/3 no acerto, sem repetir a parte proporcional.'
      : resposta === 'incerto' ? 'Sem a quantidade das férias antigas, mostramos uma estimativa parcial. Você pode voltar e informar o que está pendente.'
      : resposta === 'nunca' ? 'Vamos calcular automaticamente os períodos completos, eventual dobra por falta de concessão no prazo e a parte proporcional.'
      : resposta === 'quitadas' ? 'Consideramos quitadas as férias completas anteriores à saída e calculamos a parte ainda adquirida, inclusive a projeção do aviso.'
      : 'Se nunca tirou nem recebeu, calculamos pelas datas. Se ficou parte pendente, você poderá informar quanto falta.';
  }
  get('calcFerias').addEventListener('change', atualizarFerias);
  form.addEventListener('submit', event => {
    event.preventDefault();
    const problemas = validarInicio();
    if (problemas.length) return erros(problemas);
    if (etapa === 1) { mostrarEtapa(2); get('calcModalidade').focus({ preventScroll: true }); return; }
    const campos = new URLSearchParams(new FormData(form));
    const simulacao = simular(campos, modo, hoje);
    if (!simulacao.ok) {
      erros(simulacao.erros);
      if (get('calcFerias').value === 'parte' && get('calcVacationCount').value === '') get('calcVacationCount').focus();
      return;
    }
    exibir(simulacao);
  });
  atualizarAviso();
  atualizarPagamento();
  atualizarFerias();
}
