/* ============================================================
   SALA  layout da parede e navegação lateral

   Percorrer a parede é mover a câmera, não rolar uma lista: o
   que se desloca é a caixa 3D inteira, então paredes laterais,
   piso, teto e sombras acompanham sozinhos.

   `passo` é a posição da câmera ao longo da parede, e vai direto
   para o transform da caixa. Não passa por custom property: isso
   invalidaria o estilo da sala inteira a cada quadro.
   ============================================================ */

var Sala = (function(){
"use strict";

var semMovimento = window.matchMedia("(prefers-reduced-motion: reduce)");
var telaPequena  = window.matchMedia("(max-width: 760px)");

var ATRITO = 0.17;      /* quanto do caminho restante é vencido por quadro */
var PARADO = 0.4;       /* abaixo disto, chegou */

/* encerra uma animação uma vez só, pelo evento ou por prazo de
   guarda: em aba de fundo o navegador estrangula o timeline e o
   "finish" pode não chegar */
function aoFim(anim, duracao, fn){
  var feito = false;
  function uma(){ if(feito) return; feito = true; fn(); }
  if(anim){
    anim.addEventListener("finish", uma);
    if(anim.finished && anim.finished.then) anim.finished.then(uma, function(){});
  }
  window.setTimeout(uma, duracao + 90);
}

/*  sala     objeto de museu.json
    opcoes   idioma, aoAbrirObra(indice), aoSaguao(), aoMapa()  */
function montar(sala, opcoes){
  opcoes = opcoes || {};
  var idioma = opcoes.idioma || "pt";
  var obras = Espaco.obrasDe(sala);
  var paredes = Espaco.paredesDe(sala);

  /* qual parede mostrar: a que contém a obra em foco */
  var iParede = Espaco.ondeEsta(opcoes.foco || 0).parede;
  if(iParede >= paredes.length) iParede = 0;

  var raiz = Espaco.montarSala(sala, {
    idioma:     idioma,
    interativa: true,
    parede:     iParede,
    aoMedir:    function(){ medir(); }
  });

  var caixa    = raiz.querySelector(".caixa");
  var fileira  = raiz.querySelector(".obras");
  var fundo    = raiz.querySelector(".plano--fundo");
  var placa    = raiz.querySelector(".sala-plaqueta");

  /* sala sem nenhuma obra: placa no lugar da fileira (briefing 5) */
  if(obras.length === 0){
    var vazia = document.createElement("p");
    vazia.className = "sala-vazia";
    vazia.textContent = I18N.t("semObras");
    fundo.insertBefore(vazia, fileira);
  }

  /* ---------- interface de tela ---------- */

  var ui = document.createElement("div");
  ui.className = "sala-ui";

  var setaEsq = botao("seta seta--esq", "‹", I18N.t("obraAnterior"));
  var setaDir = botao("seta seta--dir", "›", I18N.t("obraProxima"));
  var bSaguao = botao("botao-canto botao-saguao", I18N.t("saguao"), null);
  var bMapa   = botao("botao-canto botao-mapa", I18N.t("mapa"), null);

  var conta = document.createElement("p");
  conta.className = "sala-conta";

  ui.appendChild(setaEsq);
  ui.appendChild(setaDir);
  ui.appendChild(bSaguao);
  ui.appendChild(bMapa);
  if(obras.length > 1) ui.appendChild(conta);

  /* Placas de orientação para a sala ao lado, nos cantos de cima.
     Museu sinaliza assim — "Galerias 12–15 →" — e assim elas não
     brigam com as setas que percorrem a parede, que ficam no meio
     da altura e servem para outra coisa. */
  function placaSala(vizinha, lado, marca){
    if(!vizinha) return;
    var b = document.createElement("button");
    b.type = "button";
    b.className = "botao-canto botao-sala botao-sala--" + lado;
    b.setAttribute("aria-label", I18N.t("entrarNaSala") + ": " + vizinha.nome);

    var m = document.createElement("span");
    m.className = "botao-sala-marca";
    m.textContent = marca;

    var n = document.createElement("span");
    n.textContent = vizinha.nome;

    if(lado === "esq"){ b.appendChild(m); b.appendChild(n); }
    else { b.appendChild(n); b.appendChild(m); }

    b.addEventListener("click", function(){
      if(typeof opcoes.aoTrocarSala === "function") opcoes.aoTrocarSala(vizinha.id);
    });
    ui.appendChild(b);
  }
  placaSala(opcoes.salaAnterior, "esq", "‹");
  placaSala(opcoes.salaProxima,  "dir", "›");

  raiz.appendChild(ui);

  /* No desktop a placa da sala fica pendurada junto da entrada, na
     parede, em perspectiva. No celular a câmera para em cada obra e
     a entrada sai de vista, então a identidade da sala teria sumido
     junto: ali ela migra para a interface e fica sempre visível. */
  function reposicionarPlaca(){
    if(!placa) return;
    var destino = telaPequena.matches ? ui : fundo;
    if(placa.parentNode !== destino) destino.appendChild(placa);
    placa.classList.toggle("sala-plaqueta--tela", telaPequena.matches);
  }
  reposicionarPlaca();
  telaPequena.addEventListener("change", reposicionarPlaca);

  /* ---------- estado do percurso ---------- */

  var passo = 0;      /* posição corrente da câmera */
  var alvo  = 0;      /* para onde ela está indo */
  var limite = 0;     /* quanto dá para andar para cada lado */
  var rodando = false;
  var vivo = true;

  function limitar(v){ return Math.max(-limite, Math.min(limite, v)); }

  /* Escreve direto no transform da caixa. Passar por uma custom
     property no elemento raiz invalidaria o estilo de toda a sala
     a cada quadro — 6,7ms contra 0,12ms, medido numa parede de
     3067px. A imagem é a mesma; o custo, não. */
  function aplicar(){
    caixa.style.transform = "translateX(" + (-passo).toFixed(2) + "px)";
  }

  /* a parede é tão larga quanto a fileira precisa; nunca menor que a tela */
  function medir(){
    if(!vivo) return;
    var tela = window.innerWidth;
    var precisa = fileira ? fileira.offsetWidth : 0;
    var largura = Math.max(tela, precisa);
    raiz.style.setProperty("--largura-parede", largura + "px");
    limite = Math.max(0, (largura - tela) / 2);

    /* Cada imagem que carrega revela sua proporção e alarga a
       parede, o que desloca todas as obras. Enquanto ninguém tiver
       mexido, a câmera se reaponta para a obra em foco — senão o
       enquadramento inicial escorrega e a primeira obra acaba
       cortada na borda. Depois do primeiro gesto, para: reenquadrar
       debaixo da mão de quem navega seria pior. */
    if(!tocado && obras.length){
      alvo = passo = limitar(posicaoDe(indice));
    } else {
      alvo = limitar(alvo);
      passo = limitar(passo);
    }
    aplicar();
    atualizarUI();
  }

  /* ---------- inércia ---------- */

  /* will-change só enquanto a câmera anda: mantido o tempo todo,
     ele obriga o navegador a guardar a parede inteira numa camada
     própria de memória, e a parede pode ter 3000px de largura. */
  function promover(sim){
    caixa.style.willChange = sim ? "transform" : "";
  }

  function quadro(){
    if(!vivo){ rodando = false; return; }
    passo += (alvo - passo) * ATRITO;
    if(Math.abs(alvo - passo) < PARADO){
      passo = alvo;
      rodando = false;
    }
    aplicar();
    if(rodando) window.requestAnimationFrame(quadro);
    else { promover(false); atualizarUI(); }
  }

  function irAte(valor, seco){
    alvo = limitar(valor);
    if(seco || semMovimento.matches){
      passo = alvo;
      aplicar();
      atualizarUI();
      return;
    }
    if(!rodando){
      rodando = true;
      promover(true);
      window.requestAnimationFrame(quadro);
    }
  }

  /* ---------- onde cada obra está na parede ---------- */

  /* posição da obra DENTRO da parede corrente (índice local) */
  function posicaoLocal(k){
    var el = fileira && fileira.children[k];
    if(!el || !fileira) return 0;
    var centro = el.offsetLeft + el.offsetWidth / 2;
    return centro - fileira.offsetWidth / 2;
  }

  /* deslocamento da câmera que deixa a obra global i no centro */
  function posicaoDe(i){
    return posicaoLocal(Espaco.ondeEsta(i).posicao);
  }

  /* A obra em foco é estado explícito, não dedução da posição da
     câmera. Nas pontas da parede a câmera trava antes de conseguir
     centralizar a primeira e a última obra; se o índice viesse da
     posição, a seta pareceria travada e o contador nunca chegaria
     a "1 de 6". As setas percorrem obras, não pixels. */
  var indice = 0;
  var trocandoParede = false;
  var tocado = false;   /* alguém já navegou? então pare de reenquadrar */

  function maisPerto(){
    if(obras.length === 0) return -1;
    var base = iParede * Espaco.MAX_OBRAS;
    var melhor = base, menor = Infinity;
    for(var k = 0; k < (fileira ? fileira.children.length : 0); k++){
      var d = Math.abs(posicaoLocal(k) - passo);
      if(d < menor){ menor = d; melhor = base + k; }
    }
    return melhor;
  }

  function indiceAtual(){ return indice; }

  function irParaObra(i, seco){
    if(obras.length === 0) return;
    if(!seco) tocado = true;
    var alvoI = Math.max(0, Math.min(obras.length - 1, i));
    var destino = Espaco.ondeEsta(alvoI).parede;

    /* a obra pedida está em outra parede da mesma sala: em vez de
       rolar para o nada, a câmera anda até a parede seguinte */
    if(destino !== iParede){
      trocarParede(destino, alvoI, seco);
      return;
    }

    indice = alvoI;
    /* o contador e as setas respondem ao gesto, não ao fim da
       inércia: quem clica precisa ver a mudança na hora */
    atualizarUI();
    irAte(posicaoDe(indice), seco);
  }

  /* ---------- trocar de parede dentro da mesma sala ---------- */

  /* A sala é a mesma; quem se vira é quem visita. A caixa inteira
     desliza para fora, a fileira é trocada, e a caixa volta pelo
     outro lado — paredes, piso e teto acompanham, porque quem anda
     é a câmera e não as imagens. */
  function trocarParede(destino, focoGlobal, seco){
    if(trocandoParede || destino === iParede) return;
    var dir = destino > iParede ? 1 : -1;

    function assumir(){
      iParede = destino;
      var nova = Espaco.montarParede(sala, iParede, {
        idioma:     idioma,
        interativa: true,
        aoMedir:    function(){ medir(); }
      });
      fileira.replaceWith(nova);
      fileira = nova;
      indice = Math.max(0, Math.min(obras.length - 1, focoGlobal));
      medir();
      passo = alvo = limitar(posicaoDe(indice));
      aplicar();
      atualizarUI();
    }

    if(seco || semMovimento.matches){ assumir(); return; }

    trocandoParede = true;
    promover(true);
    var largura = window.innerWidth;

    var saida = caixa.animate([
      {transform:"translateX(" + (-passo) + "px)"},
      {transform:"translateX(" + (-passo - dir * largura * 0.6) + "px)"}
    ], {duration:300, easing:"cubic-bezier(.5,0,1,1)", fill:"both"});

    aoFim(saida, 300, function(){
      assumir();
      var entrada = caixa.animate([
        {transform:"translateX(" + (-passo + dir * largura * 0.6) + "px)"},
        {transform:"translateX(" + (-passo) + "px)"}
      ], {duration:420, easing:"cubic-bezier(.22,.61,.36,1)", fill:"both"});
      aoFim(entrada, 420, function(){
        saida.cancel();
        entrada.cancel();
        aplicar();
        promover(false);
        trocandoParede = false;
        focar();
      });
    });
  }

  function atualizarUI(){
    /* Há percurso se sobra parede para andar OU se a sala tem mais
       de uma parede: no segundo caso a seta leva à parede seguinte,
       mesmo que esta caiba inteira na tela. */
    var percorre = obras.length > 1 && (limite > 1 || paredes.length > 1);

    setaEsq.disabled = !percorre || indice <= 0;
    setaDir.disabled = !percorre || indice >= obras.length - 1;

    conta.hidden = !percorre;
    if(percorre){
      var texto = (indice + 1) + " " + I18N.t("de") + " " + obras.length;
      if(paredes.length > 1){
        texto += "  ·  " + I18N.t("parede") + " " + (iParede + 1) +
                 " " + I18N.t("de") + " " + paredes.length;
      }
      conta.textContent = texto;
    }
  }

  /* ---------- roda e trackpad ---------- */

  /* percurso contínuo com inércia curta: a roda soma ao alvo e a
     inércia alcança. eixo Y também vale, senão mouse comum não anda. */
  function naRoda(e){
    if(limite <= 0) return;
    e.preventDefault();
    tocado = true;
    var d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
    irAte(alvo + d * 1.15);
    /* percorrendo à mão, o foco passa a ser o que estiver na frente */
    indice = maisPerto();
    atualizarUI();
  }

  /* ---------- arrasto no toque ---------- */

  var tocando = false, xInicial = 0, passoInicial = 0, arrastou = false;

  function aoTocar(e){
    if(limite <= 0 || e.touches.length !== 1) return;
    tocando = true;
    tocado = true;
    arrastou = false;
    xInicial = e.touches[0].clientX;
    passoInicial = passo;
    promover(true);
  }

  function aoArrastar(e){
    if(!tocando || e.touches.length !== 1) return;
    var d = e.touches[0].clientX - xInicial;
    if(Math.abs(d) > 6) arrastou = true;
    passo = limitar(passoInicial - d);
    alvo = passo;
    aplicar();
  }

  function aoSoltar(){
    if(!tocando) return;
    tocando = false;
    /* no celular a parede para sempre numa obra (briefing 8) */
    if(arrastou && telaPequena.matches) irParaObra(maisPerto());
    else { indice = maisPerto(); promover(false); atualizarUI(); }
  }

  /* ---------- teclado ---------- */

  /* setas percorrem, Enter abre a obra em foco, Esc volta ao saguão */
  function naTecla(e){
    if(e.key === "ArrowRight"){
      e.preventDefault();
      irParaObra(Math.min(indiceAtual() + 1, obras.length - 1));
      focar();
    } else if(e.key === "ArrowLeft"){
      e.preventDefault();
      irParaObra(Math.max(indiceAtual() - 1, 0));
      focar();
    }
  }

  /* o elemento da obra global i, se ela estiver na parede corrente */
  function elementoDe(i){
    var onde = Espaco.ondeEsta(i);
    if(onde.parede !== iParede || !fileira) return null;
    return fileira.children[onde.posicao] || null;
  }

  function focar(){
    var el = elementoDe(indice);
    if(el && el.focus) el.focus({preventScroll:true});
  }

  /* clicar numa obra abre; tabular até ela traz a parede junto */
  function noClique(e){
    var alvoEl = e.target.closest ? e.target.closest(".obra--interativa") : null;
    if(!alvoEl || arrastou) return;
    var i = parseInt(alvoEl.dataset.obra, 10);
    if(!isNaN(i) && typeof opcoes.aoAbrirObra === "function") opcoes.aoAbrirObra(i);
  }

  function noFoco(e){
    var alvoEl = e.target.closest ? e.target.closest(".obra--interativa") : null;
    if(!alvoEl) return;
    var i = parseInt(alvoEl.dataset.obra, 10);
    if(!isNaN(i)) irParaObra(i);
  }

  /* ---------- ligações ---------- */

  setaEsq.addEventListener("click", function(){ irParaObra(indiceAtual() - 1); });
  setaDir.addEventListener("click", function(){ irParaObra(indiceAtual() + 1); });
  bSaguao.addEventListener("click", function(){
    if(typeof opcoes.aoSaguao === "function") opcoes.aoSaguao();
  });
  bMapa.addEventListener("click", function(){
    if(typeof opcoes.aoMapa === "function") opcoes.aoMapa();
  });

  raiz.addEventListener("wheel", naRoda, {passive:false});
  raiz.addEventListener("touchstart", aoTocar, {passive:true});
  raiz.addEventListener("touchmove", aoArrastar, {passive:true});
  raiz.addEventListener("touchend", aoSoltar);
  raiz.addEventListener("click", noClique);
  raiz.addEventListener("focusin", noFoco);
  window.addEventListener("resize", medir);

  function destruir(){
    vivo = false;
    window.removeEventListener("resize", medir);
    telaPequena.removeEventListener("change", reposicionarPlaca);
  }

  /* A medida só vale depois que o navegador aplicou o layout. O
     prazo é a rede para aba estrangulada, onde o rAF não roda. */
  function assentar(){
    medir();
    if(obras.length) irParaObra(opcoes.foco || 0, true);
  }
  window.requestAnimationFrame(assentar);
  window.setTimeout(assentar, 60);

  return {
    el:          raiz,
    medir:       medir,
    naTecla:     naTecla,
    irParaObra:  irParaObra,
    indiceAtual: indiceAtual,
    focar:       focar,
    destruir:    destruir,
    /* a moldura na parede, para o voo FLIP da obra */
    quadroDe: function(i){
      var el = elementoDe(i);
      return el ? el.querySelector(".quadro") : null;
    },
    obraDe: elementoDe,
    paredeAtual: function(){ return iParede; },
    recuar: function(recuada){
      raiz.classList.toggle("recuada", !!recuada);
    }
  };
}

function botao(classe, texto, rotulo){
  var b = document.createElement("button");
  b.type = "button";
  b.className = classe;
  b.textContent = texto;
  if(rotulo) b.setAttribute("aria-label", rotulo);
  return b;
}

return { montar: montar };

})();
