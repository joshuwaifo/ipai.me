import { NextResponse } from "next/server";
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
    const promptText =
      mediaType === "video"
        ? `Analyze this football play from a ${perspective}'s perspective at ${currentTime} seconds into the video. For each team, provide 3 recommended actions, 1 sentence each, with their percentage probabilities. Consider both real-life and video game scenarios. Before providing the final answer, take time to think, show your working out and make sure the percentage probabilities sum up to 100. Format your response as JSON with the following structure:
      {
        "team1": [
          { "action": "Action description", "probability": XX },
          { "action": "Action description", "probability": XX },
          { "action": "Action description", "probability": XX }
        ],
        "team2": [
          { "action": "Action description", "probability": XX },
          { "action": "Action description", "probability": XX },
          { "action": "Action description", "probability": XX }
        ]
      }`
        : `Analyze this football play image from a ${perspective}'s perspective. For each team, provide 3 recommended actions with their percentage probabilities. Consider both real-life and video game scenarios. Before providing the final answer, take time to think, show your working out and make sure the percentage probabilities sum up to 100. Format your response as JSON with the following structure:
      {
        "team1": [
          { "action": "Action description", "probability": XX },
          { "action": "Action description", "probability": XX },
          { "action": "Action description", "probability": XX }
        ],
        "team2": [
          { "action": "Action description", "probability": XX },
          { "action": "Action description", "probability": XX },
          { "action": "Action description", "probability": XX }
        ]
      }`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      response_format: {
        type: "json_object",
      },
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

    console.log("Raw AI response:", response.choices[0].message.content);

    let recommendedActions;
    try {
      recommendedActions = JSON.parse(response.choices[0].message.content);
    } catch (parseError) {
      console.error("Error parsing AI response:", parseError);
      recommendedActions = {
        team1: [{ action: "Error parsing AI response", probability: 100 }],
        team2: [{ action: "Error parsing AI response", probability: 100 }],
      };
    }

    // Ensure the structure is correct
    if (!recommendedActions.team1 || !recommendedActions.team2) {
      throw new Error("Invalid response structure from AI");
    }

    return NextResponse.json({ recommendedActions });
  } catch (error) {
    console.error("Error analysing football content:", error);
    return NextResponse.json(
      {
        recommendedActions: {
          team1: [
            {
              action: "Error analysing, please make sure data is appropriate",
              probability: 100,
            },
          ],
          team2: [
            {
              action: "Error analysing, please make sure data is appropriate",
              probability: 100,
            },
          ],
        },
      },
      { status: 500 },
    );
  } finally {
    // Clean up: delete the temporary file
    await unlink(filePath);
  }
}
