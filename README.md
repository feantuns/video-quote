# video-quotes

Um projeto para gerar citações a partir de highlights do Readwise.

## Prompt

Crie citações-síntese a partir do conjunto das citações abaixo de forma que as sumarize em uma nova frase de até 140 caracteres. Gere 3 versões com tons diferentes (filosófico, emocional, poético, provocador etc.), 2 com algum dos tons de exemplo e 1 com um tom aleatório que você acredite fazer sentido para o contexto após análise das citações. As citações-síntese devem ser retornadas em um array JSON, com cada objeto contendo as propriedades "text" e "mood". Além disso, adicione uma propriedade "tags" contendo palavras-chave em inglês que possam ser usadas para buscar vídeos de fundo que remetam às citações. As tags devem ser palavras concretas como "nature", "animals", "mountains", "sea", "fish" e outras baseadas mas não limitadas a essas. e devem ser combinadas em uma string separadas apenas por espaço em branco. Adicione também uma propriedade "hashtags" que sejam 5 ou mais palavras otimizadas comumente usadas em vídeos de sucesso para que o vídeo tenha mais chances de ser visto nas mais variadas plataformas como tiktok, youtube shorts e instagram reels para um público brasileiro. Por fim, adicione uma propriedade "description" que será a descrição usada no vídeo. O resultado deve ser apenas um array de 3 objetos. Sem nenhum outro texto ou formatação. Apenas uma string com o array.

Citações:

'0 - "Nós não vemos o que vemos, nós vemos o que somos. Só veem as belezas do mundo, aqueles que têm belezas dentro de si."\n' +
'Rubem Alves',
'1 - Segundo Liebig, o corpo do homem é uma fornalha, e o alimento é o combustível que mantém a combustão interna nos pulmões.',
'2 - O que eu queria, e não posso, é por exemplo que tudo o que me viesse de bom de dentro de mim eu pudesse dar aquilo que eu pertencesse.',
'3 - Não sei selecionar as que mais me comoveram. Todas esquentaram meu coração, todas quiseram me dar a mão para me ajudar a subir mais e ver de algum modo a grande paisagem do mundo, todas me fizeram muito bem',
'4 - Quanto tempo você acha que a raça humana vai viver?',
'5 - Provavelmente a senhorita é jovem demais para saber que nossa vida é muito simples.',
'6 - Quem vê a beleza divina num cacho de vaga-lumes com certeza viu a glória de Deus.',
'7 - Parasite por muito tempo e não será capaz de existir sem um hospedeiro.',
'8 - How can the rest of us achieve such enviable freedom from clutter? The answer is to clear our heads of clutter. Clear thinking becomes clear writing; one can’t exist without the other.',
'9 - Let him lose himself in wonders as amazing in their littleness as the others in their vastness.',
'10 - Se você levar os sentimentos de seus filhos a sério e os reconfortar quando eles precisarem, aos poucos eles vão aprender a internalizar essa forma de se reconfortar e, com o tempo, vão se tornar capazes de fazer isso por conta própria.',
'11 - Tudo mata de uma maneira ou de outra. Pescar mata-me tal como me faz viver.',
'12 - “What is the good of it? What is the good of doing anything, when the best part of my life is being wasted like this?” and to this question, tears were my only answer.',
'13 - Sem a agonia do espírito, que é uma experiência sem palavras, não há significados em nenhum lugar.',
'14 - To live an inspired life your mind must cultivate empowering thoughts through your beliefs, assumptions, agreements, words, feelings, choices, and actions.'
