/* ============================================================
   OBRA  abertura FLIP, ficha e carrossel

   FLIP: mede a moldura onde ela está na parede (First), monta a
   obra no lugar final (Last), inverte com um transform (Invert)
   e solta a animação até a identidade (Play). O quadro viaja —
   não pisca, não aparece por cima.

   As obras vizinhas aparecem cortadas pelas bordas da tela, como
   na referência: metade de cada uma fica de fora, e clicar leva
   até ela. É o que diz que a parede continua para os dois lados.
   ============================================================ */

var Obra = (function(){
"use strict";

var semMovimento = window.matchMedia("(prefers-reduced-motion: reduce)");

var CURVA = "cubic-bezier(.22,.61,.36,1)";
var T_ABRIR  = 600;   /* briefing 7 */
var T_FECHAR = 450;
var T_REDUZ  = 200;   /* cross-fade quando o movimento é reduzido */

/* Encerra o voo uma vez só, pelo que vier primeiro: o evento da
   animação ou um prazo de guarda. Numa aba de fundo o navegador
   estrangula o timeline e o "finish" pode não chegar — sem isto a
   obra ficaria a meio caminho da parede. */
function aoFim(anim, duracao, fn){
  var feito = false;
  function uma(){
    if(feito) return;
    feito = true;
    fn();
  }
  if(anim){
    anim.addEventListener("finish", uma);
    if(anim.finished && anim.finished.then) anim.finished.then(uma, function(){});
  }
  window.setTimeout(uma, duracao + 90);
}

/*  obra     objeto de museu.json
    opcoes   idioma, moldura, parede, indice, total,
             anterior / proxima  objetos das obras vizinhas
             aoFechar(), aoTrocar(indice)  */
function abrir(obra, opcoes){
  opcoes = opcoes || {};
  var idioma = opcoes.idioma || "pt";
  var imagens = Espaco.imagensDe(obra);
  var foto = 0;

  var raiz = document.createElement("div");
  raiz.className = "obra-aberta";
  /* a obra sai da sala mas não sai da paleta dela: o véu continua
     guardando um sopro da parede daquela sala */
  if(opcoes.parede) raiz.dataset.parede = opcoes.parede;
  raiz.setAttribute("role", "dialog");
  raiz.setAttribute("aria-modal", "true");
  raiz.setAttribute("aria-label", Espaco.texto(obra, "titulo", idioma));

  var veu = document.createElement("div");
  veu.className = "obra-veu";
  raiz.appendChild(veu);

  /* ---------- vizinhas cortadas pelas bordas ---------- */

  function montarVizinha(par, lado, destino){
    if(!par || !par.obra) return null;
    var vizinha = par.obra;
    var bt = document.createElement("button");
    bt.type = "button";
    bt.className = "obra-vizinha obra-vizinha--" + lado;
    bt.setAttribute("aria-label", Espaco.texto(vizinha, "titulo", idioma));

    var q = document.createElement("div");
    q.className = "quadro moldura-" + (par.moldura || opcoes.moldura);
    q.appendChild(Espaco.montarTela(vizinha, {idioma:idioma, presente:false}));
    bt.appendChild(q);

    bt.addEventListener("click", function(){
      if(typeof opcoes.aoTrocar === "function") opcoes.aoTrocar(destino);
    });
    raiz.appendChild(bt);
    return bt;
  }

  montarVizinha(opcoes.anterior, "esq", opcoes.indice - 1);
  montarVizinha(opcoes.proxima,  "dir", opcoes.indice + 1);

  /* ---------- palco: a moldura em primeiro plano ---------- */

  var palco = document.createElement("div");
  palco.className = "obra-palco";

  /* a caixa encolhe até a moldura, para o contador poder se
     encostar nela em vez de flutuar no meio da coluna */
  var caixa = document.createElement("div");
  caixa.className = "obra-moldura";

  var quadro = document.createElement("div");
  quadro.className = "quadro moldura-" + opcoes.moldura;

  var tela = Espaco.montarTela(obra, {idioma:idioma, presente:true});
  quadro.appendChild(tela);
  caixa.appendChild(quadro);

  /* --- carrossel entre as fotos da mesma obra --- */

  var contador = null;

  if(imagens.length > 1){
    contador = document.createElement("p");
    contador.className = "obra-contador";
    caixa.appendChild(contador);
  }
  palco.appendChild(caixa);
  raiz.appendChild(palco);

  function trocarFoto(i){
    if(imagens.length < 2) return;
    foto = (i + imagens.length) % imagens.length;
    var img = tela.querySelector("img");
    if(img){
      img.src = imagens[foto].src;
      img.alt = Espaco.texto(imagens[foto], "alt", idioma);
    }
    if(contador) contador.textContent = (foto + 1) + " / " + imagens.length;
  }
  if(contador) contador.textContent = "1 / " + imagens.length;

  /* setas de traço fino, nas bordas da tela: percorrem as fotos
     desta obra. Trocar de obra é clicar na vizinha ao lado. */
  var setaEsq = null, setaDir = null;
  if(imagens.length > 1){
    setaEsq = botao("obra-seta obra-seta--esq", "‹", I18N.t("fotoAnterior"));
    setaDir = botao("obra-seta obra-seta--dir", "›", I18N.t("fotoProxima"));
    setaEsq.addEventListener("click", function(){ trocarFoto(foto - 1); });
    setaDir.addEventListener("click", function(){ trocarFoto(foto + 1); });
    /* Encostadas na moldura, não nas bordas da tela: elas passam as
       fotos DESTA obra, e na borda a da direita caía em cima da obra
       vizinha — dois destinos diferentes no mesmo lugar. */
    caixa.appendChild(setaEsq);
    caixa.appendChild(setaDir);
  }

  /* swipe entre as fotos, no celular */
  var xToque = 0;
  palco.addEventListener("touchstart", function(e){
    if(e.touches.length === 1) xToque = e.touches[0].clientX;
  }, {passive:true});
  palco.addEventListener("touchend", function(e){
    if(imagens.length < 2 || !e.changedTouches.length) return;
    var d = e.changedTouches[0].clientX - xToque;
    if(Math.abs(d) > 44) trocarFoto(foto + (d < 0 ? 1 : -1));
  });

  /* ---------- ficha ---------- */

  var ficha = document.createElement("div");
  ficha.className = "ficha";
  ficha.tabIndex = -1;

  var h = document.createElement("h2");
  h.textContent = Espaco.texto(obra, "titulo", idioma);
  ficha.appendChild(h);

  if(obra.ano){
    var ano = document.createElement("p");
    ano.className = "ficha-ano";
    ano.textContent = obra.ano;
    ficha.appendChild(ano);
  }

  var tecnica = Espaco.texto(obra, "tecnica", idioma);
  if(tecnica){
    var pt = document.createElement("p");
    pt.className = "ficha-tecnica";
    pt.textContent = tecnica;
    ficha.appendChild(pt);
  }

  var descricao = Espaco.texto(obra, "descricao", idioma);
  if(descricao){
    var pd = document.createElement("p");
    pd.className = "ficha-descricao";
    pd.textContent = descricao;
    ficha.appendChild(pd);
  }

  if(obra.link && obra.link.url){
    var a = document.createElement("a");
    a.className = "ficha-link";
    a.href = obra.link.url;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.textContent = obra.link.rotulo || I18N.t("verProjeto");
    ficha.appendChild(a);
  }

  raiz.appendChild(ficha);

  /* ---------- cantos ---------- */

  var fechar = botao("obra-fechar", "← " + I18N.t("voltarParede"), null);
  raiz.appendChild(fechar);

  /* ---------- fechar: Esc, botão, clique fora ---------- */

  function pedirFechar(){
    if(typeof opcoes.aoFechar === "function") opcoes.aoFechar();
  }

  fechar.addEventListener("click", pedirFechar);
  raiz.addEventListener("click", function(e){
    /* clique fora = no véu ou no vazio do palco, nunca na obra */
    if(e.target === raiz || e.target === veu || e.target === palco) pedirFechar();
  });

  function naTecla(e){
    if(e.key === "ArrowRight"){
      e.preventDefault();
      if(imagens.length > 1) trocarFoto(foto + 1);
      else if(typeof opcoes.aoTrocar === "function" && opcoes.indice < opcoes.total - 1){
        opcoes.aoTrocar(opcoes.indice + 1);
      }
    } else if(e.key === "ArrowLeft"){
      e.preventDefault();
      if(imagens.length > 1) trocarFoto(foto - 1);
      else if(typeof opcoes.aoTrocar === "function" && opcoes.indice > 0){
        opcoes.aoTrocar(opcoes.indice - 1);
      }
    }
  }

  /* ---------- o voo ---------- */

  /* Recebe o retângulo de origem e leva o quadro dali até onde
     ele já está posicionado. */
  function voar(de, duracao, aoTerminar){
    var para = quadro.getBoundingClientRect();

    if(!de || !para.width || semMovimento.matches){
      raiz.animate([{opacity:0},{opacity:1}],
        {duration:T_REDUZ, easing:"linear", fill:"both"});
      if(aoTerminar) window.setTimeout(aoTerminar, T_REDUZ);
      return;
    }

    var escala = de.width / para.width;
    var dx = de.left - para.left;
    var dy = de.top - para.top;

    quadro.classList.add("obra-voando");

    var anim = quadro.animate([
      {transform:"translate(" + dx + "px," + dy + "px) scale(" + escala + ")"},
      {transform:"none"}
    ], {duration:duracao, easing:CURVA, fill:"both"});

    /* o resto da tela chega junto, mas mais rápido: o quadro é
       quem viaja, o véu só acompanha */
    veu.animate([{opacity:0},{opacity:1}],
      {duration:Math.round(duracao * 0.7), easing:CURVA, fill:"both"});

    aoFim(anim, duracao, function(){
      quadro.classList.remove("obra-voando");
      if(aoTerminar) aoTerminar();
    });
    return anim;
  }

  /* caminho inverso: a obra volta para o lugar dela na parede */
  function devolver(para, aoTerminar){
    var de = quadro.getBoundingClientRect();

    if(!para || !de.width || semMovimento.matches){
      var s = raiz.animate([{opacity:1},{opacity:0}],
        {duration:T_REDUZ, easing:"linear", fill:"both"});
      aoFim(s, T_REDUZ, function(){ if(aoTerminar) aoTerminar(); });
      return;
    }

    var escala = para.width / de.width;
    var dx = para.left - de.left;
    var dy = para.top - de.top;

    quadro.classList.add("obra-voando");
    ficha.classList.remove("visivel");

    var anim = quadro.animate([
      {transform:"none"},
      {transform:"translate(" + dx + "px," + dy + "px) scale(" + escala + ")"}
    ], {duration:T_FECHAR, easing:CURVA, fill:"both"});

    veu.animate([{opacity:1},{opacity:0}],
      {duration:T_FECHAR, easing:CURVA, fill:"both"});

    aoFim(anim, T_FECHAR, function(){ if(aoTerminar) aoTerminar(); });
  }

  function mostrarFicha(){
    /* dois quadros para a transição do CSS ter de onde partir;
       o prazo é a rede para quando a aba está estrangulada */
    window.requestAnimationFrame(function(){
      window.requestAnimationFrame(function(){ ficha.classList.add("visivel"); });
    });
    window.setTimeout(function(){ ficha.classList.add("visivel"); }, 120);
  }

  return {
    el:          raiz,
    ficha:       ficha,
    quadro:      quadro,
    voar:        voar,
    devolver:    devolver,
    mostrarFicha:mostrarFicha,
    naTecla:     naTecla,
    T_ABRIR:     T_ABRIR
  };
}

function botao(classe, texto, rotulo){
  var b = document.createElement("button");
  b.type = "button";
  if(classe) b.className = classe;
  b.textContent = texto;
  if(rotulo) b.setAttribute("aria-label", rotulo);
  return b;
}

return { abrir: abrir, T_ABRIR: T_ABRIR, T_FECHAR: T_FECHAR };

})();
