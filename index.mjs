import "dotenv/config";
import { randomUUID } from "crypto";
import { Groq } from "groq-sdk";
import _sample from "lodash/sample.js";
import _random from "lodash/random.js";
import fs from "fs";
import readline from "readline/promises";
import { stdin as input, stdout as output } from "node:process";
import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";
import path from "path";
import { fetchVideoFromPixabay } from "./misc/video.mjs";
import {
  addTextToVideo,
  getHighlights,
  getHighlightText,
} from "./misc/highlight.mjs";
import {
  addMusicToVideo,
  downloadMusic,
  fetchMusicFromJamendo,
} from "./misc/music.mjs";

const OUTPUT_DIR = process.env.OUTPUT_DIR;

const maxChars = 120; // propositalmente diferente da env para teste

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR);

// Set FFmpeg path for fluent-ffmpeg
ffmpeg.setFfmpegPath(ffmpegPath);

async function generateVideo(highlight) {
  try {
    if (fs.existsSync(path.join(OUTPUT_DIR, highlight.id))) {
      console.log("Video already generated for highlight: ", highlight.id);
      return;
    }

    console.log("Generating video for highlight: ", highlight.id);

    console.log("Fetching video from Pixabay...");
    const { videoFilePath, video } = await fetchVideoFromPixabay(highlight);
    console.log(`Done! Fetched video: ${video.id}`);

    console.log("Adding text...");
    const videoWithTextPath = await addTextToVideo({
      videoFilePath,
      highlight,
      video,
      text: getHighlightText(highlight),
    });
    console.log("Done! Video with text saved at: ", videoWithTextPath);

    console.log("Fetching track url...");
    const track = await fetchMusicFromJamendo();
    console.log(`Done! Fetched music: ${track.name}`);

    console.log("Downloading music...");
    const { musicFilePath } = await downloadMusic({ track, highlight });
    console.log("Done! Music downloaded at: ", musicFilePath);

    console.log("Adding music...");
    const videoWithMusicPath = await addMusicToVideo({
      videoFilePath: videoWithTextPath,
      highlight,
      musicFilePath,
    });
    console.log("Done! Video with music saved at: ", videoWithMusicPath);

    console.log("Deleting files...");
    [videoFilePath, videoWithTextPath, musicFilePath].forEach(filePath =>
      fs.unlink(filePath, err => {
        if (err) {
          console.error(`Error deleting ${filePath} file:`, err);
          return;
        }
        console.log(`File successfully deleted: ${filePath}`);
      })
    );
  } catch (error) {
    console.error("An error occurred in generateVideo:", error);
  }
}

const PROMPT = `Crie citações-síntese a partir do conjunto das citações abaixo de forma que as sumarize em uma nova frase de até ${maxChars} caracteres. Gere 3 versões com tons diferentes (filosófico, emocional, poético, provocador etc.). 2 com algum dos tons de exemplo (escolhidos de forma aleatória) e 1 com um tom aleatório (sem ser algum dos que citei) que você acredite fazer sentido para o contexto após análise das citações, sempre mantendo o mais humano possível.Não ultrapasse o limite de ${maxChars} em nenhuma delas e considere os espaços em branco entre as palavras na contagem de caracteres! Dito isto, gere cada uma com um tamanho diferente, a primeira curta, a segunda média e a terceira só um pouquinho maior que a segunda. As citações-síntese devem ser retornadas em um array JSON, com cada objeto contendo as propriedades "text" e "mood". Além disso, adicione uma propriedade "tags" contendo palavras-chave em inglês que possam ser usadas para buscar vídeos de fundo que remetam às citações. As tags devem ser palavras concretas como "nature", "animals", "mountains", "sea", "fish" e outras baseadas mas não limitadas a essas. e devem ser combinadas em uma string separadas apenas por espaço em branco. Adicione também uma propriedade "hashtags" que sejam 5 ou mais palavras otimizadas comumente usadas em vídeos de sucesso para que o vídeo tenha mais chances de ser visto nas mais variadas plataformas como tiktok, youtube shorts e instagram reels para um público brasileiro. Por fim, adicione uma propriedade "description" que será a descrição usada no vídeo. O resultado deve ser um json válido dessa forma: {"body": array com as 3 citações}.

Citações:

`;

const model = "meta-llama/llama-4-scout-17b-16e-instruct";
// const model = "deepseek-r1-distill-llama-70b"; // ruim

(async () => {
  try {
    const highlights = await getHighlights();

    const highlightsText = highlights.map(h => h.text).join("\n\n");

    const prompt = `${PROMPT}${highlightsText}`;

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    const temperature = _random(1, 2, true);
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      model,
      temperature,
      max_completion_tokens: 1024,
      top_p: 1,
      stream: false,
      response_format: {
        type: "json_object",
      },
      stop: null,
    });

    let response = JSON.parse(
      chatCompletion.choices[0]?.message?.content || "{}"
    );

    console.log("Tempreature: ", temperature);
    console.log("Response: ", response);

    const rl = readline.createInterface({ input, output });

    // PARA GERAR ÚNICO HIGHLIGHT
    const index = await rl.question(
      `Inform the desired response index (0 - ${response.body.length - 1}): `
    );
    let highlight = response.body[index];
    highlight.prompt = prompt;
    highlight.temperature = temperature;
    highlight.id = randomUUID();

    await generateVideo(highlight);

    // const generatedHighlights = [];

    // // PARA GERAR TODOS OS HIGHLIGHTS
    // for (const highlight of response.body) {
    //   highlight.prompt = prompt;
    //   highlight.temperature = temperature;
    //   highlight.id = randomUUID();
    //   highlight.promptResponse = JSON.stringify(response, null, 2);
    //   await generateVideo(highlight);
    //   generatedHighlights.push(highlight);
    // }

    // console.log(
    //   "Generated highlights: ",
    //   generatedHighlights.map(h => h.id)
    // );

    rl.close();
  } catch (error) {
    console.error("An error occurred in main:", error);
  }
})();
