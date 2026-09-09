import { doc, getDoc, setDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "./firebase";

const MANUAL_OPERACIONAL_ID="__manual_operacional__";
const MARCADOR="MANUAL OPERACIONAL — VERSÃO 2026.2";

function manualProfessorHtml(){
  return `
    <h2>Manual da Plataforma</h2>
    <p>Guia operacional atualizado do Simulador Fiscal Didático — versão vigente com Motor Fiscal 2026.2.</p>

    <nav class="manual-toc">
      <a href="#mp-acesso">1. Acesso do professor</a>
      <a href="#mp-navegacao">2. Navegação</a>
      <a href="#mp-emissao">3. Emissão de NF-e</a>
      <a href="#mp-fiscal">4. Regras fiscais 2026</a>
      <a href="#mp-historico">5. Histórico e PDF</a>
      <a href="#mp-cabecalho">6. Cabeçalhos</a>
      <a href="#mp-suporte">7. Suporte</a>
      <a href="#mp-backup">8. Backup e saída</a>
    </nav>

    <section class="manual-section" id="mp-acesso">
      <h3>1. Acesso do professor</h3>
      <p>O acesso é feito com conta Google. No primeiro acesso, o professor envia automaticamente uma solicitação ao Admin e permanece com status <b>Pendente</b> até a aprovação.</p>
      <p>Após a aprovação, a mesma conta Google passa a acessar normalmente a plataforma. Contas <b>bloqueadas</b> ou <b>recusadas</b> não conseguem entrar.</p>
    </section>

    <section class="manual-section" id="mp-navegacao">
      <h3>2. Navegação</h3>
      <p>No computador, utilize o menu fixo do cabeçalho. No celular, utilize o botão <b>☰</b>, que abre o menu lateral somente quando solicitado.</p>
      <p>As áreas principais são: Emitir NF-e, Histórico, Cabeçalho, Manual e Suporte.</p>
    </section>

    <section class="manual-section" id="mp-emissao">
      <h3>3. Emissão de NF-e simulada</h3>
      <p>A plataforma permite <b>preenchimento manual</b> e <b>emissão automática em lote</b>. Toda emissão do Motor Fiscal 2026.2 passa por validação estrutural antes de ser salva.</p>
      <p>O cenário atualmente liberado é de <b>comércio para revenda, regime normal, ano de 2026</b>. Os CFOPs ativos são 1.102, 2.102, 5.102 e 6.102.</p>
      <p>Operações com Substituição Tributária, devoluções, industrialização e uso/consumo permanecem bloqueadas até que seus tratamentos específicos sejam implementados.</p>
      <p>O sistema verifica, entre outros pontos, CNPJ, Inscrição Estadual de SC/PR, NCM com 8 dígitos, CST 00, relação CFOP × operação × UF, quantidades, valores, descontos, acréscimos e pesos.</p>
    </section>

    <section class="manual-section" id="mp-fiscal">
      <h3>4. Regras fiscais do cenário 2026</h3>
      <p>O ICMS é calculado conforme a relação entre origem e destino. No cenário interno de Santa Catarina, a alíquota geral utilizada é 17%. Nas operações interestaduais, o motor aplica 12% ou 7%, conforme o destino contemplado pela regra do cenário.</p>
      <p>Para o escopo comercial atual, o IPI permanece em 0%. PIS e COFINS utilizam as alíquotas do cenário não cumulativo adotado pela plataforma.</p>
      <p>Em 2026, <b>CBS 0,90%</b> e <b>IBS 0,10%</b> são destacados de forma informativa e não elevam o total da nota didática. As bases são calculadas pelo Motor Fiscal 2026.2 conforme o cenário implementado.</p>
      <p>Quando houver inconsistência tributária ou estrutural, a emissão é bloqueada e o sistema apresenta as correções necessárias.</p>
    </section>

    <section class="manual-section" id="mp-historico">
      <h3>5. Histórico, visualização e PDF</h3>
      <p>O Histórico apresenta apenas documentos compatíveis com a versão fiscal vigente. É possível visualizar uma NF-e, salvar um PDF individual ou selecionar várias notas para salvar em bloco.</p>
      <p>O PDF é gerado a partir da própria visualização da NF-e, em A4 retrato, preservando o mesmo formato visual da tela.</p>
    </section>

    <section class="manual-section" id="mp-cabecalho">
      <h3>6. Escolha de cabeçalho</h3>
      <p>Cada professor possui três opções de cabeçalho:</p>
      <p><b>CEDUP Hermann Hering — institucional:</b> utiliza o modelo fixo disponibilizado pela plataforma.</p>
      <p><b>Cabeçalho personalizado:</b> permite enviar uma imagem própria, vinculada ao acesso do professor, com limite de 600 KB.</p>
      <p><b>Padrão do sistema:</b> não adiciona imagem institucional e utiliza apenas o cabeçalho técnico do Simulador Fiscal Didático.</p>
      <p>A preferência escolhida é individual e também é aplicada aos PDFs gerados.</p>
    </section>

    <section class="manual-section" id="mp-suporte">
      <h3>7. Central de Suporte</h3>
      <p>O professor pode abrir chamados para relatar problemas de sistema, emissão de NF-e, PDF, histórico, acesso, questões pedagógicas ou outros assuntos.</p>
      <p>O Admin acompanha os chamados e pode alterar o status para Aberto, Em análise, Encaminhado ou Encerrado.</p>
    </section>

    <section class="manual-section" id="mp-backup">
      <h3>8. Backup e saída</h3>
      <p>Ao selecionar <b>Sair</b>, a plataforma oferece a opção de baixar um backup antes de encerrar a sessão. O professor pode optar por baixar o arquivo e sair, sair sem backup ou cancelar.</p>
      <p>O backup é gerado em formato JSON e contém os registros disponíveis ao sistema naquele momento.</p>
    </section>

    <div class="notice"><b>Importante:</b> todos os documentos emitidos são exclusivamente pedagógicos e não possuem validade fiscal. Este manual corresponde ao comportamento atual da plataforma e substitui orientações de versões anteriores.</div>`;
}

const MANUAL_OPERACIONAL_ATUAL=`${MARCADOR}\n\n1. FINALIDADE\nEste manual descreve as rotinas administrativas, operacionais e de controle do Simulador Fiscal Didático — CEDUP Hermann Hering.\n\n2. PERFIS DE ACESSO\n2.1 Admin\n- Acesso administrativo mediante autenticação Google e autorização administrativa.\n- Responsável por aprovar, recusar, bloquear e reativar professores.\n- Acesso exclusivo ao Painel do Admin, Manual de Operacionalização, Auditoria e gestão ampliada do suporte.\n\n2.2 Professor\n- Primeiro acesso com conta Google gera solicitação de aprovação.\n- O acesso somente é liberado após aprovação do Admin.\n- Estados possíveis: Pendente, Ativo, Bloqueado e Recusado.\n\n3. GESTÃO DE ACESSOS\n- Consultar solicitações pendentes.\n- Aprovar ou recusar novos professores.\n- Bloquear ou reativar acessos existentes.\n- Utilizar o UID do Firebase como referência principal do usuário.\n\n4. MOTOR FISCAL 2026.2\n- Escopo liberado: comércio para revenda, regime normal, ano de 2026.\n- CFOPs ativos: 1.102, 2.102, 5.102 e 6.102.\n- CST do cenário atual: 00.\n- Operações ST, devoluções, industrialização e uso/consumo permanecem bloqueadas.\n- Validações: CNPJ, IE SC/PR, NCM 8 dígitos, CFOP × operação × UF, valores, quantidades, descontos, acréscimos e pesos.\n- ICMS: 17% no cenário interno de SC; 12% ou 7% nas relações interestaduais contempladas.\n- IPI: 0% no cenário comercial de revenda atual.\n- PIS/COFINS: cenário não cumulativo adotado pela plataforma.\n- CBS: 0,90% em 2026, informativa.\n- IBS: 0,10% em 2026, informativo.\n- Emissão é bloqueada quando houver inconsistência estrutural ou tributária.\n\n5. DOCUMENTOS E HISTÓRICO\n- O Histórico operacional trabalha com documentos compatíveis com o Motor Fiscal vigente.\n- PDF individual: A4 retrato, baseado na própria visualização da NF-e.\n- Salvamento em bloco: seleção múltipla no Histórico.\n\n6. CABEÇALHOS\nExistem três modalidades por professor:\n- CEDUP Hermann Hering — institucional: modelo fixo da plataforma.\n- Personalizado: imagem própria do professor, limite de 600 KB.\n- Padrão do sistema: sem imagem institucional adicional.\nA preferência é individual, vinculada ao UID do professor e aplicada também aos PDFs.\n\n7. CENTRAL DE SUPORTE\n- Professores e Admin podem abrir chamados.\n- Status: Aberto, Em análise, Encaminhado e Encerrado.\n- Admin pode alterar status e excluir chamados quando necessário.\n\n8. AUDITORIA\nÁrea exclusiva do Admin. Deve ser utilizada para acompanhar eventos registrados, como acessos, alterações administrativas e demais ações instrumentadas pelo sistema.\n\n9. BACKUP\n- Ao sair, o sistema oferece backup opcional em JSON.\n- O Admin também dispõe de backup administrativo dos registros do Firestore.\n- Recomenda-se manter cópias periódicas antes de alterações relevantes.\n\n10. NAVEGAÇÃO\n- Desktop: menu fixo no cabeçalho.\n- Celular: menu lateral flutuante acionado pelo botão ☰ após o login.\n\n11. MANUAIS\n- Manual da Plataforma: disponível ao professor.\n- Manual de Operacionalização: exclusivo do Admin.\n- Ambos devem ser revisados sempre que uma funcionalidade alterar o fluxo operacional.\n\n12. PUBLICAÇÃO E CONTROLE DE QUALIDADE\n- A publicação ocorre pelo GitHub Pages.\n- O GitHub Actions executa testes fiscais antes do build.\n- Falha nos testes fiscais deve interromper a publicação até correção.\n\n13. CHECKLIST APÓS ATUALIZAÇÕES\n- Confirmar workflow verde.\n- Testar login Admin e Professor.\n- Testar aprovação de professor.\n- Gerar NF-e manual e automática.\n- Conferir bases e tributos.\n- Testar Histórico e PDF.\n- Testar as três opções de cabeçalho.\n- Testar Suporte, Auditoria e Backup.\n- Testar desktop e celular.\n\n14. SEGURANÇA\n- Não considerar localStorage como mecanismo suficiente de autorização administrativa.\n- Manter a autorização crítica vinculada ao Firebase/Firestore e ao UID do usuário.\n- Não excluir logs ou registros críticos sem necessidade administrativa e rastreabilidade.\n\n15. OBSERVAÇÃO\nA plataforma possui finalidade exclusivamente pedagógica. As NF-e simuladas não possuem validade fiscal.`;

function atualizarManualProfessor(){
  const manual=document.querySelector(".panel.manual");
  if(!manual||manual.dataset.manualCurrent==="2026.2")return;
  manual.innerHTML=manualProfessorHtml();
  manual.dataset.manualCurrent="2026.2";
}

async function migrarManualOperacional(){
  const perfil=localStorage.getItem("sfd_perfil_acesso");
  const admin=perfil==="admin"&&localStorage.getItem("sfd_admin_autorizado")==="1";
  if(!admin||!auth.currentUser)return;
  try{
    const ref=doc(db,"documentos",MANUAL_OPERACIONAL_ID);
    const snap=await getDoc(ref);
    const anterior=snap.exists()?String(snap.data()?.conteudo||"").trim():"";
    if(anterior.includes(MARCADOR))return;
    const preservado=anterior?`\n\nANEXO — CONTEÚDO ANTERIOR PRESERVADO\n${anterior}`:"";
    await setDoc(ref,{tipo:"manual_operacional",conteudo:MANUAL_OPERACIONAL_ATUAL+preservado,versao:"2026.2",atualizadoEm:new Date().toISOString(),atualizadoPor:auth.currentUser.email||""},{merge:true});
  }catch(e){console.error("Falha ao atualizar Manual de Operacionalização",e);}
}

function sincronizarEditorAdmin(){
  const ta=document.querySelector(".manual-admin-editor");
  if(!ta||ta.dataset.manualCurrent==="2026.2")return;
  if(!ta.value.includes(MARCADOR)){
    const anterior=ta.value.trim();
    ta.value=MANUAL_OPERACIONAL_ATUAL+(anterior?`\n\nANEXO — CONTEÚDO ANTERIOR PRESERVADO\n${anterior}`:"");
    ta.dispatchEvent(new Event("input",{bubbles:true}));
  }
  ta.dataset.manualCurrent="2026.2";
}

if(typeof window!=="undefined"){
  const sync=()=>{atualizarManualProfessor();sincronizarEditorAdmin();};
  new MutationObserver(sync).observe(document.body,{childList:true,subtree:true});
  onAuthStateChanged(auth,user=>{if(user){setTimeout(sync,300);setTimeout(migrarManualOperacional,600);}});
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",sync,{once:true});else sync();
}
