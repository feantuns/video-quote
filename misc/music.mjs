import "dotenv/config";
import _sample from "lodash/sample.js";
import fs from "fs";
import ffmpeg from "fluent-ffmpeg";
import path from "path";
import qs from "qs";
import axios from "axios";
import { sanitizeString } from "./sanitizestring.mjs";

const JAMENDO_CLIENT_ID = process.env.JAMENDO_CLIENT_ID; // You'll need to register and get a client ID
const JAMENDO_API_URL = "https://api.jamendo.com/v3.0/tracks";
const JAMENDO_MUSIC_TAGS = ["classical"];

const OUTPUT_DIR = process.env.OUTPUT_DIR;

export async function fetchMusicFromJamendo() {
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
export async function downloadMusic({ track, highlight }) {
  try {
    const response = await axios.get(track.audiodownload, {
      responseType: "stream",
    });

    const fileName = `${sanitizeString(track.name)}.mp3`;
    const musicFilePath = path.join(OUTPUT_DIR, highlight.id, fileName);
    const fileStream = fs.createWriteStream(musicFilePath);

    fs.appendFile(
      `${OUTPUT_DIR}/${highlight.id}/log.txt`,
      `🎵 ${track.name} by ${track.artist_name}\n\nMusica:\n${JSON.stringify(
        track,
        null,
        2
      )}`,
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

export async function addMusicToVideo({
  highlight,
  videoFilePath,
  musicFilePath,
}) {
  const outputPath = path.join(
    OUTPUT_DIR,
    `${highlight.id}`,
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
