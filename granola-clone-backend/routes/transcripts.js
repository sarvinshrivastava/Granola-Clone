const express = require("express");
const fs = require("fs");
const path = require("path");

const router = express.Router();
const dataPath = path.join(__dirname, "../data/transcripts.json");

// Helper to read/write data
const readData = () => JSON.parse(fs.readFileSync(dataPath, "utf-8"));
const writeData = (data) =>
  fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));

// GET all transcripts
router.get("/", (req, res) => {
  const transcripts = readData();
  res.json(transcripts);
});

// GET one transcript by id
router.get("/:id", (req, res) => {
  const transcripts = readData();
  const transcript = transcripts.find((t) => t.id.toString() === req.params.id);
  if (!transcript)
    return res.status(404).json({ message: "Transcript not found" });
  res.json(transcript);
});

// POST new transcript
router.post("/", (req, res) => {
  const transcripts = readData();
  const newTranscript = {
    id: Date.now(),
    title: req.body.title || "Untitled Meeting",
    date: new Date().toISOString().split("T")[0],
    content: req.body.content || "",
  };
  transcripts.push(newTranscript);
  writeData(transcripts);
  res.status(201).json(newTranscript);
});

module.exports = router;
