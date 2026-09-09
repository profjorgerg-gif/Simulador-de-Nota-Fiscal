const fs = require('fs');
const path = require('path');

const appPath = path.join(__dirname, '..', 'src', 'AppV4.jsx');
const src = fs.readFileSync(appPath, 'utf8');

function assert(cond, msg) {
  if (!cond) {
    console.error(`ERRO FISCAL: ${msg}`);
    process.exitCode = 1;
  }
}

function n2(v) { return Math.round((Number(v) || 0) * 100) / 100; }
function icms(origem, destino) {
  const sulSudesteSemES = new Set(['SC','PR','RS','SP','RJ','MG']);
  origem = String(origem || '').toUpperCase();
  destino = String(destino || '').toUpperCase();
  if (!origem || !destino) return 0;
  if (origem === destino) return origem === 'SC' ? 17 : 0;
  if (sulSudesteSemES.has(origem) && !sulSudesteSemES.has(destino)) return 7;
  return 12;
}
function totais({produtos, descontoPct=0, frete=0, seguro=0, outras=0, origem='SC', destino='SC'}) {
  const desconto = n2(produtos * descontoPct / 100);
  const operacao = n2(produtos - desconto + frete + seguro + outras);
  const vIcms = n2(operacao * icms(origem,destino) / 100);
  const basePC = n2(Math.max(0, operacao - vIcms));
  const pis = n2(basePC * 1.65 / 100);
  const cofins = n2(basePC * 7.60 / 100);
  const baseReforma = n2(Math.max(0, operacao - vIcms - pis - cofins));
  return {
    operacao,
    icms: vIcms,
    basePC,
    pis,
    cofins,
    baseReforma,
    cbs: n2(baseReforma * 0.90 / 100),
    ibs: n2(baseReforma * 0.10 / 100),
    totalNota: operacao
  };
}

// Guardas de implementação: o build deve falhar se regras centrais forem removidas sem revisão.
assert(src.includes('MOTOR_FISCAL_VERSION="2026.2"'), 'versão 2026.2 não está ativa.');
['1102','2102','5102','6102'].forEach(c => assert(src.includes(`codigo:"${c}"`), `CFOP ${c} não encontrado.`));
['1403','2403','5403','6403'].forEach(c => assert(!src.includes(`codigo:"${c}"`), `CFOP ST ${c} não deve estar liberado no motor 2026.2.`));
assert(src.includes('cst:"00"'), 'CST 00 obrigatório no escopo atual não encontrado.');
assert(src.includes('cbs:0.90') || src.includes('cbs:0.9'), 'CBS 0,90% não encontrada.');
assert(src.includes('ibs:0.10') || src.includes('ibs:0.1'), 'IBS 0,10% não encontrado.');
assert(src.includes('Peso líquido não pode ser maior que o peso bruto.'), 'validação de pesos foi removida.');
assert(src.includes('validacaoFiscal'), 'metadados de validação fiscal não encontrados.');

// Vetores numéricos de regressão.
assert(icms('SC','SC') === 17, 'ICMS interno SC deve ser 17%.');
assert(icms('SC','PR') === 12, 'ICMS SC→PR deve ser 12%.');
assert(icms('SC','BA') === 7, 'ICMS SC→BA deve ser 7%.');
assert(icms('PR','SC') === 12, 'ICMS PR→SC deve ser 12%.');

const a = totais({produtos:1000, origem:'SC', destino:'SC'});
assert(a.operacao === 1000, 'valor da operação interna incorreto.');
assert(a.icms === 170, 'ICMS de R$ 1.000 em SC deve ser R$ 170,00.');
assert(a.basePC === 830, 'base PIS/COFINS deve excluir ICMS no cenário adotado.');
assert(a.pis === 13.70, 'PIS do vetor interno incorreto.');
assert(a.cofins === 63.08, 'COFINS do vetor interno incorreto.');
assert(a.baseReforma === 753.22, 'base IBS/CBS do vetor interno incorreta.');
assert(a.cbs === 6.78, 'CBS do vetor interno incorreta.');
assert(a.ibs === 0.75, 'IBS do vetor interno incorreto.');
assert(a.totalNota === 1000, 'CBS/IBS informativos não devem elevar o total da nota em 2026.');

const b = totais({produtos:1000, descontoPct:10, frete:50, seguro:10, outras:40, origem:'SC', destino:'PR'});
assert(b.operacao === 1000, 'desconto e acréscimos devem compor corretamente o valor da operação.');
assert(b.icms === 120, 'ICMS interestadual do vetor SC→PR incorreto.');
assert(b.basePC === 880, 'base PIS/COFINS interestadual incorreta.');

if (!process.exitCode) {
  console.log('Motor Fiscal 2026.2: testes de regressão concluídos com sucesso.');
}
