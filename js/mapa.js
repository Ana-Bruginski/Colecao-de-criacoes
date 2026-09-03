/* ============================================================
   MAPA  planta baixa do museu

   Serve para pular direto de uma sala para outra sem passar pelo
   saguão (briefing 3.2). É desenhada a partir do JSON: sala nova
   entra na planta sozinha, sem tocar em código.
   ============================================================ */

var Mapa = (function(){
"use strict";

/*  museu    objeto inteiro de museu.json
    opcoes   idioma, salaAtual, aoEscolher(id), aoFechar()  */
function abrir(museu, opcoes){
  opcoes = opcoes || {};
  var idioma = opcoes.idioma || "pt";

  var raiz = document.createElement("div");
  raiz.className = "mapa";
  raiz.setAttribute("role", "dialog");
  raiz.setAttribute("aria-modal", "true");
  raiz.setAttribute("aria-label", I18N.t("planta"));

  var folha = document.createElement("div");
  folha.className = "mapa-folha";

  var titulo = document.createElement("h2");
  titulo.className = "mapa-titulo";
  titulo.textContent = I18N.t("planta");

  var legenda = document.createElement("p");
  legenda.className = "mapa-legenda";
  legenda.textContent = (museu.museu && museu.museu.titulo) || "";

  folha.appendChild(titulo);
  folha.appendChild(legenda);

  var planta = document.createElement("div");
  planta.className = "mapa-planta";

  var salas = museu.salas || [];

  salas.forEach(function(sala){
    var quantas = Espaco.obrasDe(sala).length;
    var fechada = quantas === 0;

    var comodo = document.createElement("button");
    comodo.type = "button";
    comodo.className = "comodo" + (fechada ? " comodo--fechado" : "");
    comodo.dataset.parede = Espaco.paredeDe(sala);
    comodo.dataset.sala = sala.id;
    comodo.disabled = fechada;
    if(opcoes.salaAtual === sala.id) comodo.setAttribute("aria-current", "true");

    var nome = document.createElement("span");
    nome.className = "comodo-nome";
    nome.textContent = Espaco.nome(sala, idioma);

    var conta = document.createElement("span");
    conta.className = "comodo-conta";
    conta.textContent = I18N.contagem(quantas);

    comodo.appendChild(nome);
    comodo.appendChild(conta);
    planta.appendChild(comodo);
  });

  /* o saguão é o átrio: ocupa a largura toda embaixo da planta */
  var atrio = document.createElement("button");
  atrio.type = "button";
  atrio.className = "comodo comodo--saguao";
  atrio.dataset.sala = "";

  var nomeAtrio = document.createElement("span");
  nomeAtrio.className = "comodo-nome";
  nomeAtrio.textContent = I18N.t("saguao");

  var contaAtrio = document.createElement("span");
  contaAtrio.className = "comodo-conta";
  contaAtrio.textContent = I18N.t("entrada");

  atrio.appendChild(nomeAtrio);
  atrio.appendChild(contaAtrio);
  planta.appendChild(atrio);

  folha.appendChild(planta);

  var fechar = document.createElement("button");
  fechar.type = "button";
  fechar.className = "mapa-fechar";
  fechar.textContent = I18N.t("fechar");
  folha.appendChild(fechar);

  raiz.appendChild(folha);

  /* ---------- ligações ---------- */

  function pedirFechar(){
    if(typeof opcoes.aoFechar === "function") opcoes.aoFechar();
  }

  planta.addEventListener("click", function(e){
    var alvo = e.target.closest ? e.target.closest(".comodo") : null;
    if(!alvo || alvo.disabled) return;
    if(typeof opcoes.aoEscolher === "function") opcoes.aoEscolher(alvo.dataset.sala);
  });

  fechar.addEventListener("click", pedirFechar);
  raiz.addEventListener("click", function(e){
    if(e.target === raiz) pedirFechar();
  });

  return {
    el: raiz,
    focar: function(){
      var primeiro = planta.querySelector(".comodo:not([disabled])");
      if(primeiro) primeiro.focus({preventScroll:true});
    }
  };
}

return { abrir: abrir };

})();
