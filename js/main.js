/* ============================================================
   MAIN  carrega o JSON, monta o saguão, roteia por hash e
         controla o estado e as transições de câmera

   A seção 6 do briefing não prevê um saguao.js, então o saguão
   mora aqui: ele é a tela de entrada e é onde as transições
   nascem, que é justamente o que este arquivo controla.

   Trocar de tela nunca é um fade. Entrar numa sala é a câmera
   avançar em direção ao portal até ele ocupar a tela; sair é o
   recuo, voltando ao saguão a partir daquele mesmo portal.
   ============================================================ */

(function(){
"use strict";

var CAMINHO = "dados/museu.json";

var CURVA    = "cubic-bezier(.22,.61,.36,1)";
var T_ENTRAR = 900;   /* briefing 7 */
var T_SAIR   = 700;
var T_REDUZ  = 200;   /* cross-fade quando o movimento é reduzido */

var semMovimento = window.matchMedia("(prefers-reduced-motion: reduce)");
var telaPequena  = window.matchMedia("(max-width: 760px)");

var elMuseu = document.getElementById("museu");
var elAviso = document.getElementById("aviso-vivo");

var museu    = null;
var estado   = {tela:"saguao", salaId:null, obra:null};
var saguao   = null;   /* {el, portalDe(id), medir()} */
var salaViva = null;
var obraViva = null;
var mapaVivo = null;
var ocupado  = false;
var ignorar  = false;

/* ============================================================
   carga
   ============================================================ */

fetch(CAMINHO, {cache:"no-cache"})
  .then(function(r){
    if(!r.ok) throw new Error("HTTP " + r.status);
    return r.json();
  })
  .then(function(dados){
    museu = dados;
    iniciar();
  })
  .catch(recado);

function iniciar(){
  window.addEventListener("hashchange", function(){
    if(ignorar) return;
    aplicar(lerRota());
  });
  document.addEventListener("keydown", naTecla);
  telaPequena.addEventListener("change", function(){
    if(saguao) saguao.reposicionar();
  });
  aplicar(lerRota(), true);
}

/* ============================================================
   quando o museu é aberto direto do disco
   ============================================================ */

/* fetch de JSON não funciona em file://. em vez de tela preta,
   uma placa explicando o que fazer. no GitHub Pages isto nunca
   aparece, porque lá existe servidor. */
function recado(erro){
  var doDisco = location.protocol === "file:";

  var painel = document.createElement("div");
  painel.className = "recado";

  var placa = document.createElement("div");
  placa.className = "recado-placa";

  var h = document.createElement("h1");
  h.textContent = doDisco ? "O museu está fechado para visita direta"
                          : "Não consegui ler o acervo";

  var p1 = document.createElement("p");
  p1.textContent = doDisco
    ? "Todo o acervo mora em dados/museu.json, e o navegador não deixa uma página aberta do disco ler um arquivo JSON. Suba um servidor local na pasta do projeto:"
    : "O arquivo dados/museu.json não pôde ser carregado. Confira se ele existe e se o JSON é válido.";

  placa.appendChild(h);
  placa.appendChild(p1);

  var cmd = document.createElement("code");
  cmd.textContent = doDisco ? "py -m http.server 8000"
                            : String(erro && erro.message ? erro.message : erro);
  placa.appendChild(cmd);

  if(doDisco){
    var p2 = document.createElement("p");
    p2.textContent = "Depois abra http://localhost:8000. No PyCharm ou no IntelliJ, o botão de abrir no navegador já serve o arquivo sozinho. Publicado no GitHub Pages, nada disso é necessário.";
    placa.appendChild(p2);
  }

  var ass = document.createElement("p");
  ass.className = "assinatura";
  ass.textContent = "Coleção de Criações";
  placa.appendChild(ass);

  painel.appendChild(placa);
  document.body.appendChild(painel);

  console.warn("Coleção de Criações: falha ao carregar " + CAMINHO + ".", erro);
}

/* ============================================================
   rota
   ============================================================ */

/*  #/                      saguão
    #/sala/:id              sala
    #/sala/:id/obra/:n      obra aberta (n começa em 1)  */
function lerRota(){
  var cru = decodeURIComponent(location.hash || "").replace(/^#\/?/, "");
  var p = cru.split("/").filter(Boolean);

  if(p[0] === "sala" && p[1] && acharSala(p[1])){
    var sala = acharSala(p[1]);
    if(p[2] === "obra" && p[3]){
      var n = parseInt(p[3], 10) - 1;
      var total = Espaco.obrasDe(sala).length;
      if(n >= 0 && n < total) return {tela:"obra", salaId:sala.id, obra:n};
    }
    return {tela:"sala", salaId:sala.id, obra:null};
  }
  return {tela:"saguao", salaId:null, obra:null};
}

function escreverHash(h){
  if(location.hash === h) return;
  ignorar = true;
  location.hash = h;
  window.setTimeout(function(){ ignorar = false; }, 0);
}

function irPara(h){
  if(ocupado) return;
  if(location.hash === h) aplicar(lerRota());
  else location.hash = h;
}

function rotaSala(id){ return "#/sala/" + encodeURIComponent(id); }
function rotaObra(id, i){ return rotaSala(id) + "/obra/" + (i + 1); }

function acharSala(id){
  var salas = (museu && museu.salas) || [];
  for(var i = 0; i < salas.length; i++) if(salas[i].id === id) return salas[i];
  return null;
}

/* ============================================================
   saguão
   ============================================================ */

function montarSaguao(){
  var idioma = I18N.idioma();
  var cabeca = museu.museu || {};

  /* a sala neutra: mesma linguagem de todas as outras. o token de
     parede sai do elemento para o gesso do saguão poder valer. */
  var raiz = Espaco.montarSala(
    {id:"saguao", parede:"areia", moldura:"dourada-fina", obras:[]},
    {idioma:idioma, semPlaca:true}
  );
  raiz.removeAttribute("data-parede");
  raiz.classList.add("saguao");

  var fundo = raiz.querySelector(".plano--fundo");

  /* --- conteúdo: texto de parede e portais --- */

  var conteudo = document.createElement("div");
  conteudo.className = "saguao-conteudo";

  var texto = document.createElement("div");
  texto.className = "saguao-texto";

  var h1 = document.createElement("h1");
  h1.textContent = cabeca.titulo || "Coleção de Criações";
  texto.appendChild(h1);

  if(cabeca.autora){
    var autora = document.createElement("p");
    autora.className = "saguao-autora";
    autora.textContent = cabeca.autora;
    texto.appendChild(autora);
  }

  var abertura = idioma === "en" && cabeca.abertura_en
    ? cabeca.abertura_en
    : (cabeca.abertura_pt || cabeca.abertura_en || "");
  if(abertura){
    var p = document.createElement("p");
    p.className = "saguao-abertura";
    p.textContent = abertura;
    texto.appendChild(p);
  }
  conteudo.appendChild(texto);

  /* --- os portais --- */

  var salas = museu.salas || [];
  var portais = document.createElement("div");
  portais.className = "portais";
  /* o CSS reparte a largura da parede entre as portas: sala nova no
     JSON estreita todas em vez de transbordar da tela */
  raiz.style.setProperty("--n-salas", Math.max(1, salas.length));
  var meio = (salas.length - 1) / 2;

  salas.forEach(function(sala, i){
    var quantas = Espaco.obrasDe(sala).length;
    var fechada = quantas === 0;

    var portal = document.createElement("button");
    portal.type = "button";
    /* a espessura visível é a jamba que aponta de volta para o
       olho: à esquerda do visitante aparece a jamba esquerda */
    var lado = i < meio ? "portal--esq" : i > meio ? "portal--dir" : "portal--meio";
    portal.className = "portal " + lado + (fechada ? " portal--fechado" : "");
    portal.dataset.parede = Espaco.paredeDe(sala);
    portal.dataset.sala = sala.id;
    portal.disabled = fechada;
    portal.setAttribute("aria-label",
      Espaco.nome(sala, idioma) + ". " +
      (fechada ? I18N.t("salaFechada") : I18N.t("entrarNaSala")));

    var placa = document.createElement("span");
    placa.className = "portal-placa";

    var nome = document.createElement("span");
    nome.className = "portal-nome";
    nome.textContent = Espaco.nome(sala, idioma);

    var conta = document.createElement("span");
    conta.className = "portal-conta";
    conta.textContent = I18N.contagem(quantas);

    placa.appendChild(nome);
    placa.appendChild(conta);

    /* O vão é um buraco com espessura: o fundo dele é o miolo da
       parede cortada, e por cima vêm a jamba (a face lateral que
       aponta para o olho), a verga e a soleira. O interior fica
       dentro de um recorte trapezoidal — é a convergência dele que
       diz "isto é fundo", e não uma sombra pintada de lado. */
    var vao = document.createElement("span");
    vao.className = "portal-vao";

    var interior = elemento("span", "portal-interior");
    interior.appendChild(elemento("span", "portal-parede"));
    interior.appendChild(elemento("span", "portal-piso"));

    /* Vislumbre: a primeira obra daquela sala, com a moldura dela.
       A moldura fica nítida — é ela que diz "tem um quadro ali" —
       e só a imagem dentro é que sai de foco. */
    if(!fechada){
      var primeira = Espaco.obrasDe(sala)[0];
      var vitrine = elemento("span", "portal-obra");
      vitrine.className += " moldura-" + Espaco.molduraDaObra(primeira, sala);

      var telinha = elemento("span", "portal-tela");
      var imgs = Espaco.imagensDe(primeira);
      if(imgs[0]){
        var img = document.createElement("img");
        img.src = imgs[0].src;
        img.alt = "";
        img.loading = "lazy";
        img.decoding = "async";
        telinha.appendChild(img);
      }
      vitrine.appendChild(telinha);
      interior.appendChild(vitrine);
    }

    vao.appendChild(interior);
    vao.appendChild(elemento("span", "portal-verga"));
    vao.appendChild(elemento("span", "portal-jamba"));
    vao.appendChild(elemento("span", "portal-soleira"));

    portal.appendChild(placa);
    portal.appendChild(vao);
    portal.appendChild(elemento("span", "portal-luz"));
    portais.appendChild(portal);
  });

  conteudo.appendChild(portais);

  /* --- rodapé --- */

  var rodape = document.createElement("div");
  rodape.className = "saguao-rodape";
  (cabeca.links || []).forEach(function(link){
    if(!link || !link.url) return;
    var a = document.createElement("a");
    a.href = link.url;
    a.textContent = link.rotulo || link.url;
    if(link.url.indexOf("mailto:") !== 0){
      a.target = "_blank";
      a.rel = "noopener noreferrer";
    }
    rodape.appendChild(a);
  });
  if(cabeca.cidade){
    var cidade = document.createElement("span");
    cidade.textContent = cabeca.cidade;
    rodape.appendChild(cidade);
  }
  /* o rodapé é de tela, não de parede: fica no pé do viewport nos
     dois formatos, e por isso não entra no conteúdo que migra */
  raiz.appendChild(rodape);

  /* --- alternador de idioma, no canto superior --- */

  var idiomaBt = document.createElement("button");
  idiomaBt.type = "button";
  idiomaBt.className = "idioma";
  idiomaBt.setAttribute("aria-label", I18N.t("idioma"));
  pintarIdioma(idiomaBt);
  idiomaBt.addEventListener("click", function(){
    I18N.alternar();
    aplicar(lerRota(), true);
  });
  raiz.appendChild(idiomaBt);

  /* --- posicionamento: na parede no desktop, em coluna no celular --- */

  /* No desktop o conteúdo fica no plano da parede e o rodapé é de
     tela. No celular a coluna rola, e um rodapé flutuando por cima
     dela cortaria os portais — ali ele fecha a coluna. */
  function reposicionar(){
    if(telaPequena.matches){
      if(conteudo.parentNode !== raiz) raiz.appendChild(conteudo);
      if(rodape.parentNode !== conteudo) conteudo.appendChild(rodape);
    } else {
      if(conteudo.parentNode !== fundo) fundo.appendChild(conteudo);
      if(rodape.parentNode !== raiz) raiz.appendChild(rodape);
    }
    medir();
  }

  /* A parede do saguão é sempre a largura da tela: o saguão não se
     percorre, as portas é que se repartem nela. Medir a fileira
     aqui criaria laço, porque agora ela é 100% da parede. */
  function medir(){
    raiz.style.removeProperty("--largura-parede");
  }

  reposicionar();
  window.addEventListener("resize", medir);

  /* --- entrar numa sala --- */

  portais.addEventListener("click", function(e){
    var alvo = e.target.closest ? e.target.closest(".portal") : null;
    if(!alvo || alvo.disabled) return;
    irPara(rotaSala(alvo.dataset.sala));
  });

  return {
    el: raiz,
    reposicionar: reposicionar,
    destruir: function(){ window.removeEventListener("resize", medir); },
    portalDe: function(id){
      return portais.querySelector('.portal[data-sala="' + CSS.escape(String(id)) + '"] .portal-vao');
    },
    focarPortal: function(id){
      var p = portais.querySelector('.portal[data-sala="' + CSS.escape(String(id)) + '"]');
      if(p && !p.disabled) p.focus({preventScroll:true});
    }
  };
}

function pintarIdioma(bt){
  bt.textContent = "";
  ["pt","en"].forEach(function(cod, i){
    var el = document.createElement(I18N.idioma() === cod ? "b" : "span");
    el.textContent = cod.toUpperCase();
    bt.appendChild(el);
    if(i === 0) bt.appendChild(document.createTextNode("/"));
  });
}

function elemento(tag, classe){
  var el = document.createElement(tag);
  el.className = classe;
  return el;
}

/* ============================================================
   transições de câmera
   ============================================================ */

/* Fecha uma transição uma vez só, pelo que vier primeiro: o evento
   da animação ou um prazo de guarda. Numa aba de fundo o navegador
   estrangula o timeline e o "finish" pode nunca chegar — sem esta
   guarda a visita ficaria travada em "ocupado" ao voltar para a aba. */
function aoFim(anim, duracao, fn){
  var feito = false;
  function uma(){
    if(feito) return;
    feito = true;
    fn();
  }
  if(anim){
    anim.addEventListener("finish", uma);
    if(anim.finished && anim.finished.then){
      anim.finished.then(uma, function(){});
    }
  }
  window.setTimeout(uma, duracao + 90);
}

/* A escala de saída é modesta de propósito. Escalar até 3,1x é
   pedir 9,6x de ÁREA rasterizada, e a cena tem preserve-3d: cada
   plano é redesenhado a cada quadro em vez de ser só transformado.
   1,7x custa 2,9x de área — um terço do trabalho — e como a tela
   está desaparecendo ao mesmo tempo, ninguém vê a diferença. */
var ESCALA_SAIDA = 1.7;

/* promove a camada só durante a transição: mantido depois, obriga o
   navegador a guardar cenas inteiras em memória de camada */
function promoverTransicao(el, ligar){
  if(!el) return;
  el.style.willChange = ligar ? "transform, opacity" : "";
}

/* o alvo cresce até ocupar a tela e o saguão avança por cima dele:
   é um avanço, não um fade (briefing 3.1) */
function avancar(entrando, saindo, deRect, duracao, aoTerminar){
  if(semMovimento.matches || !deRect){
    crossFade(entrando, saindo, aoTerminar);
    return;
  }

  var cx = deRect.left + deRect.width / 2;
  var cy = deRect.top + deRect.height / 2;
  var escala = Math.max(deRect.width / window.innerWidth,
                        deRect.height / window.innerHeight);

  promoverTransicao(entrando, true);
  promoverTransicao(saindo, true);

  entrando.style.transformOrigin = cx + "px " + cy + "px";
  var a = entrando.animate([
    {transform:"scale(" + escala + ")", opacity:0},
    {transform:"none", opacity:1}
  ], {duration:duracao, easing:CURVA, fill:"both"});

  if(saindo){
    saindo.style.transformOrigin = cx + "px " + cy + "px";
    saindo.animate([
      {transform:"none", opacity:1},
      {transform:"scale(" + ESCALA_SAIDA + ")", opacity:0}
    ], {duration:duracao, easing:CURVA, fill:"both"});
  }

  aoFim(a, duracao, function(){
    entrando.style.transformOrigin = "";
    promoverTransicao(entrando, false);
    if(saindo && saindo.parentNode) saindo.remove();
    if(aoTerminar) aoTerminar();
  });
}

/* o inverso: a tela que sai encolhe de volta para dentro do portal */
function recuar(entrando, saindo, paraRect, duracao, aoTerminar){
  if(semMovimento.matches || !paraRect){
    crossFade(entrando, saindo, aoTerminar);
    return;
  }

  var cx = paraRect.left + paraRect.width / 2;
  var cy = paraRect.top + paraRect.height / 2;
  var escala = Math.max(paraRect.width / window.innerWidth,
                        paraRect.height / window.innerHeight);

  promoverTransicao(entrando, true);
  promoverTransicao(saindo, true);

  entrando.style.transformOrigin = cx + "px " + cy + "px";
  var a = entrando.animate([
    {transform:"scale(" + ESCALA_SAIDA + ")", opacity:0},
    {transform:"none", opacity:1}
  ], {duration:duracao, easing:CURVA, fill:"both"});

  if(saindo){
    saindo.style.transformOrigin = cx + "px " + cy + "px";
    saindo.animate([
      {transform:"none", opacity:1},
      {transform:"scale(" + escala + ")", opacity:0}
    ], {duration:duracao, easing:CURVA, fill:"both"});
  }

  aoFim(a, duracao, function(){
    entrando.style.transformOrigin = "";
    promoverTransicao(entrando, false);
    if(saindo && saindo.parentNode) saindo.remove();
    if(aoTerminar) aoTerminar();
  });
}

/* Sala para sala é um deslize lateral, não um avanço de câmera.
   O avanço é o gesto de ENTRAR — atravessar um portal do saguão.
   Andar de uma sala à vizinha é caminhar de lado pelo museu, e
   com a mesma animação das duas coisas a diferença some. */
function deslizar(entrando, saindo, direcao, duracao, aoTerminar){
  if(semMovimento.matches){
    crossFade(entrando, saindo, aoTerminar);
    return;
  }

  var w = window.innerWidth;
  promoverTransicao(entrando, true);
  promoverTransicao(saindo, true);

  var a = entrando.animate([
    {transform:"translateX(" + (direcao * w) + "px)"},
    {transform:"none"}
  ], {duration:duracao, easing:CURVA, fill:"both"});

  if(saindo){
    saindo.animate([
      {transform:"none"},
      {transform:"translateX(" + (-direcao * w) + "px)"}
    ], {duration:duracao, easing:CURVA, fill:"both"});
  }

  aoFim(a, duracao, function(){
    promoverTransicao(entrando, false);
    if(saindo && saindo.parentNode) saindo.remove();
    if(aoTerminar) aoTerminar();
  });
}

/* prefers-reduced-motion: todo avanço vira cross-fade curto */
function crossFade(entrando, saindo, aoTerminar){
  var a = entrando.animate([{opacity:0},{opacity:1}],
    {duration:T_REDUZ, easing:"linear", fill:"both"});
  if(saindo){
    saindo.animate([{opacity:1},{opacity:0}],
      {duration:T_REDUZ, easing:"linear", fill:"both"});
  }
  aoFim(a, T_REDUZ, function(){
    if(saindo && saindo.parentNode) saindo.remove();
    if(aoTerminar) aoTerminar();
  });
}

/* ============================================================
   montagem de cada tela
   ============================================================ */

function limparSala(){
  if(salaViva){ salaViva.destruir(); if(salaViva.el.parentNode) salaViva.el.remove(); }
  salaViva = null;
}

function limparSaguao(){
  if(saguao){ saguao.destruir(); if(saguao.el.parentNode) saguao.el.remove(); }
  saguao = null;
}

function limparObra(){
  if(obraViva && obraViva.el.parentNode) obraViva.el.remove();
  obraViva = null;
}

function fecharMapa(devolverFoco){
  if(!mapaVivo) return;
  if(mapaVivo.el.parentNode) mapaVivo.el.remove();
  mapaVivo = null;
  if(devolverFoco && salaViva) salaViva.focar();
}

/* a sala ao lado, na ordem em que o JSON as declara; salas em
   montagem são puladas, porque não há o que visitar nelas */
function salaVizinha(sala, direcao){
  var salas = (museu && museu.salas) || [];
  var i = salas.indexOf(sala);
  if(i < 0) return null;
  for(var j = i + direcao; j >= 0 && j < salas.length; j += direcao){
    if(Espaco.obrasDe(salas[j]).length > 0){
      return {id: salas[j].id, nome: Espaco.nome(salas[j], I18N.idioma())};
    }
  }
  return null;
}

function criarSala(sala, foco){
  return Sala.montar(sala, {
    idioma: I18N.idioma(),
    foco: foco,
    salaAnterior: salaVizinha(sala, -1),
    salaProxima:  salaVizinha(sala, +1),
    aoAbrirObra:  function(i){ irPara(rotaObra(sala.id, i)); },
    aoTrocarSala: function(id){ irPara(rotaSala(id)); },
    aoSaguao:     function(){ irPara("#/"); },
    aoMapa:       function(){ abrirMapa(sala.id); }
  });
}

function abrirMapa(salaAtual){
  if(mapaVivo) return;
  mapaVivo = Mapa.abrir(museu, {
    idioma: I18N.idioma(),
    salaAtual: salaAtual,
    aoEscolher: function(id){
      fecharMapa(false);
      irPara(id ? rotaSala(id) : "#/");
    },
    aoFechar: function(){ fecharMapa(true); }
  });
  document.body.appendChild(mapaVivo.el);
  mapaVivo.focar();
}

/* ============================================================
   a obra: FLIP da parede para o primeiro plano
   ============================================================ */

function abrirObra(sala, i){
  var obras = Espaco.obrasDe(sala);
  var obra = obras[i];
  if(!obra || !salaViva) return;

  /* a moldura precisa ser medida antes de a sala desfocar */
  salaViva.irParaObra(i, true);
  var naParede = salaViva.quadroDe(i);
  var deRect = naParede ? naParede.getBoundingClientRect() : null;
  var naObra = salaViva.obraDe(i);

  function vizinha(n){
    return obras[n] ? {obra: obras[n], moldura: Espaco.molduraDaObra(obras[n], sala)} : null;
  }

  obraViva = Obra.abrir(obra, {
    idioma:  I18N.idioma(),
    moldura: Espaco.molduraDaObra(obra, sala),
    parede:  Espaco.paredeDe(sala),
    indice:  i,
    total:   obras.length,
    /* as vizinhas espiam pelas bordas da tela */
    anterior: vizinha(i - 1),
    proxima:  vizinha(i + 1),
    aoFechar: function(){ irPara(rotaSala(sala.id)); },
    aoTrocar: function(n){ irPara(rotaObra(sala.id, n)); }
  });

  elMuseu.appendChild(obraViva.el);
  if(naObra) naObra.classList.add("viajando");
  salaViva.recuar(true);

  ocupado = true;
  obraViva.voar(deRect, Obra.T_ABRIR, function(){
    ocupado = false;
  });
  obraViva.mostrarFicha();
  obraViva.ficha.focus({preventScroll:true});
}

function fecharObra(sala, i, aoTerminar){
  if(!obraViva){ if(aoTerminar) aoTerminar(); return; }

  /* mede o destino com a sala fora do desfoque, senão o quadro
     volta para uma posição borrada e o voo perde o alvo */
  if(salaViva){
    salaViva.el.classList.add("sem-transicao");
    salaViva.recuar(false);
  }
  var naParede = salaViva ? salaViva.quadroDe(i) : null;
  var paraRect = naParede ? naParede.getBoundingClientRect() : null;
  if(salaViva){
    void salaViva.el.offsetWidth;
    salaViva.el.classList.remove("sem-transicao");
  }

  var naObra = salaViva ? salaViva.obraDe(i) : null;
  var saindo = obraViva;
  obraViva = null;
  ocupado = true;

  saindo.devolver(paraRect, function(){
    if(saindo.el.parentNode) saindo.el.remove();
    if(naObra){
      naObra.classList.remove("viajando");
      naObra.focus({preventScroll:true});
    }
    ocupado = false;
    if(aoTerminar) aoTerminar();
  });
}

/* ============================================================
   aplicar uma rota
   ============================================================ */

function aplicar(rota, semTransicao){
  if(!museu) return;
  fecharMapa(false);

  var de = estado.tela;
  var sala = rota.salaId ? acharSala(rota.salaId) : null;

  /* --- entrada direta por link, ou remontagem por troca de idioma --- */
  if(semTransicao){
    limparObra(); limparSala(); limparSaguao();
    elMuseu.replaceChildren();

    if(rota.tela === "saguao"){
      saguao = montarSaguao();
      elMuseu.appendChild(saguao.el);
    } else if(sala){
      salaViva = criarSala(sala, rota.obra || 0);
      elMuseu.appendChild(salaViva.el);
      if(rota.tela === "obra"){
        /* espera o layout assentar para o FLIP medir a moldura na
           parede; o prazo é a rede para aba estrangulada, onde o
           requestAnimationFrame não roda */
        var abriu = false;
        var abrirUmaVez = function(){
          if(abriu || !salaViva) return;
          abriu = true;
          abrirObra(sala, rota.obra);
        };
        window.requestAnimationFrame(function(){
          window.requestAnimationFrame(abrirUmaVez);
        });
        window.setTimeout(abrirUmaVez, 90);
      }
    }
    estado = {tela:rota.tela, salaId:rota.salaId, obra:rota.obra};
    anunciarTela();
    return;
  }

  /* --- saguão -> sala: a câmera avança para dentro do portal --- */
  if(de === "saguao" && rota.tela === "sala" && sala){
    var portal = saguao ? saguao.portalDe(sala.id) : null;
    var rect = portal ? portal.getBoundingClientRect() : null;
    var saindoSaguao = saguao ? saguao.el : null;
    if(saguao) saguao.destruir();
    saguao = null;

    salaViva = criarSala(sala, 0);
    elMuseu.appendChild(salaViva.el);
    estado = {tela:"sala", salaId:sala.id, obra:null};

    ocupado = true;
    avancar(salaViva.el, saindoSaguao, rect, T_ENTRAR, function(){
      ocupado = false;
      salaViva.medir();
      salaViva.focar();
    });
    anunciarTela();
    return;
  }

  /* --- sala -> saguão: recuo até o portal daquela sala --- */
  if(de === "sala" && rota.tela === "saguao"){
    var anterior = estado.salaId;
    var saindoSala = salaViva ? salaViva.el : null;
    if(salaViva) salaViva.destruir();
    salaViva = null;

    saguao = montarSaguao();
    elMuseu.insertBefore(saguao.el, elMuseu.firstChild);
    estado = {tela:"saguao", salaId:null, obra:null};

    var alvo = saguao.portalDe(anterior);
    var rectVolta = alvo ? alvo.getBoundingClientRect() : null;

    ocupado = true;
    recuar(saguao.el, saindoSala, rectVolta, T_SAIR, function(){
      ocupado = false;
      saguao.focarPortal(anterior);
    });
    anunciarTela();
    return;
  }

  /* --- sala -> obra --- */
  if(de === "sala" && rota.tela === "obra" && sala){
    estado = {tela:"obra", salaId:sala.id, obra:rota.obra};
    abrirObra(sala, rota.obra);
    anunciarTela();
    return;
  }

  /* --- obra -> sala --- */
  if(de === "obra" && rota.tela === "sala" && sala){
    var iAntes = estado.obra;

    /* Se a sala de destino for OUTRA — veio do mapa, ou de um link
       colado —, fechar a obra não basta: a parede atrás continuaria
       sendo a da sala anterior. Devolve a obra à parede de onde ela
       saiu e só então troca de sala. */
    if(estado.salaId !== sala.id){
      var salaOrigem = acharSala(estado.salaId);
      estado.tela = "sala";
      fecharObra(salaOrigem, iAntes, function(){
        aplicar({tela:"sala", salaId:sala.id, obra:null});
      });
      return;
    }

    estado = {tela:"sala", salaId:sala.id, obra:null};
    fecharObra(sala, iAntes);
    anunciarTela();
    return;
  }

  /* --- obra -> obra vizinha: a ficha troca, a sala nem se mexe --- */
  if(de === "obra" && rota.tela === "obra" && sala){
    var iVelho = estado.obra;
    estado = {tela:"obra", salaId:sala.id, obra:rota.obra};
    fecharObra(sala, iVelho, function(){
      abrirObra(sala, rota.obra);
    });
    anunciarTela();
    return;
  }

  /* --- obra -> saguão: fecha a obra e recua --- */
  if(de === "obra" && rota.tela === "saguao"){
    var iSaindo = estado.obra;
    var salaAtual = acharSala(estado.salaId);
    estado.tela = "sala";
    fecharObra(salaAtual, iSaindo, function(){
      aplicar({tela:"saguao", salaId:null, obra:null});
    });
    return;
  }

  /* --- sala -> outra sala: deslize lateral, no sentido do museu --- */
  if(de === "sala" && rota.tela === "sala" && sala){
    if(estado.salaId === sala.id) return;

    /* a sala vem da direita se estiver depois desta no JSON, e da
       esquerda se estiver antes: o museu ganha uma ordem espacial */
    var salas = museu.salas || [];
    var iVelha = salas.findIndex(function(s){ return s.id === estado.salaId; });
    var iNova  = salas.indexOf(sala);
    var direcao = (iNova > iVelha) ? 1 : -1;

    var velha = salaViva ? salaViva.el : null;
    if(salaViva) salaViva.destruir();

    salaViva = criarSala(sala, 0);
    elMuseu.appendChild(salaViva.el);
    estado = {tela:"sala", salaId:sala.id, obra:null};

    ocupado = true;
    deslizar(salaViva.el, velha, direcao, T_SAIR, function(){
      ocupado = false;
      salaViva.medir();
      salaViva.focar();
    });
    anunciarTela();
    return;
  }

  /* qualquer combinação não prevista remonta do zero */
  aplicar(rota, true);
}

/* ============================================================
   teclado
   ============================================================ */

function naTecla(e){
  if(e.key === "Escape"){
    if(mapaVivo){ fecharMapa(true); return; }
    if(estado.tela === "obra"){ irPara(rotaSala(estado.salaId)); return; }
    if(estado.tela === "sala"){ irPara("#/"); return; }
    return;
  }

  if(mapaVivo) return;

  if(estado.tela === "obra" && obraViva){
    obraViva.naTecla(e);
    return;
  }

  if(estado.tela === "sala" && salaViva){
    salaViva.naTecla(e);
  }
}

/* ============================================================
   anúncio para leitor de tela
   ============================================================ */

function anunciarTela(){
  var titulo = (museu.museu && museu.museu.titulo) || "Coleção de Criações";
  var sala = estado.salaId ? acharSala(estado.salaId) : null;
  var texto;

  if(estado.tela === "saguao"){
    texto = I18N.t("saguao") + ", " + titulo;
    document.title = titulo + " — " + ((museu.museu && museu.museu.autora) || "");
  } else if(estado.tela === "sala" && sala){
    texto = Espaco.nome(sala, I18N.idioma());
    document.title = texto + " — " + titulo;
  } else if(estado.tela === "obra" && sala){
    var obra = Espaco.obrasDe(sala)[estado.obra];
    texto = Espaco.texto(obra, "titulo", I18N.idioma());
    document.title = texto + " — " + titulo;
  }

  if(elAviso && texto) elAviso.textContent = texto;
  escreverHash(
    estado.tela === "saguao" ? "#/" :
    estado.tela === "sala"   ? rotaSala(estado.salaId) :
                               rotaObra(estado.salaId, estado.obra)
  );
}

})();
