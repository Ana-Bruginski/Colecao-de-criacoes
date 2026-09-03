/* ============================================================
   I18N  alternância PT / EN

   Só a interface mora neste dicionário. O conteúdo do museu vem
   do JSON, onde os campos _en são opcionais: faltando, a sala
   aparece em português no modo EN, sem quebrar (briefing 5).

   A escolha fica no navegador de quem visita, não na URL: um
   link direto para uma sala funciona nos dois idiomas.
   ============================================================ */

var I18N = (function(){
"use strict";

var CHAVE = "colecao-de-criacoes:idioma";

var DICIONARIO = {
  pt:{
    saguao:        "Saguão",
    sair:          "Sair",
    mapa:          "Mapa",
    fechar:        "Fechar",
    planta:        "Planta do museu",
    entrada:       "Entrada",
    emMontagem:    "Em montagem",
    umaObra:       "1 obra",
    obras:         "obras",
    verProjeto:    "Ver projeto",
    anterior:      "Anterior",
    proxima:       "Próxima",
    obraAnterior:  "Obra anterior",
    obraProxima:   "Próxima obra",
    fotoAnterior:  "Foto anterior",
    fotoProxima:   "Próxima foto",
    de:            "de",
    parede:        "Parede",
    entrarNaSala:  "Entrar na sala",
    salaFechada:   "Sala em montagem, ainda sem obras",
    tecnica:       "Técnica",
    idioma:        "Idioma",
    semObras:      "Esta sala ainda está sendo montada.",
    voltarParede:  "Voltar à parede"
  },
  en:{
    saguao:        "Lobby",
    sair:          "Exit",
    mapa:          "Map",
    fechar:        "Close",
    planta:        "Museum floor plan",
    entrada:       "Entrance",
    emMontagem:    "Being installed",
    umaObra:       "1 work",
    obras:         "works",
    verProjeto:    "View project",
    anterior:      "Previous",
    proxima:       "Next",
    obraAnterior:  "Previous work",
    obraProxima:   "Next work",
    fotoAnterior:  "Previous photo",
    fotoProxima:   "Next photo",
    de:            "of",
    parede:        "Wall",
    entrarNaSala:  "Enter room",
    salaFechada:   "Room being installed, no works yet",
    tecnica:       "Medium",
    idioma:        "Language",
    semObras:      "This room is still being installed.",
    voltarParede:  "Back to the wall"
  }
};

var atual = ler();

function ler(){
  try{
    return window.localStorage.getItem(CHAVE) === "en" ? "en" : "pt";
  }catch(e){
    return "pt";
  }
}

function guardar(idioma){
  try{ window.localStorage.setItem(CHAVE, idioma); }catch(e){}
}

function idioma(){ return atual; }

function definir(novo){
  atual = novo === "en" ? "en" : "pt";
  guardar(atual);
  document.documentElement.lang = atual === "en" ? "en" : "pt-BR";
  return atual;
}

function alternar(){
  return definir(atual === "pt" ? "en" : "pt");
}

function t(chave){
  var tabela = DICIONARIO[atual] || DICIONARIO.pt;
  return tabela[chave] || DICIONARIO.pt[chave] || chave;
}

/* contagem de obras, já no idioma corrente */
function contagem(n){
  if(n === 0) return t("emMontagem");
  if(n === 1) return t("umaObra");
  return n + " " + t("obras");
}

definir(atual);

return {
  idioma:   idioma,
  definir:  definir,
  alternar: alternar,
  t:        t,
  contagem: contagem
};

})();
