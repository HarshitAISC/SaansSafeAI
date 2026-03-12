import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import { GoogleGenAI } from "@google/genai";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isProd = process.env.NODE_ENV === "production";
const PORT = 3000;

// Initialize Database
const db = new Database("saanssafe.db");
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT,
    role TEXT DEFAULT 'citizen',
    points INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS reports (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    image_url TEXT,
    location_lat REAL,
    location_lng REAL,
    status TEXT DEFAULT 'pending',
    confidence_score REAL,
    fire_intensity TEXT,
    smoke_density TEXT,
    ai_analysis TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS fire_events (
    id TEXT PRIMARY KEY,
    report_id TEXT,
    location_lat REAL,
    location_lng REAL,
    intensity REAL,
    density REAL,
    heat_score INTEGER DEFAULT 0,
    source TEXT DEFAULT 'citizen',
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    resolved INTEGER DEFAULT 0
  );
`);

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
    },
  });

  app.use(express.json({ limit: '50mb' }));

  // Request logging for API
  app.use("/api/*", (req, res, next) => {
    console.log(`[API] ${req.method} ${req.originalUrl}`);
    next();
  });

  // AI Pipeline using Gemini
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

  app.post("/api/reports/verify", async (req, res) => {
    const { image, lat, lng, userId } = req.body;
    
    if (!image || !lat || !lng) {
      return res.status(400).json({ error: "Missing required fields: image, lat, or lng" });
    }

    try {
      console.log(`[AI Pipeline] Verifying report from user ${userId} at ${lat}, ${lng}`);
      const model = "gemini-3-flash-preview";
      const prompt = `
        You are an expert fire and smoke detection system for the SaansSafe platform in Delhi.
        Your task is to analyze the provided image with high sensitivity for any signs of:
        1. Open fires (garbage burning, leaf burning, small bonfires, or large blazes).
        2. Smoke plumes (thick black smoke, grey smoke, or even faint white smoke rising from a point source).
        3. Illegal industrial or residential emissions.

        Be vigilant. Even small, distant, or early-stage fires/smoke are critical for air quality monitoring.
        If you see any orange/red glow, flickering flames, or localized smoke rising, mark it as detected.

        Return a JSON object with:
        {
          "detected": boolean,
          "type": "fire" | "smoke" | "both" | "none",
          "confidence": number (0-1),
          "intensity": "low" | "medium" | "high",
          "density": "low" | "medium" | "high",
          "heat_score": number (0-100) based on fire size and intensity,
          "description": "A detailed explanation of what you see, including the location of the fire/smoke in the image."
        }
      `;

      // Extract MIME type and data from base64 string
      const mimeTypeMatch = image.match(/^data:(image\/[a-zA-Z+]+);base64,/);
      const mimeType = mimeTypeMatch ? mimeTypeMatch[1] : "image/jpeg";
      const base64Data = image.includes(",") ? image.split(",")[1] : image;

      const response = await ai.models.generateContent({
        model,
        contents: [
          {
            parts: [
              { text: prompt },
              { inlineData: { mimeType, data: base64Data } }
            ]
          }
        ],
        config: { responseMimeType: "application/json" }
      });

      if (!response.candidates || response.candidates.length === 0) {
        console.error("[AI Pipeline] No candidates returned from model");
        return res.status(500).json({ error: "AI model failed to generate a response" });
      }

      const text = response.text || "{}";
      console.log(`[AI Pipeline] Model response: ${text}`);
      
      let result;
      try {
        result = JSON.parse(text);
      } catch (parseError) {
        console.error("[AI Pipeline] JSON Parse Error:", parseError, "Raw text:", text);
        return res.status(500).json({ error: "Failed to parse AI response", raw: text });
      }
      
      const reportId = Math.random().toString(36).substring(7);
      
      if (result.detected) {
        db.prepare(`
          INSERT INTO reports (id, user_id, image_url, location_lat, location_lng, status, confidence_score, fire_intensity, smoke_density, ai_analysis)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(reportId, userId, "uploaded_image", lat, lng, 'verified', result.confidence, result.intensity, result.density, result.description);

        const eventId = Math.random().toString(36).substring(7);
        db.prepare(`
          INSERT INTO fire_events (id, report_id, location_lat, location_lng, intensity, density, heat_score, source)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(eventId, reportId, lat, lng, result.intensity === 'high' ? 1.0 : 0.5, result.density === 'high' ? 1.0 : 0.5, result.heat_score || 50, 'citizen');

        const incident = {
          id: eventId,
          location_lat: lat,
          location_lng: lng,
          intensity: result.intensity,
          density: result.density,
          heat_score: result.heat_score || 50,
          source: 'citizen',
          timestamp: new Date().toISOString()
        };

        // Broadcast to all clients
        io.emit("new_incident", incident);
        console.log(`[AI Pipeline] Incident verified and broadcasted: ${eventId}`);
      }

      res.json(result);
    } catch (error) {
      console.error("[AI Pipeline] Verification Error:", error);
      res.status(500).json({ error: "Failed to verify report", details: error instanceof Error ? error.message : String(error) });
    }
  });

  app.get("/api/incidents", (req, res) => {
    try {
      const { timeframe } = req.query;
      let query = "SELECT * FROM fire_events WHERE resolved = 0";
      let params: any[] = [];

      if (timeframe === 'previous_night') {
        // Delhi Night: 10 PM to 6 AM
        query = `
          SELECT * FROM fire_events 
          WHERE timestamp >= datetime('now', '-1 day', 'start of day', '+22 hours')
          AND timestamp <= datetime('now', 'start of day', '+6 hours')
        `;
      }

      const incidents = db.prepare(query).all(...params);
      res.json(incidents);
    } catch (error) {
      console.error("Error fetching incidents:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.get("/api/predictive-model", (req, res) => {
    try {
      // Simulated Predictive Model Logic
      // In reality, this would call the Python PredictivePollutionModel
      const predictions = [
        { lat: 28.7041, lng: 77.1025, probability: 0.85, reason: "Low wind speed + High historical incidents" },
        { lat: 28.5272, lng: 77.0689, probability: 0.62, reason: "Temperature inversion predicted" },
        { lat: 28.6507, lng: 77.2334, probability: 0.45, reason: "Normal atmospheric conditions" }
      ];
      res.json(predictions);
    } catch (error) {
      console.error("Error fetching predictions:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.post("/api/simulate/camera", (req, res) => {
    try {
      const { lat: customLat, lng: customLng, heat_score: customHeat } = req.body || {};
      
      const eventId = Math.random().toString(36).substring(7);
      const lat = customLat || (28.6139 + (Math.random() - 0.5) * 0.2);
      const lng = customLng || (77.2090 + (Math.random() - 0.5) * 0.2);
      const heatScore = customHeat || (Math.floor(Math.random() * 60) + 40); // 40-100
      
      db.prepare(`
        INSERT INTO fire_events (id, report_id, location_lat, location_lng, intensity, density, heat_score, source)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(eventId, 'camera_auto', lat, lng, heatScore > 70 ? 1.0 : 0.5, heatScore > 70 ? 1.0 : 0.5, heatScore, 'camera');

      const incident = {
        id: eventId,
        location_lat: lat,
        location_lng: lng,
        intensity: heatScore > 70 ? 'high' : 'medium',
        density: heatScore > 70 ? 'high' : 'medium',
        heat_score: heatScore,
        source: 'camera',
        timestamp: new Date().toISOString()
      };

      io.emit("new_incident", incident);
      res.json(incident);
    } catch (error) {
      console.error("Error simulating camera:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.post("/api/simulate/seed", (req, res) => {
    try {
      const locations = [
        { lat: 28.7041, lng: 77.1025 }, // Rohini
        { lat: 28.5272, lng: 77.0689 }, // Dwarka
        { lat: 28.6507, lng: 77.2334 }, // Chandni Chowk
        { lat: 28.5355, lng: 77.3910 }, // Noida Border
        { lat: 28.6139, lng: 77.2090 }  // Central
      ];

      locations.forEach((loc, i) => {
        const eventId = `seed_${Math.random().toString(36).substring(7)}`;
        const heatScore = Math.floor(Math.random() * 50) + 50;
        
        // Create historical data (Previous Night: 11 PM)
        const timestamp = new Date();
        timestamp.setDate(timestamp.getDate() - 1);
        timestamp.setHours(23, Math.floor(Math.random() * 59), 0);

        db.prepare(`
          INSERT INTO fire_events (id, report_id, location_lat, location_lng, intensity, density, heat_score, source, timestamp)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(eventId, 'seed_data', loc.lat, loc.lng, 0.8, 0.8, heatScore, 'camera', timestamp.toISOString());
      });

      res.json({ status: "Historical data seeded" });
    } catch (error) {
      console.error("Error seeding data:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.post("/api/simulate/nightly-cv", (req, res) => {
    try {
      // Simulate OpenCV processing of a nightly CCTV feed
      // This creates a series of incidents for the previous night
      const locations = [
        { lat: 28.7041, lng: 77.1025, name: "Rohini Sector 11" },
        { lat: 28.5272, lng: 77.0689, name: "Dwarka Sector 6" },
        { lat: 28.6507, lng: 77.2334, name: "Chandni Chowk" },
        { lat: 28.5355, lng: 77.3910, name: "Noida Border" },
        { lat: 28.6139, lng: 77.2090, name: "Central Delhi" },
        { lat: 28.6821, lng: 77.1325, name: "Pitampura" },
        { lat: 28.5450, lng: 77.1900, name: "Hauz Khas" }
      ];

      locations.forEach((loc, i) => {
        // Simulate multiple detections per location at different times of the night
        for (let j = 0; j < 3; j++) {
          const eventId = `cv_night_${Math.random().toString(36).substring(7)}`;
          const heatScore = Math.floor(Math.random() * 70) + 30; // 30-100
          
          // Create historical data (Previous Night: 10 PM to 4 AM)
          const timestamp = new Date();
          timestamp.setDate(timestamp.getDate() - 1);
          timestamp.setHours(22 + Math.floor(Math.random() * 6), Math.floor(Math.random() * 59), 0);
          if (timestamp.getHours() >= 24) timestamp.setHours(timestamp.getHours() - 24);

          db.prepare(`
            INSERT INTO fire_events (id, report_id, location_lat, location_lng, intensity, density, heat_score, source, timestamp)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(eventId, 'cv_auto_night', loc.lat, loc.lng, heatScore > 70 ? 1.0 : 0.5, heatScore > 70 ? 1.0 : 0.5, heatScore, 'cctv_cv', timestamp.toISOString());
        }
      });

      res.json({ status: "Nightly OpenCV analysis complete. Heatmap prepared." });
    } catch (error) {
      console.error("Error running nightly CV:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.get("/api/analytics", (req, res) => {
    try {
      const stats = db.prepare(`
        SELECT 
          date(timestamp) as date, 
          count(*) as count 
        FROM fire_events 
        GROUP BY date(timestamp)
        LIMIT 7
      `).all();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching analytics:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // Explicit 404 for API routes to prevent falling back to HTML
  app.use("/api/*", (req, res) => {
    res.status(404).json({ error: `API route not found: ${req.originalUrl}` });
  });

  // Vite middleware
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
