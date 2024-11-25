import "dotenv/config";
import _sample from "lodash/sample.js";
import fetch from "node-fetch";
import fs from "fs";
import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";
import path from "path";
import qs from "qs";
import axios from "axios";
import { sanitizeString } from "./sanitizestring.mjs";
import { escapeFFmpegText } from "./escapeFFMpegText.mjs";

const OUTPUT_DIR = "./output";

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR);

// Set FFmpeg path for fluent-ffmpeg
ffmpeg.setFfmpegPath(ffmpegPath);

const PIXABAY_API_KEY = process.env.PIXABAY_API_KEY; // Replace with your API key
const PIXABAY_API_URL = "https://pixabay.com/api/videos/";
const PIXABAY_SEARCH_TERMS = [
  "beautiful girl or girls",
  "nature",
  "nature dark",
  "aesthetic",
  "abstract",
  "universe",
  "movement",
  "space",
];

const READWISE_TOKEN = process.env.READWISE_TOKEN;
const READWISE_API_URL = `https://readwise.io/api/v2/review/`;

const JAMENDO_CLIENT_ID = process.env.JAMENDO_CLIENT_ID; // You'll need to register and get a client ID
const JAMENDO_API_URL = "https://api.jamendo.com/v3.0/tracks";
const JAMENDO_MUSIC_TAGS = ["classical", "jazz", "folk", "pop", "french"];

const TIKTOK_TAGS =
  "#quotes #quotesaesthetic #philosophy #tik_tok #foryoupage #fyp #foryou #viral #follow #followme #bestvideo #thisis4u #featurethis_ #viralvideo #trending #bestitktok";

async function fetchVideoFromPixabay(highlight) {
  const apiUrl = `${PIXABAY_API_URL}?key=${PIXABAY_API_KEY}&q=${_sample(
    PIXABAY_SEARCH_TERMS
  )}&per_page=200&min_width=1080&min_height=1920`;
  console.log("Fetching video by: ", apiUrl);
  const response = await fetch(apiUrl);
  const data = await response.json();

  if (!data.hits || data.hits.length === 0) {
    throw new Error("No videos found in the Pixabay API response.");
  }

  const video = _sample(
    data.hits.filter(h => h.duration > 20 && h.duration < 60)
  );

  // Get the video file URL
  const videoUrl = video.videos.medium.url;

  const videoDirectory = `${OUTPUT_DIR}/highlight-${highlight.id}`;

  // Create new directory
  // recursive true não dá erro se o diretório já existir
  fs.mkdirSync(videoDirectory, { recursive: true });

  fs.appendFile(
    `${videoDirectory}/log.txt`,
    `\nVideo:\n${JSON.stringify(video, null, 2)}`,
    err => {
      if (err) {
        console.error("Error writing video to log file:", err);
        return;
      }
    }
  );

  // Download the video
  const videoFilePath = path.join(
    OUTPUT_DIR,
    `highlight-${highlight.id}`,
    "video.mp4"
  );
  const res = await fetch(videoUrl);
  const fileStream = fs.createWriteStream(videoFilePath);
  await new Promise((resolve, reject) => {
    res.body.pipe(fileStream);
    res.body.on("error", reject);
    fileStream.on("finish", resolve);
  });

  return { videoFilePath, video };
}

async function fetchMusicFromJamendo() {
  try {
    const paramsString = qs.stringify({
      client_id: JAMENDO_CLIENT_ID,
      format: "json",
      tags: _sample(JAMENDO_MUSIC_TAGS), // Search by genre, you can customize this
      limit: 200, // Limit results
    });
    const apiUrl = `${JAMENDO_API_URL}?${paramsString}`;
    console.log("Fetching music by: ", apiUrl);
    const response = await axios.get(apiUrl);

    const track = _sample(response.data.results.filter(r => r.audiodownload));

    return track;
  } catch (error) {
    console.error("Error fetching music:", error);
  }
}

// Function to download the music file from the URL
async function downloadMusic({ track, highlight }) {
  try {
    const response = await axios.get(track.audiodownload, {
      responseType: "stream",
    });

    const fileName = `${sanitizeString(track.name)}.mp3`;
    const musicFilePath = path.join(
      OUTPUT_DIR,
      `highlight-${highlight.id}`,
      fileName
    );
    const fileStream = fs.createWriteStream(musicFilePath);

    fs.appendFile(
      `${OUTPUT_DIR}/highlight-${highlight.id}/log.txt`,
      `\nMusica:\n${JSON.stringify(track, null, 2)}`,
      err => {
        if (err) {
          console.error("Error writing music to log file:", err);
          return;
        }
      }
    );

    await new Promise((resolve, reject) => {
      response.data.pipe(fileStream);
      response.data.on("error", reject);
      fileStream.on("finish", resolve);
    });

    return { musicFilePath };
  } catch (error) {
    console.error("Error downloading track:", error);
  }
}

function splitTextIntoMultiLines(inputStr, lineLength) {
  const words = inputStr.split(" ");
  let lineCount = 0;
  let splitInput = "";

  words.forEach(word => {
    lineCount += word.length + 1; // Account for the word and space
    if (lineCount > lineLength) {
      splitInput += "\n"; // Add a newline if the line exceeds the limit
      lineCount = word.length + 1; // Reset line count for the new line
      splitInput += word + " "; // Start the new line with the current word
    } else {
      splitInput += word + " "; // Add word to the current line
    }
  });

  return splitInput.trim(); // Trim any trailing space
}

async function getHighlights() {
  const response = await fetch(READWISE_API_URL, {
    headers: {
      Authorization: `Token ${READWISE_TOKEN}`,
    },
  });
  const data = await response.json();

  return data.highlights;
}

function getHighlightText(highlight) {
  const maxChars = 140;

  fs.appendFile(
    `${OUTPUT_DIR}/highlight-${highlight.id}/log.txt`,
    `\nQuote:\n${JSON.stringify(highlight, null, 2)}`,
    err => {
      if (err) {
        console.error("Error writing quote to log file:", err);
        return;
      }
    }
  );

  let text = highlight.text.replace(/\n/g, " ");

  const description = `${highlight.title}\n${
    text.length > maxChars ? text : ""
  }\n${TIKTOK_TAGS}`;

  text = text.length > maxChars ? `${text.slice(0, maxChars)}...` : text;

  fs.appendFile(
    `${OUTPUT_DIR}/highlight-${highlight.id}/log.txt`,
    `\nDescrição para o vídeo:\n${description}`,
    err => {
      if (err) {
        console.error("Error writing description to log file:", err);
        return;
      }
    }
  );

  text = `${text}\n\n${highlight.author}`;

  text = escapeFFmpegText(text);

  text = splitTextIntoMultiLines(text, 23);

  return text;
}

async function addTextToVideo({ highlight, videoFilePath, text }) {
  const outputPath = path.join(
    OUTPUT_DIR,
    `highlight-${highlight.id}`,
    "video-with-text.mp4"
  );

  return new Promise((resolve, reject) => {
    ffmpeg(videoFilePath)
      .videoFilters(
        `drawtext=text='${text}':fontcolor=white:
            fontfile=./assets/Roboto-Bold.ttf:
            shadowcolor=black:
            shadowx=2:
            shadowy=2:
            fontsize=60:
            x=(w-text_w)/2:
            y=(h-text_h)/2:
            font=Roboto:
            line_spacing=4:
            alpha='if(lt(t,2),0,if(lt(t,3),(t-2),1))'`
      )
      .videoFilters("scale=-1:1920, crop=1080:1920:(iw-1080)/2:0")
      .videoCodec("libx264")
      .on("end", () => {
        console.log("Video processing complete:", outputPath);
        resolve(outputPath);
      })
      .on("error", err => {
        console.error("Error during video processing:", err);
        reject(err);
      })
      .save(outputPath);
  });
}

async function addMusicToVideo({ highlight, videoFilePath, musicFilePath }) {
  const outputPath = path.join(
    OUTPUT_DIR,
    `highlight-${highlight.id}`,
    "video-with-sound.mp4"
  );

  return new Promise((resolve, reject) => {
    ffmpeg()
      .addInput(videoFilePath)
      .addInput(musicFilePath)
      .audioFilters("volume=1")
      .outputOptions(["-map 0:v", "-map 1:a", "-c:v copy", "-shortest"])
      .on("end", () => {
        console.log("Adding audio complete:", outputPath);
        resolve(outputPath);
      })
      .on("error", err => {
        console.error("Error during Adding audio:", err);
        reject(err);
      })
      .save(outputPath);
  });
}

async function generateVideo(highlight) {
  try {
    console.log("Fetching video from Pixabay...");
    const { videoFilePath, video } = await fetchVideoFromPixabay(highlight);
    console.log(`Done! Fetched video: ${video.id}`);

    console.log("Adding text...");
    const videoWithTextPath = await addTextToVideo({
      videoFilePath,
      highlight,
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

(async () => {
  try {
    const highlights = await getHighlights();

    const test = highlights.slice(0, 2);

    test.forEach(hl => generateVideo(hl));
  } catch (error) {
    console.error("An error occurred in main:", error);
  }
})();
