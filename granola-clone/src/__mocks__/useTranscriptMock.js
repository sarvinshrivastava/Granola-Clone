import { useEffect, useState } from "react";

const mockSentences = [
  "Welcome to the meeting.",
  "Today we will discuss our progress.",
  "The design phase is almost complete.",
  "Next steps include testing and deployment.",
];

export const useTranscriptMock = () => {
  const [transcript, setTranscript] = useState("");

  useEffect(() => {
    let index = 0;
    const interval = setInterval(() => {
      if (index < mockSentences.length) {
        setTranscript((prev) => prev + " " + mockSentences[index]);
        index++;
      } else {
        clearInterval(interval);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  return transcript;
};
