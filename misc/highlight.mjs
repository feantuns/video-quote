import "dotenv/config";
import _sample from "lodash/sample.js";
import fetch from "node-fetch";
import fs from "fs";
import ffmpeg from "fluent-ffmpeg";
import path from "path";

const READWISE_TOKEN = process.env.READWISE_TOKEN;
const READWISE_API_URL = `https://readwise.io/api/v2/review/`;

const OUTPUT_DIR = process.env.OUTPUT_DIR;

const maxChars = Number(process.env.MAX_CHARS);

export async function getHighlights() {
  const response = await fetch(READWISE_API_URL, {
    headers: {
      Authorization: `Token ${READWISE_TOKEN}`,
    },
  });
  const data = await response.json();

  return data.highlights;
}

export function getHighlightText(highlight) {
  let text = highlight.text.replace(/\n/g, " ");

  const description = `**${highlight.description}**\n${highlight.hashtags}\n`;

  text = text.length > maxChars ? `${text.slice(0, maxChars)}...` : text;

  fs.appendFile(
    `${OUTPUT_DIR}/${highlight.id}/log.txt`,
    `\nQuote:\n${JSON.stringify(
      highlight,
      null,
      2
    )}\nDescrição para o vídeo:\n${description}`,
    err => {
      if (err) {
        console.error("Error writing quote to log file:", err);
        return;
      }
    }
  );

  text = escapeFFmpegText(text);

  text = splitTextIntoMultiLines(text, 23);

  return text;
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

/**
 * Escapes special characters in text for use in FFmpeg's drawtext filter.
 * @param {string} text - The text to be escaped.
 * @returns {string} - The escaped text.
 */
function escapeFFmpegText(text) {
  if (!text) return "";

  // Escape backslashes and colons
  return text
    .replace(/\\/g, "\\\\") // Escape backslashes
    .replace(/:/g, "\\:") // Escape colons
    .replace(/'/g, "\\'") // Escape single quotes
    .replace(/"/g, '\\"') // Escape double quotes
    .replace(/\[/g, "\\[") // Escape square brackets
    .replace(/\]/g, "\\]") // Escape square brackets
    .replace(/%/g, "\\%"); // Escape percentage signs
}

export async function addTextToVideo({
  highlight,
  videoFilePath,
  text,
  video,
}) {
  const outputPath = path.join(
    OUTPUT_DIR,
    `${highlight.id}`,
    "video-with-text.mp4"
  );

  // Split the text into chunks
  const words = text.split(" ");
  const chunkSize = 1; // Number of words per chunk
  const chunks = [];
  for (let i = 0; i < words.length; i += chunkSize) {
    chunks.push(words.slice(i, i + chunkSize).join(" "));
  }

  // Generate drawtext filters for each chunk
  const duration = video.duration; // Total duration of the video in seconds
  const chunkDuration = duration / chunks.length; // Duration for each chunk
  const drawtextFilters = chunks
    .map((chunk, index) => {
      const startTime = index * chunkDuration;
      const endTime = startTime + chunkDuration;
      return `drawtext=text='${chunk}':fontcolor=white:fontfile=./assets/Roboto-Bold.ttf:shadowcolor=black:shadowx=2:shadowy=2:fontsize=60:x=(w-text_w)/2:y=(h-text_h)/2:alpha='if(between(t,${startTime},${endTime}),1,0)'`;
    })
    .join(",");

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
