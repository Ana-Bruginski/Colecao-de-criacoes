/* ============================================================
   COMPORTAMENTO  app.js
   ============================================================ */

const parede = document.getElementById("parede");
const sala = document.getElementById("sala");
const perfil = document.getElementById("perfil");
const abas = document.getElementById("salas");
const rotuloObra = document.getElementById("rotuloObra");
const contagem = document.getElementById("contagem");

// as salas vem da lista do conteudo.js; qualquer sala usada numa obra
// e esquecida na lista entra no fim, para nenhuma obra ficar escondida
const LISTA = (typeof SALAS !== "undefined" ? SALAS : [])
  .map(s => typeof s === "string" ? {nome:s} : s);
[...new Set(OBRAS.map(o => o.sala))].forEach(nome => {
  if(!LISTA.some(s => s.nome === nome)) LISTA.push({nome});
});

let salaAtual = null;
let aberta = null;

function tela(src){
  return src
    ? `<div class="tela" style="background-image:url('${src}')" role="img" aria-label="Imagem da obra"></div>`
    : `<div class="tela vazia" data-rotulo="imagem"></div>`;
}

function desenharAbas(){
  abas.innerHTML = LISTA.map(s =>
    `<button role="tab" data-sala="${s.nome}" aria-selected="${s.nome === salaAtual}">${s.nome}</button>`).join("");
}

function desenharParede(){
  if(!salaAtual){
    parede.innerHTML = `<p class="convite">Escolha uma sala acima para ver o que tem nela.</p>`;
    contagem.textContent = OBRAS.length + " obras";
    return;
  }
  const lista = OBRAS.filter(o => o.sala === salaAtual);
  if(!lista.length){
    parede.innerHTML = `<p class="convite">Nada nesta sala ainda.</p>`;
    contagem.textContent = "0 obras";
    return;
  }
  parede.innerHTML = lista.map(o => `
    <button class="obra" data-n="${o.n}" aria-current="${o.n === aberta}">
      <div class="moldura">${tela(o.capa)}</div>
      <div class="cartela">
        <div class="n">Nº ${o.n}</div>
        <div class="t">${o.titulo}</div>
        <div class="s">${o.subtitulo}</div>
        <div class="f">${o.ficha}</div>
        <div class="mais">Ver</div>
      </div>
    </button>`).join("");
  contagem.textContent = lista.length + (lista.length === 1 ? " obra" : " obras");
}

function abrirSala(s){
  salaAtual = s;
  aberta = null;
  desenharAbas();
  desenharParede();
  const dados = LISTA.find(x => x.nome === s) || {nome:s};
  sala.innerHTML = `<p class="convite">${dados.nome}${
    dados.frase ? ", " + dados.frase : ""}. Escolha uma obra ao lado.</p>`;
  rotuloObra.textContent = s;
}

function abrirObra(n){
  const o = OBRAS.find(x => x.n === n);
  if(!o) return;
  aberta = n;
  rotuloObra.textContent = "Nº " + o.n;
  sala.innerHTML = `
    <div class="destaque"><div class="moldura">${tela(o.capa)}</div></div>
    <h1>${o.titulo}</h1>
    <div class="meta">${o.subtitulo}<br>${o.ficha}</div>
    <div class="texto">${o.texto.map(p => `<p>${p}</p>`).join("")}</div>
    <div class="extras">${(o.extras||[]).map(src =>
      `<div class="moldura">${tela(src)}</div>`).join("")}</div>`;
  desenharParede();
  if(window.matchMedia("(max-width:860px)").matches){
    sala.scrollIntoView({behavior:"smooth", block:"start"});
  }
}

abas.addEventListener("click", e => {
  const alvo = e.target.closest("button");
  if(alvo) abrirSala(alvo.dataset.sala);
});

parede.addEventListener("click", e => {
  const alvo = e.target.closest(".obra");
  if(alvo) abrirObra(alvo.dataset.n);
});

perfil.addEventListener("click", e => {
  const alvo = e.target.closest("button[data-sala]");
  if(alvo) abrirSala(alvo.dataset.sala);
});

perfil.innerHTML =
  `<div class="bloco">${PERFIL.texto.map(p => `<p>${p}</p>`).join("")}</div>` +
  `<div class="bloco"><h2>Salas</h2><div class="indice">` +
    LISTA.map(s => `<button data-sala="${s.nome}"><span>${s.nome}</span><span>${
      OBRAS.filter(o => o.sala === s.nome).length}</span></button>`).join("") +
  `</div></div>` +
  `<div class="bloco"><h2>Onde me achar</h2><div class="contatos">` +
    PERFIL.contatos.map(c =>
      `<div><span>${c.onde}</span><a href="${c.link}">${c.rotulo}</a></div>`).join("") +
  `</div></div>`;

desenharAbas();
desenharParede();
sala.innerHTML = `<p class="convite">Nenhuma sala aberta ainda.</p>`;