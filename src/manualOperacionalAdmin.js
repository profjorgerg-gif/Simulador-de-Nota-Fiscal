import { auth } from "./firebase";

const PERFIL_ADMIN = "admin";

function ehAdmin() {
  return localStorage.getItem("sfd_perfil_acesso") === PERFIL_ADMIN &&
    localStorage.getItem("sfd_admin_autorizado") === "1";
}

const MANUAL = `MANUAL DE OPERACIONALIZAÇÃO DO SISTEMA
SIMULADOR FISCAL DIDÁTICO — CEDUP HERMANN HERING
Versão administrativa — 2026

1. FINALIDADE DO MANUAL
Este Manual de Operacionalização estabelece os procedimentos de administração, acompanhamento, manutenção operacional e continuidade do Simulador Fiscal Didático. O documento é destinado exclusivamente ao perfil Admin e não deve ser disponibilizado nos menus dos demais perfis.

2. FINALIDADE DO SISTEMA
O Simulador Fiscal Didático é uma plataforma educacional destinada à simulação de operações fiscais de compra e venda de mercadorias, emissão de NF-e simuladas, aplicação didática de tributos, consulta ao histórico das operações e geração de documentos para atividades pedagógicas. Os documentos emitidos não possuem validade fiscal.

3. PERFIS DE ACESSO
3.1 Professor
Perfil destinado à utilização pedagógica do simulador, emissão e consulta das operações disponibilizadas no sistema.

3.2 Admin
Perfil administrativo com acesso às funções de gestão do sistema. O acesso ao Manual de Operacionalização é exclusivo do Admin.

4. AUTENTICAÇÃO E ACESSO ADMINISTRATIVO
O acesso ao sistema utiliza autenticação por conta Google por meio do Firebase Authentication. Para acessar as funções administrativas, o usuário deve selecionar o perfil Admin e cumprir a validação administrativa definida na tela de entrada.

Recomendações:
- não compartilhar credenciais de acesso;
- encerrar a sessão ao finalizar o uso em equipamentos compartilhados;
- manter o código/credencial administrativa restrito aos responsáveis autorizados;
- revisar periodicamente os mecanismos de acesso administrativo.

5. PAINEL DO ADMIN
O Painel do Admin concentra as funções administrativas da plataforma. Entre as funções disponíveis estão:
- Manual de Operacionalização;
- Manual do Professor;
- Central de Suporte;
- Backup do Sistema;
- indicadores resumidos de documentos e chamados;
- demais ferramentas administrativas incorporadas ao sistema.

6. MANUAL DE OPERACIONALIZAÇÃO
O Manual de Operacionalização deve permanecer disponível somente no Painel do Admin. Sua finalidade é orientar a administração da plataforma e registrar os procedimentos necessários à continuidade operacional.

O Admin deve revisar o manual sempre que houver alteração relevante em funcionalidades, fluxos, segurança, armazenamento, emissão de documentos, suporte ou backup.

7. MANUAL DO PROFESSOR
O Painel do Admin permite acesso ao Manual do Professor para conferência e acompanhamento das orientações destinadas ao uso pedagógico. Alterações relevantes no funcionamento da plataforma devem ser refletidas também no material destinado aos professores, quando aplicável.

8. EMISSÃO MANUAL DE NF-e SIMULADA
Na emissão manual, o usuário informa os dados necessários à operação e aos documentos fiscais simulados.

Procedimento geral:
1. selecionar Preenchimento manual;
2. definir a operação de Entrada ou Saída;
3. preencher os dados do emitente e destinatário/remetente;
4. informar natureza da operação e CFOP;
5. cadastrar os produtos e respectivas informações fiscais;
6. conferir quantidades, valores unitários e totais;
7. revisar bases de cálculo e tributos;
8. conferir transporte e informações adicionais, quando aplicáveis;
9. gerar a NF-e simulada;
10. conferir a visualização antes de salvar ou imprimir.

9. EMISSÃO AUTOMÁTICA EM LOTE
A emissão automática permite gerar múltiplas NF-e simuladas para utilização pedagógica.

O usuário deve selecionar a quantidade de documentos e o tipo de operação desejada. O sistema gera dados simulados e registra os documentos no histórico. Após a geração, recomenda-se conferir uma amostra das notas para verificar coerência de CFOP, valores, produtos e tributação.

10. TRIBUTAÇÃO E TRANSIÇÃO 2026
No contexto didático de 2026, a plataforma apresenta os tributos do sistema atual e também IBS e CBS para demonstração da transição da Reforma Tributária.

Em 2026, IBS e CBS podem ser destacados na NF-e simulada com base de cálculo, alíquota e valor, porém não integram o total contábil didático da operação quando o regime de transição estiver configurado dessa forma. A parametrização deverá ser revisada nos exercícios seguintes conforme o cronograma tributário adotado pelo projeto.

11. CFOP E NATUREZA DA OPERAÇÃO
O CFOP deve ser compatível com a operação de Entrada ou Saída. O sistema apresenta opções de CFOP conforme o tipo de operação selecionado. Antes da utilização pedagógica, o Admin deve verificar se as opções cadastradas continuam adequadas aos cenários trabalhados no curso.

12. HISTÓRICO DE DOCUMENTOS
As NF-e simuladas geradas são registradas no histórico para consulta e operações posteriores.

No histórico, conforme as funções disponíveis, é possível:
- localizar documentos emitidos;
- visualizar a NF-e simulada;
- selecionar documentos;
- salvar documentos individualmente;
- realizar salvamento em bloco;
- acompanhar as operações geradas na plataforma.

13. PDF E IMPRESSÃO
A NF-e simulada deve ser exportada em PDF A4 retrato, procurando preservar o mesmo padrão visual apresentado na tela. O documento deve ser ajustado para folha única quando tecnicamente possível dentro do modelo definido.

Padrão de nomenclatura:
- NF_ENTRADA_[número da nota].pdf
- NF_SAIDA_[número da nota].pdf

No salvamento em bloco, os arquivos selecionados são reunidos para download mantendo a identificação individual das notas.

14. CABEÇALHO INSTITUCIONAL
Quando disponível, o cabeçalho institucional pode ser configurado para aparecer na documentação simulada. Antes de alterar o cabeçalho, conferir legibilidade, proporção e tamanho do arquivo. Após salvar, realizar teste de visualização e geração em PDF.

15. MENU E NAVEGAÇÃO
Em computadores, as funções principais podem ser acessadas pelos controles de navegação da plataforma. Em dispositivos móveis, o menu flutuante permanece recolhido e deve abrir somente mediante acionamento do botão correspondente, evitando sobreposição permanente sobre o conteúdo.

Após alterações de interface, testar obrigatoriamente em resolução de computador e celular.

16. CENTRAL DE SUPORTE
A Central de Suporte registra ocorrências relacionadas ao funcionamento do sistema e ao uso pedagógico.

Os chamados podem ser classificados, acompanhados e atualizados pelos estados:
- Aberto;
- Em análise;
- Encaminhado;
- Encerrado.

Procedimento recomendado:
1. registrar título objetivo;
2. selecionar a categoria adequada;
3. descrever o problema e o comportamento esperado;
4. analisar a ocorrência;
5. atualizar o status durante o atendimento;
6. registrar a solução adotada;
7. encerrar o chamado após validação.

O Admin pode excluir registros quando necessário, observando a confirmação apresentada pelo sistema.

17. BACKUP DO SISTEMA
O backup é uma rotina de continuidade operacional e deve ser realizado periodicamente, especialmente antes de alterações relevantes no sistema.

O Painel do Admin permite baixar uma cópia dos registros armazenados pelo mecanismo de backup administrativo. O sistema também pode oferecer backup opcional no processo de saída.

Recomendações:
- realizar backup antes de grandes atualizações;
- manter cópias em local seguro;
- identificar os arquivos pela data;
- evitar substituir a única cópia existente;
- realizar verificações periódicas da integridade dos arquivos gerados.

18. FIREBASE E PERSISTÊNCIA DE DADOS
A plataforma utiliza serviços Firebase para autenticação e persistência dos registros. Alterações nas regras de acesso ou na estrutura dos documentos devem ser realizadas com cautela, pois podem bloquear funcionalidades da aplicação ou expor informações indevidamente.

Após qualquer alteração relacionada ao Firebase:
1. testar login;
2. testar gravação e leitura de documentos;
3. testar histórico;
4. testar cabeçalho/configurações;
5. testar Central de Suporte;
6. verificar o console do navegador em caso de erro.

19. PUBLICAÇÃO E ATUALIZAÇÕES
A aplicação é publicada por processo automatizado de implantação. Após uma atualização do código, o Admin deve verificar se o processo de publicação foi concluído com sucesso antes de considerar a versão disponível aos usuários.

Checklist pós-atualização:
- página inicial abre corretamente;
- autenticação Google funciona;
- perfis são apresentados corretamente;
- Painel do Admin permanece restrito;
- emissão manual funciona;
- emissão automática funciona;
- histórico carrega os registros;
- PDF é gerado corretamente;
- menu móvel funciona;
- backup funciona;
- Central de Suporte funciona;
- manuais podem ser acessados pelos perfis autorizados.

20. TRATAMENTO DE FALHAS
Quando ocorrer erro após uma atualização:
1. identificar a funcionalidade afetada;
2. verificar se o problema ocorre em mais de um dispositivo;
3. atualizar a página e testar novamente;
4. verificar o processo de publicação da versão;
5. consultar os registros de erro do build quando a publicação falhar;
6. corrigir a causa identificada;
7. publicar nova versão;
8. executar novamente o checklist operacional.

21. SEGURANÇA OPERACIONAL
O Admin deve preservar a integridade do ambiente e limitar as funções administrativas aos usuários autorizados. Dados de autenticação, códigos administrativos e informações internas não devem constar em documentos públicos, manuais de professor ou telas acessíveis a usuários comuns.

22. ROTINA RECOMENDADA DO ADMIN
Antes das atividades:
- verificar acesso à plataforma;
- conferir disponibilidade das funções principais;
- verificar chamados pendentes relevantes.

Periodicamente:
- realizar backup;
- revisar chamados;
- conferir histórico e armazenamento;
- revisar manuais após alterações do sistema.

Antes de atualizações relevantes:
- realizar backup;
- registrar o objetivo da alteração;
- verificar impacto nas funções existentes.

Após atualizações:
- confirmar publicação;
- executar checklist funcional;
- validar computador e celular;
- registrar eventuais inconsistências na Central de Suporte.

23. CONTINUIDADE DO SISTEMA
O sistema deve ser mantido de forma que as atualizações não eliminem funcionalidades já homologadas. Novos recursos devem ser incorporados preservando, sempre que possível, compatibilidade com dados existentes, histórico, autenticação, PDFs e rotinas de backup.

24. IDENTIFICAÇÃO
Sistema: Simulador Fiscal Didático
Instituição de referência: CEDUP Hermann Hering
Finalidade: exclusivamente pedagógica
Ano-base deste manual: 2026

© 2026 Jorge Lima Cardoso. Todos os direitos reservados.
Plataforma didática desenvolvida para o CEDUP Hermann Hering — Curso Técnico em Administração e Contabilidade.`;

function esc(s = "") {
  return String(s).replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));
}

function imprimir() {
  if (!ehAdmin()) return;
  const w = window.open("", "_blank");
  if (!w) return window.alert("Permita pop-ups para imprimir o manual.");
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Manual de Operacionalização</title><style>body{font-family:Arial,sans-serif;color:#1d2a26;margin:15mm;line-height:1.5}h1{color:#17473b}pre{font-family:Arial,sans-serif;white-space:pre-wrap;font-size:11pt;line-height:1.5}@media print{body{margin:12mm}}</style></head><body><h1>Manual de Operacionalização do Sistema</h1><pre>${esc(MANUAL)}</pre></body></html>`);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 250);
}

function abrirManual() {
  if (!auth.currentUser || !ehAdmin()) {
    window.alert("Manual de Operacionalização disponível exclusivamente para o Admin.");
    return;
  }
  document.querySelector(".admin-support-page")?.remove();
  const el = document.createElement("section");
  el.className = "admin-support-page manual-operacional-exclusivo";
  el.innerHTML = `<header class="asp-head"><div><span class="asp-kicker">ACESSO EXCLUSIVO DO ADMIN</span><h1>Manual de Operacionalização</h1><p>Procedimentos administrativos e operacionais do Simulador Fiscal Didático.</p></div><button class="asp-close" aria-label="Fechar">×</button></header><main class="asp-main"><div class="manual-admin-actions"><button data-manual-print>Imprimir / Salvar PDF</button><button data-manual-close>Voltar ao Admin</button></div><div style="max-width:1000px;background:#fff;border:1px solid #d7dfdc;border-radius:16px;padding:28px;margin-top:18px"><pre style="white-space:pre-wrap;font-family:inherit;line-height:1.6;margin:0">${esc(MANUAL)}</pre></div></main>`;
  document.body.appendChild(el);
  document.body.classList.add("admin-page-open");
  const fechar = () => { el.remove(); document.body.classList.remove("admin-page-open"); };
  el.querySelector(".asp-close").onclick = fechar;
  el.querySelector("[data-manual-close]").onclick = fechar;
  el.querySelector("[data-manual-print]").onclick = imprimir;
}

function instalar() {
  if (!ehAdmin()) return;
  document.querySelectorAll('[data-a="manual"]').forEach((b) => {
    if (b.dataset.manualCompleto === "1") return;
    b.dataset.manualCompleto = "1";
    b.onclick = abrirManual;
    const span = b.querySelector("span");
    if (span) span.textContent = "Consultar e imprimir o manual administrativo exclusivo do sistema.";
  });
}

if (typeof window !== "undefined") {
  window.SFD_abrirManualOperacionalAdmin = abrirManual;
  new MutationObserver(instalar).observe(document.body, { childList: true, subtree: true });
  setTimeout(instalar, 500);
}
