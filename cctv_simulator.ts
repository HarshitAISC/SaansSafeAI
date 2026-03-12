/**
 * CCTV Simulator for SAANSSAFE AI
 * This script simulates a camera capturing a frame and feeding it to the AI system.
 */

import { GoogleGenAI } from "@google/genai";
import Database from "better-sqlite3";
import axios from "axios";

// This is a conceptual script. In a real environment, this would run on an edge device (CCTV).
// It would capture a frame using OpenCV and send it to the SAANSSAFE backend.

async function simulateCCTVFeed(cameraUrl: string, location: { lat: number, lng: number }) {
  console.log(`[CCTV] Starting feed from ${cameraUrl}...`);
  
  // 1. Capture Image (Simulated)
  // In reality: const frame = cap.read();
  const mockImageUrl = `https://picsum.photos/seed/${Math.random()}/800/600`;
  
  try {
    const response = await axios.get(mockImageUrl, { responseType: 'arraybuffer' });
    const base64Image = Buffer.from(response.data, 'binary').toString('base64');

    console.log(`[CCTV] Frame captured. Feeding to AI system...`);

    // 2. Feed to AI System (SAANSSAFE Backend)
    // The backend uses Gemini 3.1 Flash to perform CV analysis
    const apiResponse = await axios.post('http://localhost:3000/api/reports/verify', {
      image: `data:image/jpeg;base64,${base64Image}`,
      lat: location.lat,
      lng: location.lng,
      userId: 'CCTV_SYSTEM_01'
    });

    const result = apiResponse.data;
    
    if (result.detected) {
      console.log(`[CCTV] 🔥 FIRE DETECTED!`);
      console.log(`[CCTV] Heat Score: ${result.heat_score}`);
      console.log(`[CCTV] Intensity: ${result.intensity}`);
      console.log(`[CCTV] Geotagged: ${location.lat}, ${location.lng}`);
      console.log(`[CCTV] Dashboard updated with new heatmap data.`);
    } else {
      console.log(`[CCTV] No fire detected in current frame.`);
    }

  } catch (error) {
    console.error(`[CCTV] Error in simulation:`, error);
  }
}

// Example usage (conceptual)
// simulateCCTVFeed('rtsp://camera-01.delhi.gov.in/live', { lat: 28.6139, lng: 77.2090 });
