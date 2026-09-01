/* ============================================================
   CONTEUDO  conteudo.js
   Para adicionar uma obra, copie um objeto e edite.
   sala: precisa bater com um nome da lista SALAS abaixo.
   capa: caminho da imagem, ex. "imagens/bolo.jpg". Deixe "" para placeholder.
   ============================================================ */

const PERFIL = {
  texto:[
    "Aqui fica tudo que eu já fiz e tenho orgulho, misturado de propósito: código, bolo, desenho, apresentação de balé.",
    "A ideia é que nada disso viva em pastas separadas, porque na minha cabeça também não vive."
  ],
  contatos:[
    {onde:"GitHub",   link:"https://github.com/Ana-Bruginski",        rotulo:"Ana-Bruginski"},
    {onde:"LinkedIn", link:"https://linkedin.com/in/SEU-USUARIO",     rotulo:"Ana Bruginski"},
    {onde:"E-mail",   link:"mailto:seuemail@exemplo.com",             rotulo:"seuemail@exemplo.com"}
  ]
};

/* As salas, na ordem em que aparecem nas abas.
   Renomeie, reordene, apague ou crie salas aqui.
   O nome precisa ser igual ao campo "sala" das obras.
   A frase e opcional e aparece quando a sala e aberta. */

const SALAS = [
  {nome:"Código",    frase:"o que eu construí"},
  {nome:"Faculdade", frase:"o que eu organizei"},
  {nome:"Cozinha",   frase:"o que eu assei"},
  {nome:"Balé",      frase:"o que me deu disciplina"},
  {nome:"Natação",   frase:"o que me acalma"}
];

const OBRAS = [
  {
    n:"01", titulo:"MedXF", subtitulo:"Sistema de triagem clínica, 2025",
    ficha:"Java, Spring Boot, MySQL", sala:"Código", capa:"",
    texto:["Sistema de triagem clínica para Síndrome do X Frágil.",
           "Escreva o que o projeto resolve, qual foi a parte difícil e o que você aprendeu fazendo."],
    extras:[""]
  },
  {
    n:"02", titulo:"e-PAF", subtitulo:"Sistema fiscal, 2026",
    ficha:"Receita Estadual do Paraná", sala:"Código", capa:"",
    texto:["Trabalho no e-PAF durante o estágio.",
           "Descreva o escopo do que você faz, sem entrar em dado sensível do órgão."],
    extras:[""]
  },
  {
    n:"03", titulo:"POLIWEEK", subtitulo:"Semana acadêmica, 2026",
    ficha:"Organização, Escola Politécnica", sala:"Faculdade", capa:"",
    texto:["Organização da semana acadêmica da Escola Politécnica.",
           "Conte o tamanho do evento e o que ficou sob sua responsabilidade."],
    extras:["",""]
  },
  {
    n:"04", titulo:"CA Linus Torvalds", subtitulo:"Centro acadêmico, desde 2026",
    ficha:"Vice-tesoureira", sala:"Faculdade", capa:"",
    texto:["Gestão financeira do centro acadêmico de Ciência da Computação."],
    extras:[""]
  },
  {
    n:"07", titulo:"Apresentação de fim de ano", subtitulo:"Balé, 2019",
    ficha:"Palco", sala:"Balé", capa:"",
    texto:["O balé me deu disciplina e repertório, e isso aparece em tudo que eu faço depois.",
           "Vale contar quantos anos você dançou e o que ficou."],
    extras:[""]
  },
  {
    n:"08", titulo:"Prova dos 100 metros", subtitulo:"Natação, 2025",
    ficha:"Piscina de 25m", sala:"Natação", capa:"",
    texto:["Registre o tempo, a prova, ou só o dia em que você decidiu voltar a nadar."],
    extras:[""]
  }
];