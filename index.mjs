import "dotenv/config";
import _sample from "lodash/sample.js";
import fs from "fs";
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

    // Generate all highlights
    // const limit = highlights.length;

    // for (let i = 0; i < limit; i++) {
    //   await generateVideo(highlights[i]);
    // }

    // Generate random highlight
    // await generateVideo(
    //   _sample(highlights.filter(h => h.text.length <= maxChars))
    // );

    // await generateVideo(_sample(highlights));

    // Generate specific highlight
    await generateVideo(highlights[7]);
    // await generateVideo(highlights[0]);
    // await generateVideo(highlights[1]);
  } catch (error) {
    console.error("An error occurred in main:", error);
  }
})();
