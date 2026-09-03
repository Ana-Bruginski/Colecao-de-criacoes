<div align="center">

<img src="capa.svg" width="720" alt="Coleção de Criações">

<br>

✦

*Aqui fica tudo o que eu já fiz e tenho orgulho, misturado de propósito.*

<br>

✧ &nbsp; **[Visitar](https://ana-bruginski.github.io/Colecao-de-criacoes/)** &nbsp; ✧

<br>

✦ &nbsp;&nbsp; · &nbsp;&nbsp; ✧ &nbsp;&nbsp; · &nbsp;&nbsp; ✦

<br>

<sub>Ana Bruginski &nbsp;·&nbsp; Curitiba</sub>

</div>

---

## O que é

Um museu virtual pessoal. Cada sala é um tema, cada obra pendurada na parede é
um projeto ou uma conquista. Site estático puro — HTML, CSS e JavaScript, sem
build, sem framework, sem servidor.

A perspectiva é real: paredes, piso e teto são cinco planos inclinados com CSS
3D transforms. Não há Three.js nem canvas.

## Como rodar

No GitHub Pages funciona direto. Localmente, o navegador não deixa uma página
aberta do disco ler um arquivo JSON, então é preciso um servidor local:

```bash
py -m http.server 8000
```

E abrir `http://localhost:8000`. No PyCharm ou no IntelliJ, o botão de abrir no
navegador já serve o arquivo sozinho. Abrindo o `index.html` com duplo clique, o
museu mostra uma placa explicando isso em vez de uma tela preta.

## Como adicionar uma obra

Tudo mora em **`dados/museu.json`**. Nenhuma sala e nenhuma obra estão escritas
no HTML ou no JavaScript — mexer neste arquivo é mexer no museu.

Para pendurar uma obra, acrescente um objeto na lista `obras` da sala:

```json
{
  "titulo_pt": "Nome da obra",
  "ano": "2026",
  "tecnica_pt": "Java sobre Spring Boot",
  "descricao_pt": "Duas a quatro linhas sobre o que é e por que importa.",
  "link": { "rotulo": "Ver no GitHub", "url": "https://..." },
  "imagens": [
    { "src": "img/obras/arquivo.webp", "alt_pt": "Descrição da imagem" }
  ]
}
```

O que cada campo faz:

| Campo | Para que serve |
|---|---|
| `titulo_pt` | Aparece na etiqueta, na ficha e no título da aba |
| `ano` | Vai na etiqueta, em caixa alta espaçada |
| `tecnica_pt` | A brincadeira com o vocabulário de museu: "Merengue suíço sobre massa folhada" |
| `descricao_pt` | Duas a quatro linhas. Mais que isso a ficha vira artigo |
| `link` | Opcional. Vira o botão no pé da ficha |
| `moldura` | Opcional. Sobrescreve a moldura da sala só nesta obra |
| `imagens` | De 0 a 6. A primeira é a que fica pendurada na parede |

**Cada obra pode ter a sua moldura.** Sem o campo `moldura`, ela usa a da sala.
Com o campo, usa a sua — e é misturar molduras na mesma parede que faz o
conjunto parecer colecionado ao longo do tempo, e não comprado de uma vez.

**Uma obra pode não ter imagem nenhuma.** Deixe `"imagens": []` e ela vira uma
*obra em texto*: moldura com fundo liso e o título centralizado em serifada
dentro dela. É assim que entram certificados, cargos e conquistas sem foto.

**O tamanho na parede sai da proporção real da imagem.** Não existe campo de
formato: retrato alto, panorâmica e quadrada convivem na mesma parede porque o
museu alinha todas pelo centro, num eixo horizontal comum, como se pendura de
verdade. Obra muito larga é pendurada mais baixa, nunca deformada.

**A sala aceita quantas obras você quiser**, todas na mesma parede. A parede
cresce e a câmera percorre ela de ponta a ponta — roda do mouse, setas laterais
ou teclado. O contador embaixo mostra onde você está: *"7 de 12"*. Você não
precisa fazer nada, é só continuar acrescentando obras na lista.

### Obras de teste

Hoje o `museu.json` tem várias obras marcadas com `"teste": true`, para ver
como fica uma parede cheia. Elas são descartáveis — apague todas as que tiverem
esse campo. O estado anterior está guardado em `dados/museu.json.antes-do-teste`.

## Como adicionar uma sala

Acrescente um objeto na lista `salas`:

```json
{
  "id": "cozinha",
  "nome_pt": "Cozinha",
  "nome_en": "Kitchen",
  "parede": "terracota",
  "moldura": "dourada-classica",
  "obras": []
}
```

O `id` é o que aparece no endereço (`#/sala/cozinha`), então use minúsculas sem
acento. A sala entra sozinha no saguão, na planta do museu e na navegação.

**Sala com zero obras** aparece no saguão com a plaquinha "Em montagem" e o
portal fechado, sem link — e na planta, com o traço tracejado.

### Os tokens de cor

`parede` e `moldura` não aceitam cores livres, só estes nomes. Cor solta no JSON
quebraria a unidade do museu.

| `parede` | tom | `moldura` |
|---|---|---|
| `azul-profundo` | azul-acinzentado claro | `dourada-classica` |
| `terracota` | rosa-argila claro | `dourada-fina` |
| `verde-oliva` | sálvia claro | `madeira-escura` |
| `bordo` | rosa antigo | `fina-preta` |
| `grafite` | cinza quente claro | `oval` |
| `areia` | areia claro | |

As paredes das salas são pastéis: galeria clara, uma cor por sala. Os nomes
vieram do briefing, quando a paleta era fechada e escura — hoje descrevem a
família da cor, não a intensidade. O saguão tem paleta própria: creme quente,
de propósito um tom mais fechado que as salas — é o que faz a galeria parecer
acender quando se atravessa a porta. As passagens são em caixilho dourado.

Um nome que não esteja nesta tabela não quebra a tela: a sala cai no padrão
(`areia` e `dourada-fina`) e o console explica o que aconteceu.

Se quiser mudar as cores em si, elas estão em `css/base.css`, num bloco por
token. Tudo o mais — sombra, véu, plaquinha, reflexo no piso — é derivado da cor
da parede, então trocar o token retinge a sala inteira sozinho.

## Português e inglês

Os campos terminados em `_en` são todos opcionais. Faltando, o museu mostra a
versão em português no modo EN, sem quebrar. O alternador fica no canto superior
do saguão e a escolha fica guardada no navegador de quem visita.

## Imagens

Duas versões por obra, em WebP: uma reduzida para a parede e a original com no
máximo 1600px para o detalhe. As do MedXF ainda estão em PNG — `medxf-3.png` tem
450 KB, que é muito para o que ela mostra. Para converter:

```bash
cwebp -q 82 img/obras/medxf-3.png -o img/obras/medxf-3.webp
```

Depois é só apontar o `src` no JSON para o `.webp`.

Só a sala que está sendo visitada é montada, então as imagens das outras salas
nunca são baixadas. A página inicial, sem contar as obras, fica em torno de
135 KB, quase toda em fontes.

## Estrutura

```
index.html
dados/museu.json     todo o conteúdo do museu
css/
  base.css           reset, tokens de cor, tipografia
  espaco.css         perspectiva, paredes, piso, texturas, iluminação, moldura
  saguao.css         portais, abertura, planta do museu
  sala.css           layout da parede, plaquinhas, navegação lateral
  obra.css           a obra aberta em primeiro plano
js/
  i18n.js            alternância PT / EN
  espaco.js          monta uma sala genérica, valida os tokens
  sala.js            layout da parede e percurso lateral
  obra.js            abertura FLIP, ficha, carrossel
  mapa.js            planta baixa
  main.js            carrega o JSON, monta o saguão, roteia por hash
img/
  obras/             as imagens das obras
  fontes/            EB Garamond e Jost, auto-hospedadas
```

## Navegação

| | |
|---|---|
| Roda ou trackpad | percorre a parede lateralmente |
| ← → | percorrem a parede, uma obra por vez |
| Enter | abre a obra em foco |
| Esc | fecha a obra, depois volta ao saguão |
| Mapa | planta baixa, para pular direto entre salas |

Tudo é navegável por teclado, com foco visível. Quem tiver `prefers-reduced-motion`
ligado no sistema recebe cross-fades curtos no lugar dos avanços de câmera, e a
parede percorre sem inércia.

Os endereços são diretos: `#/sala/codigo` abre a sala, `#/sala/codigo/obra/1`
abre a obra. Dá para mandar o link de uma obra específica para alguém.
