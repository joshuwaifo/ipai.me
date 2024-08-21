import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { writeFile, unlink } from "fs/promises";
import path from "path";
import os from "os";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req) {
  const formData = await req.formData();
  const file = formData.get("file");
  const mediaType = formData.get("mediaType");
  const currentTime = formData.get("currentTime");
  const perspective = formData.get("perspective");

  if (!file) {
    return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  // Save the file temporarily
  const tempDir = os.tmpdir();
  const filePath = path.join(tempDir, file.name);
  await writeFile(filePath, buffer);

  try {
    // For video, you would need to extract the frame at the current time
    // This would require additional server-side processing with a library like ffmpeg
    // For this example, we'll assume we have the correct frame for videos

    const promptText =
      mediaType === "video"
        ? `Analyze this football play from a ${perspective}'s perspective at ${currentTime} seconds into the video. Provide a concise recommended action based on the current game situation, considering both real-life and video game scenarios.`
        : `Analyze this football play image from a ${perspective}'s perspective. Provide a concise recommended action based on the current game situation, considering both real-life and video game scenarios.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4-vision-preview",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: promptText },
            {
              type: "image_url",
              image_url: {
                url: `data:image/${file.type};base64,${buffer.toString("base64")}`,
              },
            },
          ],
        },
      ],
    });

    const recommendedAction = response.choices[0].message.content;

    return NextResponse.json({ recommendedAction });
  } catch (error) {
    console.error("Error analyzing football content:", error);
    return NextResponse.json(
      { error: "Error analyzing football content" },
      { status: 500 },
    );
  } finally {
    // Clean up: delete the temporary file
    await unlink(filePath);
  }
}
