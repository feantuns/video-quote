import "dotenv/config";
import _sample from "lodash/sample.js";
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

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR);

// Set FFmpeg path for fluent-ffmpeg
ffmpeg.setFfmpegPath(ffmpegPath);

async function generateVideo(highlight) {
  try {
    if (fs.existsSync(path.join(OUTPUT_DIR, `highlight-${highlight.id}`))) {
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

(async () => {
  try {
    const highlights = await getHighlights();

    console.log(highlights.map((h, i) => `${i} - ${h.text}`));

    const rl = readline.createInterface({ input, output });

    const index = await rl.question("Inform the desired highlight index: ");
    let highlight = highlights[index];

    if (!highlight) {
      const highlightText = await rl.question("Inform the highlight text: ");
      const highlightTitle = await rl.question(
        "Inform the highlight title (name of the book): "
      );
      const highlightAuthor = await rl.question(
        "Inform the highlight author: "
      );
      highlight = {
        text: highlightText,
        title: highlightTitle,
        author: highlightAuthor,
        id: Date.now(),
      };
    }

    const videoSearchTerms = await rl.question(
      "Inform the optional video search terms: "
    );

    highlight.searchTerms = videoSearchTerms;

    await generateVideo(highlight);

    rl.close();
  } catch (error) {
    console.error("An error occurred in main:", error);
  }
})();
