import './calculator.css';
import { simular, mensagemWhatsApp, WHATSAPP } from './model.js';
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

  function atualizarAviso() {
    const select = get('calcAviso');
    const anterior = select.value;
    select.replaceChildren(...MODALIDADES[get('calcModalidade').value].avisos.map(valor => {
      const option = document.createElement('option');
      option.value = valor;
      option.textContent = ROTULOS_AVISO[valor];
      return option;
    }));
    if ([...select.options].some(option => option.value === anterior)) select.value = anterior;
    const temMulta = MODALIDADES[get('calcModalidade').value].multaFGTS > 0;
    get('calcFGTSField').hidden = modo === 'registro' || !temMulta;
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
    const { resultado, recebido, diferenca, pagamento, fgtsPeriodo, fgtsIncompleto, fgtsAnterior, ferias, tributosCompletos } = simulacao;
    get('calcTotalLabel').textContent = !tributosCompletos ? 'Estimativa antes de impostos' : ferias.parcial ? 'Acerto líquido parcial' : 'Acerto líquido estimado';
    get('calcTotal').textContent = formatarMoeda(resultado.total);
    get('calcPaid').textContent = pagamento === 'incerto' ? 'Não informado' : pagamento === 'nao' ? 'Não recebido' : formatarMoeda(recebido);
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
      : fgtsIncompleto
        ? `FGTS parcial: ${formatarMoeda(resultado.totalFGTS)}. A base anterior não foi informada: a multa e o total do vínculo estão incompletos. Esse valor não entra na diferença do acerto.`
        : `FGTS de referência: ${formatarMoeda(fgtsPeriodo)} (base informada + depósitos rescisórios + eventual multa). Separado do acerto; não significa saque imediato.`;
    const composicao = [
      ...resultado.verbas.map(v => linha(v.titulo, v.valor)),
      linha('Total bruto do acerto', resultado.bruto),
      linha('Descontos e adiantamentos considerados', resultado.bruto - resultado.total),
      ...resultado.descontos.filter(v => /^(INSS|IRRF)/.test(v.titulo)).map(v => linha(`Detalhe: ${v.titulo}`, -v.valor)),
      linha(!tributosCompletos ? 'Estimativa antes de impostos' : ferias.parcial ? 'Acerto líquido parcial' : 'Acerto líquido estimado', resultado.total),
      linha(modo === 'registro' ? 'FGTS anterior estimado' : 'Base anterior do FGTS informada', fgtsAnterior),
      ...resultado.fgts.map(v => linha(v.titulo, v.valor)),
    ];
    get('calcBreakdown').replaceChildren(...composicao);
    const observacoes = [
      ...resultado.observacoes,
      `Férias informadas: ${ferias.descricao}`,
      'A estimativa de férias considera 30 dias por ano, sem faltas que reduzam esse direito ou afastamentos que alterem a aquisição. Os períodos são contados desde a admissão, com projeção do aviso indenizado.',
      'Descontos estimados na data da saída. Pagamentos em outro mês/ano, rendimentos acumulados e valores apurados em processo judicial exigem cálculo tributário específico. Não há atualização monetária, juros ou avaliação de prescrição nesta simulação.',
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
    atualizarAviso();
    mostrarEtapa(1);
  }));
  root.querySelector('[data-calc-back]').addEventListener('click', () => { mostrarEtapa(1); get('calcSalario').focus({ preventScroll: true }); });
  get('calcEdit').addEventListener('click', () => { mostrarEtapa(2); get('calcModalidade').focus({ preventScroll: true }); });
  get('calcModalidade').addEventListener('change', atualizarAviso);
  get('calcPagamento').addEventListener('change', atualizarPagamento);
  get('calcFerias').addEventListener('change', () => {
    const parcial = ['parte', 'incerto'].includes(get('calcFerias').value);
    get('calcVacationHelp').textContent = parcial ? 'Sem os detalhes das férias antigas, calculamos somente a parte identificável e mostramos que a estimativa está incompleta.' : get('calcFerias').value === 'nunca' ? 'Vamos calcular automaticamente os períodos completos, eventual dobra por falta de concessão no prazo e a parte proporcional.' : 'Consideramos quitadas as férias completas anteriores à saída e calculamos a parte ainda adquirida, inclusive a projeção do aviso.';
  });
  form.addEventListener('submit', event => {
    event.preventDefault();
    const problemas = validarInicio();
    if (problemas.length) return erros(problemas);
    if (etapa === 1) { mostrarEtapa(2); get('calcModalidade').focus({ preventScroll: true }); return; }
    const campos = new URLSearchParams(new FormData(form));
    const simulacao = simular(campos, modo, hoje);
    if (!simulacao.ok) { erros(simulacao.erros); return; }
    exibir(simulacao);
  });
  atualizarAviso();
  atualizarPagamento();
}
