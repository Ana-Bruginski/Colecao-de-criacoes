/* ============================================================
   ESPAÇO  monta uma sala genérica

   Esta é a peça que o saguão, a sala e o mapa reutilizam. Nada
   específico de uma tela mora aqui: só paredes, piso, teto,
   rodapé, luz e os quadros pendurados.

   Também é aqui que os tokens do JSON são validados. Token
   desconhecido não quebra a tela: cai no padrão e avisa no
   console, como manda a seção 5 do briefing.
   ============================================================ */

var Espaco = (function(){
"use strict";

/* ---------- tokens permitidos (briefing 4.1) ---------- */

var PAREDES = ["azul-profundo","terracota","verde-oliva","bordo","grafite","areia"];
var MOLDURAS = ["dourada-classica","dourada-fina","madeira-escura","fina-preta","oval"];

var PAREDE_PADRAO  = "areia";
var MOLDURA_PADRAO = "dourada-fina";

var MAX_OBRAS   = 6;   /* briefing 3.2 */
var MAX_IMAGENS = 6;   /* briefing 3.3 */

/* A altura base varia entre obras vizinhas: é o que dá ritmo à
   fileira. A variação é grande de propósito — numa parede de museu
   a menor obra tem quase metade da maior, e é esse contraste que
   faz a fileira parecer montada por alguém, e não gerada. */
var RITMO = [0.74, 1, 0.6, 0.9, 0.66, 0.96];

function token(valor, validos, padrao, onde){
  if(validos.indexOf(valor) >= 0) return valor;
  console.warn(
    'Coleção de Criações: token "' + valor + '" não existe em ' + onde +
    '. Usando "' + padrao + '". Veja a seção 4.1 do briefing.'
  );
  return padrao;
}

/* ---------- idioma: campo _en é opcional e cai no _pt ---------- */

function texto(objeto, campo, idioma){
  if(!objeto) return "";
  if(idioma === "en" && objeto[campo + "_en"]) return objeto[campo + "_en"];
  return objeto[campo + "_pt"] || objeto[campo + "_en"] || "";
}

function nome(sala, idioma){
  return texto(sala, "nome", idioma) || sala.id || "Sala";
}

function imagensDe(obra){
  var lista = Array.isArray(obra.imagens) ? obra.imagens.filter(function(im){
    return im && im.src;
  }) : [];
  if(lista.length > MAX_IMAGENS){
    console.warn('Coleção de Criações: a obra "' + (obra.titulo_pt || "") +
      '" tem ' + lista.length + ' imagens; o máximo é ' + MAX_IMAGENS + '.');
    lista = lista.slice(0, MAX_IMAGENS);
  }
  return lista;
}

/* ---------- a tela dentro da moldura ---------- */

function montarTela(obra, ficha){
  var tela = document.createElement("div");
  tela.className = "tela";

  var imagens = imagensDe(obra);
  var primeira = imagens[0];

  if(primeira){
    var img = document.createElement("img");
    img.alt = texto(primeira, "alt", ficha.idioma);
    img.decoding = "async";
    /* fora da sala corrente a imagem não precisa vir junto (briefing 9) */
    if(!ficha.presente) img.loading = "lazy";

    /* o tamanho vem da proporção real da imagem, nunca de um campo
       fixo. até ela carregar, vale a proporção de reserva. */
    img.addEventListener("load", function(){
      if(img.naturalWidth && img.naturalHeight){
        var razao = img.naturalWidth / img.naturalHeight;
        tela.style.setProperty("--proporcao", img.naturalWidth + " / " + img.naturalHeight);
        tela.style.setProperty("--razao", razao.toFixed(4));
        if(typeof ficha.aoMedir === "function") ficha.aoMedir();
      }
    });
    img.src = primeira.src;
    tela.appendChild(img);
  } else {
    /* obra em texto: é assim que entram certificados e cargos,
       que não têm foto mas têm lugar na parede */
    tela.classList.add("tela--texto");
    tela.style.setProperty("--proporcao", "5 / 6");
    tela.style.setProperty("--razao", "0.8333");
    var rotulo = document.createElement("span");
    rotulo.textContent = texto(obra, "titulo", ficha.idioma);
    tela.appendChild(rotulo);
  }

  return tela;
}

/* ---------- um quadro pendurado ---------- */

function montarObra(obra, ficha){
  var titulo = texto(obra, "titulo", ficha.idioma);
  var ano = obra.ano || "";

  /* interativa vira botão: a parede inteira é percorrível por teclado */
  var art = document.createElement(ficha.interativa ? "button" : "div");
  art.className = "obra" + (ficha.interativa ? " obra--interativa" : "");
  var passoRitmo = ficha.ritmo != null ? ficha.ritmo : ficha.indice;
  art.style.setProperty("--ritmo", RITMO[passoRitmo % RITMO.length]);

  if(ficha.interativa){
    art.type = "button";
    art.dataset.obra = String(ficha.indice);
    art.setAttribute("aria-label", titulo + (ano ? ", " + ano : ""));
  }

  var quadro = document.createElement("div");
  quadro.className = "quadro moldura-" + ficha.moldura;
  quadro.appendChild(montarTela(obra, ficha));
  art.appendChild(quadro);

  /* plaquinha branca à direita da obra: título e ano em caixa
     alta espaçada, como etiqueta de museu (briefing 3.2) */
  if(ficha.comPlaquinha){
    var placa = document.createElement("span");
    placa.className = "plaquinha";

    var pt = document.createElement("span");
    pt.className = "plaquinha-titulo";
    pt.textContent = titulo;
    placa.appendChild(pt);

    if(ano){
      var pa = document.createElement("span");
      pa.className = "plaquinha-ano";
      pa.textContent = ano;
      placa.appendChild(pa);
    }
    art.appendChild(placa);
  }

  return art;
}

/* ---------- a sala inteira ---------- */

function plano(classe){
  var el = document.createElement("div");
  el.className = "plano " + classe;
  return el;
}

function camada(classe){
  var el = document.createElement("div");
  el.className = classe;
  return el;
}

function paredeDe(sala){
  return token(sala.parede, PAREDES, PAREDE_PADRAO, 'sala "' + sala.id + '"');
}

function molduraDe(sala){
  return token(sala.moldura, MOLDURAS, MOLDURA_PADRAO, 'sala "' + sala.id + '"');
}

/* todas as obras da sala, sem corte */
function obrasDe(sala){
  return Array.isArray(sala.obras) ? sala.obras : [];
}

/* Uma sala, uma parede só — por mais longa que ela precise ser.
   Repartir o acervo em várias paredes obrigava quem visita a
   entender que a sala tinha "lados", e isso atrapalhava mais do
   que ajudava: a parede única é percorrida de ponta a ponta sem
   que ninguém precise saber onde ela é cortada.
   A estrutura de paredes continua aqui, com uma só, para o resto
   do código não precisar saber da mudança. */
function paredesDe(sala){
  return [obrasDe(sala)];
}

/* de qual parede é a obra i, e em que posição nela */
function ondeEsta(i){
  return { parede: 0, posicao: i };
}

/* a moldura de uma obra: a da própria obra manda, senão a da sala.
   É o que permite molduras diferentes na mesma parede, que é o que
   faz o conjunto parecer colecionado e não comprado de uma vez. */
function molduraDaObra(obra, sala){
  if(obra && obra.moldura){
    return token(obra.moldura, MOLDURAS, molduraDe(sala),
      'obra "' + (obra.titulo_pt || obra.titulo_en || "?") + '"');
  }
  return molduraDe(sala);
}

/* Monta a fileira de uma parede da sala. Separada de montarSala
   porque trocar de parede troca só isto — o cômodo continua o
   mesmo, quem vira é quem visita. */
function montarParede(sala, iParede, opcoes){
  opcoes = opcoes || {};
  var idioma = opcoes.idioma || "pt";
  var paredes = paredesDe(sala);
  var i = Math.max(0, Math.min(paredes.length - 1, iParede || 0));
  var lista = paredes[i];

  var obras = document.createElement("div");
  obras.className = "obras";

  var quantas = opcoes.limite ? Math.min(opcoes.limite, lista.length) : lista.length;

  for(var k = 0; k < quantas; k++){
    obras.appendChild(montarObra(lista[k], {
      moldura:      molduraDaObra(lista[k], sala),
      indice:       k,
      ritmo:        k,
      idioma:       idioma,
      presente:     true,
      interativa:   !!opcoes.interativa,
      comPlaquinha: !!opcoes.interativa,
      aoMedir:      opcoes.aoMedir
    }));
  }
  return obras;
}

/*  sala     objeto vindo de museu.json
    opcoes   idioma      "pt" | "en"
             limite      quantas obras pendurar (padrão: todas)
             interativa  obras viram botões, com plaquinha
             semPlaca    não pendura a placa da sala
             aoMedir     chamado quando uma imagem revela a proporção  */
function montarSala(sala, opcoes){
  opcoes = opcoes || {};
  var idioma = opcoes.idioma || "pt";

  var raiz = document.createElement("div");
  raiz.className = "sala-espaco";
  raiz.dataset.parede = paredeDe(sala);
  raiz.dataset.sala = sala.id;

  var paredes = paredesDe(sala);
  var iParede = Math.max(0, Math.min(paredes.length - 1, opcoes.parede || 0));
  var lista = paredes[iParede];
  var deslocamento = iParede * MAX_OBRAS;   /* índice global da 1ª obra */

  /* --- a caixa: cinco planos reais --- */

  var piso = plano("plano--piso");
  piso.appendChild(camada("piso-luz"));

  var fundo = plano("plano--fundo");
  fundo.appendChild(camada("parede-sombra"));
  fundo.appendChild(camada("parede-luz"));

  var obras = montarParede(sala, iParede, opcoes);
  fundo.appendChild(obras);

  /* plaquinha maior, junto da entrada da sala (briefing 3.2).
     Vive no plano da parede, não sobre a tela: pega a mesma
     perspectiva das obras e acompanha o percurso lateral. */
  if(!opcoes.semPlaca){
    var placa = document.createElement("div");
    placa.className = "sala-plaqueta";

    var titulo = document.createElement("b");
    titulo.textContent = nome(sala, idioma);

    var conta = document.createElement("span");
    /* a conta é da SALA, não da parede: quem visita quer saber o
       tamanho do acervo, não quantas obras cabem de cada vez */
    conta.textContent = I18N.contagem(obrasDe(sala).length);

    placa.appendChild(titulo);
    placa.appendChild(conta);
    fundo.appendChild(placa);
  }

  fundo.appendChild(camada("rodape"));

  var caixa = document.createElement("div");
  caixa.className = "caixa";
  caixa.appendChild(plano("plano--teto"));
  caixa.appendChild(piso);
  caixa.appendChild(plano("plano--esq"));
  caixa.appendChild(plano("plano--dir"));
  caixa.appendChild(fundo);

  var cena = document.createElement("div");
  cena.className = "cena";
  cena.appendChild(caixa);
  raiz.appendChild(cena);

  return raiz;
}

return {
  montarSala:  montarSala,
  montarParede:montarParede,
  montarObra:  montarObra,
  montarTela:  montarTela,
  nome:        nome,
  texto:       texto,
  paredeDe:    paredeDe,
  molduraDe:   molduraDe,
  molduraDaObra: molduraDaObra,
  obrasDe:     obrasDe,
  paredesDe:   paredesDe,
  ondeEsta:    ondeEsta,
  imagensDe:   imagensDe,
  PAREDES:     PAREDES,
  MOLDURAS:    MOLDURAS,
  MAX_OBRAS:   MAX_OBRAS,
  MAX_IMAGENS: MAX_IMAGENS
};

})();
