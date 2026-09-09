import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import cedupLogo from "./assets/cedup_logo.png";

const A4={w:210,h:297,m:14,header:13,footer:11};
const area={x:A4.m,y:A4.m+A4.header,w:A4.w-(A4.m*2),h:A4.h-(A4.m*2)-A4.header-A4.footer};

function carregarImagem(src){
  return new Promise((resolve,reject)=>{
    const img=new Image();
    img.crossOrigin="anonymous";
    img.onload=()=>resolve(img);
    img.onerror=reject;
    img.src=src;
  });
}

function desenharCabecalhoRodape(pdf,pagina,total,logoData){
  pdf.setDrawColor(190,210,201);
  pdf.setLineWidth(.25);
  if(logoData) pdf.addImage(logoData,"PNG",A4.m,A4.m-1,22,9);
  pdf.setFont("helvetica","bold");
  pdf.setFontSize(8.5);
  pdf.setTextColor(30,79,65);
  pdf.text("Manual da Plataforma - Simulador Fiscal Didático",A4.m+27,A4.m+5);
  pdf.line(A4.m,A4.m+10,A4.w-A4.m,A4.m+10);
  pdf.line(A4.m,A4.h-A4.m-8,A4.w-A4.m,A4.h-A4.m-8);
  pdf.setFont("helvetica","normal");
  pdf.setFontSize(7.5);
  pdf.setTextColor(95,110,104);
  pdf.text("© 2026 Jorge Lima Cardoso · CEDUP Hermann Hering",A4.m,A4.h-A4.m-3);
  pdf.text(`Página ${pagina} de ${total}`,A4.w-A4.m,A4.h-A4.m-3,{align:"right"});
}

function criarFolhaOculta(conteudo,classe=""){
  const host=document.createElement("div");
  host.className=`manual-pdf-host ${classe}`;
  host.style.cssText="position:fixed;left:-20000px;top:0;width:794px;background:#fff;z-index:-9999;";
  host.appendChild(conteudo);
  document.body.appendChild(host);
  return host;
}

async function capturarElemento(el){
  await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
  const canvas=await html2canvas(el,{scale:2,useCORS:true,backgroundColor:"#ffffff",logging:false,windowWidth:794});
  return canvas;
}

function adicionarCanvas(pdf,canvas){
  const img=canvas.toDataURL("image/jpeg",.94);
  const ratio=canvas.width/canvas.height;
  let w=area.w;
  let h=w/ratio;
  if(h>area.h){h=area.h;w=h*ratio;}
  const x=area.x+(area.w-w)/2;
  const y=area.y+(area.h-h)/2;
  pdf.addImage(img,"JPEG",x,y,w,h,undefined,"FAST");
}

async function gerarManualPdf(){
  const manual=document.querySelector(".panel.manual");
  if(!manual) throw new Error("Manual não encontrado");

  const pdf=new jsPDF({orientation:"portrait",unit:"mm",format:"a4",compress:true});
  const logo=await carregarImagem(cedupLogo);
  const logoCanvas=document.createElement("canvas");
  logoCanvas.width=logo.naturalWidth||logo.width;
  logoCanvas.height=logo.naturalHeight||logo.height;
  logoCanvas.getContext("2d").drawImage(logo,0,0);
  const logoData=logoCanvas.toDataURL("image/png");

  // Capa produzida diretamente no PDF - sem dependência da caixa de impressão do navegador.
  pdf.setFillColor(246,250,248);pdf.rect(0,0,A4.w,A4.h,"F");
  pdf.setFillColor(224,240,233);pdf.circle(184,270,54,"F");
  pdf.addImage(logoData,"PNG",20,22,48,25);
  pdf.setFont("helvetica","bold");pdf.setTextColor(22,71,59);pdf.setFontSize(15);pdf.text("CEDUP HERMANN HERING",76,31);
  pdf.setFont("helvetica","normal");pdf.setFontSize(10);pdf.text("Blumenau/SC",76,38);pdf.text("Curso Técnico em Administração e Contabilidade",76,44);
  pdf.setFont("helvetica","bold");pdf.setTextColor(31,122,92);pdf.setFontSize(10);pdf.text("P L A T A F O R M A   D I D Á T I C A",20,108);
  pdf.setTextColor(18,63,49);pdf.setFontSize(30);pdf.text("Manual da Plataforma",20,128);
  pdf.setTextColor(26,121,93);pdf.setFontSize(22);pdf.text("Simulador Fiscal Didático",20,142);
  pdf.setFont("helvetica","normal");pdf.setTextColor(80,99,91);pdf.setFontSize(11);pdf.text("Guia de utilização destinado ao professor.",20,154);
  pdf.setDrawColor(190,215,205);pdf.line(20,262,190,262);
  pdf.setFontSize(9);pdf.text("Documento de apoio pedagógico",20,272);
  pdf.setFont("helvetica","bold");pdf.text("Blumenau/SC · 2026",190,272,{align:"right"});

  // Página de apresentação e sumário.
  pdf.addPage();
  const intro=document.createElement("div");
  intro.className="manual-pdf-sheet manual-pdf-intro";
  const titulo=manual.querySelector(":scope > h2")?.cloneNode(true);
  const desc=manual.querySelector(":scope > p")?.cloneNode(true);
  const toc=manual.querySelector(".manual-toc")?.cloneNode(true);
  if(titulo)intro.appendChild(titulo);if(desc)intro.appendChild(desc);if(toc)intro.appendChild(toc);
  const hostIntro=criarFolhaOculta(intro);
  const canvasIntro=await capturarElemento(intro);
  adicionarCanvas(pdf,canvasIntro);
  hostIntro.remove();

  const secoes=[...manual.querySelectorAll(".manual-section")];
  for(const secao of secoes){
    pdf.addPage();
    const clone=secao.cloneNode(true);
    clone.removeAttribute("id");
    clone.classList.add("manual-pdf-sheet","manual-pdf-section");
    const host=criarFolhaOculta(clone);
    // Garante que imagens estejam carregadas antes da captura.
    await Promise.all([...clone.querySelectorAll("img")].map(img=>img.complete?Promise.resolve():new Promise(r=>{img.onload=r;img.onerror=r;})));
    const canvas=await capturarElemento(clone);
    adicionarCanvas(pdf,canvas);
    host.remove();
  }

  // Página final com aviso de uso, se houver.
  const aviso=manual.querySelector(":scope > .notice");
  if(aviso){
    const ultima=pdf.getNumberOfPages();
    const clone=aviso.cloneNode(true);
    clone.classList.add("manual-pdf-final-note");
    const host=criarFolhaOculta(clone);
    const canvas=await capturarElemento(clone);
    host.remove();
    pdf.setPage(ultima);
    const img=canvas.toDataURL("image/jpeg",.94);
    const w=area.w;const h=Math.min(24,w*(canvas.height/canvas.width));
    pdf.addImage(img,"JPEG",area.x,A4.h-A4.m-A4.footer-h-3,w,h,undefined,"FAST");
  }

  const total=pdf.getNumberOfPages();
  for(let p=2;p<=total;p++){pdf.setPage(p);desenharCabecalhoRodape(pdf,p,total,logoData);}
  return pdf;
}

async function baixarManual(button){
  const original=button.textContent;button.disabled=true;button.textContent="Gerando PDF...";
  try{const pdf=await gerarManualPdf();pdf.save("Manual_Simulador_Fiscal_Didatico_CEDUP.pdf");}
  catch(e){console.error(e);alert("Não foi possível gerar o Manual em PDF. Tente novamente.");}
  finally{button.disabled=false;button.textContent=original;}
}

async function imprimirManual(button){
  const original=button.textContent;button.disabled=true;button.textContent="Preparando impressão...";
  try{
    const pdf=await gerarManualPdf();
    const url=URL.createObjectURL(pdf.output("blob"));
    const win=window.open(url,"_blank");
    if(!win) alert("O navegador bloqueou a abertura do PDF. Permita pop-ups para imprimir o manual.");
    setTimeout(()=>URL.revokeObjectURL(url),120000);
  }catch(e){console.error(e);alert("Não foi possível preparar o Manual para impressão.");}
  finally{button.disabled=false;button.textContent=original;}
}

function instalarBotoesManual(){
  const manual=document.querySelector(".panel.manual");
  if(!manual||manual.querySelector(".manual-print-actions"))return;
  const actions=document.createElement("div");actions.className="manual-print-actions";
  const texto=document.createElement("div");texto.className="manual-print-help";
  texto.innerHTML='<strong>PDF institucional do Manual</strong><span>Geração direta em A4, sem cabeçalhos/rodapés do navegador, com capa, sumário, páginas organizadas e imagens preservadas.</span>';
  const botoes=document.createElement("div");botoes.className="manual-print-buttons";
  const salvar=document.createElement("button");salvar.type="button";salvar.className="primary manual-print-button";salvar.textContent="Salvar PDF";salvar.onclick=()=>baixarManual(salvar);
  const imprimir=document.createElement("button");imprimir.type="button";imprimir.className="secondary manual-print-button";imprimir.textContent="Abrir para imprimir";imprimir.onclick=()=>imprimirManual(imprimir);
  botoes.append(salvar,imprimir);actions.append(texto,botoes);
  const titulo=manual.querySelector(":scope > h2");if(titulo)titulo.insertAdjacentElement("afterend",actions);else manual.prepend(actions);
}

if(typeof window!=="undefined"){
  const iniciar=()=>{instalarBotoesManual();const observer=new MutationObserver(instalarBotoesManual);observer.observe(document.body,{childList:true,subtree:true});};
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",iniciar,{once:true});else iniciar();
}
