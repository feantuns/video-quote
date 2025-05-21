import "dotenv/config";
import _sample from "lodash/sample.js";
import fetch from "node-fetch";
import fs from "fs";
import path from "path";

const PIXABAY_API_KEY = process.env.PIXABAY_API_KEY; // Replace with your API key
const PIXABAY_API_URL = "https://pixabay.com/api/videos/";
// const PIXABAY_SEARCH_TERMS = [
//   "nature dark",
//   "aesthetic",
//   "abstract",
//   "universe",
//   "movement",
//   "art",
// ];
// const PIXABAY_SEARCH_TERMS = [
//   "rain",
//   "desert",
//   "dark colors",
//   "splash",
//   "speed",
//   "city",
//   "sunset",
// ];
const PIXABAY_SEARCH_TERMS = [
  "animal funny",
  "animals movement",
  "animal",
  "cat",
];

const OUTPUT_DIR = process.env.OUTPUT_DIR;

export async function fetchVideoFromPixabay(highlight) {
  const apiUrl = `${PIXABAY_API_URL}?key=${PIXABAY_API_KEY}&q=${_sample(
    PIXABAY_SEARCH_TERMS
  )}&per_page=200&min_width=1080&min_height=1920`;
  console.log("Fetching video by: ", apiUrl);
  const response = await fetch(apiUrl);
  const data = await response.json();

  if (!data.hits || data.hits.length === 0) {
    throw new Error("No videos found in the Pixabay API response.");
  }

  // garantir que não use um vídeo já usado
  const usedVideosIds = fs.readFileSync("./used-videos.txt", "utf8").split(";");
  const getRandomVideo = () => {
    const sample = _sample(
      data.hits.filter(h => h.duration > 20 && h.duration < 40)
    );

    if (usedVideosIds.includes(`${sample.id}`)) {
      return getRandomVideo();
    }

    return sample;
  };

  const video = getRandomVideo();

  fs.appendFile("./used-videos.txt", `${video.id};`, err => {
    if (err) {
      console.error("Error writing video id to used-videos file:", err);
      return;
    }
  });

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
