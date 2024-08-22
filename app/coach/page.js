"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function Component() {
  const [file, setFile] = useState(null);
  const [mediaType, setMediaType] = useState(null);
  const [mediaSrc, setMediaSrc] = useState(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [gameState, setGameState] = useState("");
  const [perspective, setPerspective] = useState("Coach");
  const [recommendedActions, setRecommendedActions] = useState({
    team1: [],
    team2: [],
  });
  const videoRef = useRef(null);

  const handleFileChange = (event) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      const fileType = selectedFile.type.split("/")[0];
      setMediaType(fileType);
      setMediaSrc(URL.createObjectURL(selectedFile));
      setGameState(
        `${fileType.charAt(0).toUpperCase() + fileType.slice(1)} uploaded`,
      );
    }
  };

  const handleSeek = (event) => {
    const time = parseFloat(event.target.value);
    setCurrentTime(time);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
    }
    setGameState(`Video seeked to ${time.toFixed(2)} seconds`);
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  const handleAnalyse = async () => {
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("mediaType", mediaType || "");
    formData.append("currentTime", currentTime.toString());
    formData.append("perspective", perspective);

    try {
      const response = await fetch("/api/analyse-football", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Analysis failed");
      }

      const result = await response.json();
      if (
        result.recommendedActions &&
        result.recommendedActions.team1 &&
        result.recommendedActions.team2
      ) {
        setRecommendedActions(result.recommendedActions);
      } else {
        throw new Error("Invalid response structure");
      }
    } catch (error) {
      console.error("Error analysing content:", error);
      setRecommendedActions({
        team1: [
          {
            action: "An error occurred while analysing the football content.",
            probability: 100,
          },
        ],
        team2: [
          {
            action: "An error occurred while analysing the football content.",
            probability: 100,
          },
        ],
      });
    }
  };

  return (
    <div className="container mx-auto p-4">
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Football AI Coach</CardTitle>
        </CardHeader>
        <CardContent>
          <h3 className="text-lg font-semibold mb-2">Game State:</h3>
          <Input
            type="file"
            accept="video/*,image/*"
            onChange={handleFileChange}
            className="mb-4"
          />

          {mediaSrc && (
            <div className="mb-4">
              {mediaType === "video" ? (
                <>
                  <video
                    ref={videoRef}
                    src={mediaSrc}
                    controls
                    onLoadedMetadata={handleLoadedMetadata}
                    className="w-full"
                  />
                  <Input
                    type="range"
                    min="0"
                    max={duration}
                    value={currentTime}
                    onChange={handleSeek}
                    className="w-full mt-2"
                  />
                </>
              ) : (
                <img src={mediaSrc} alt="Uploaded content" className="w-full" />
              )}
            </div>
          )}
          <div className="mb-4">
            <h3 className="text-lg font-semibold mb-2">Progress:</h3>
            <p>{gameState}</p>
          </div>
          <div className="mb-4">
            <h3 className="text-lg font-semibold mb-2">Perspective:</h3>
            <Select value={perspective} onValueChange={setPerspective}>
              <SelectTrigger>
                <SelectValue placeholder="Select perspective" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Gamer">Gamer</SelectItem>
                <SelectItem value="Coach">Coach</SelectItem>
                <SelectItem value="Player">Player</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleAnalyse}>Analyse Play</Button>
        </CardContent>
      </Card>
      <Card>
        <CardTitle className="m-4">Recommended Actions:</CardTitle>
        <Card className="mb-4">
          <CardHeader>
            <CardTitle>Team 1</CardTitle>
          </CardHeader>
          <CardContent>
            {recommendedActions.team1.map((action, index) => (
              <div key={index} className="mb-2">
                <p>
                  <strong>{action.probability}%:</strong> {action.action}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Team 2</CardTitle>
          </CardHeader>
          <CardContent>
            {recommendedActions.team2.map((action, index) => (
              <div key={index} className="mb-2">
                <p>
                  <strong>{action.probability}%:</strong> {action.action}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      </Card>
    </div>
  );
}
