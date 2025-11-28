
import { GoogleGenAI, Type } from "@google/genai";
import { Scenario, EvaluationResult, ChatMessage, ScoreBreakdown } from "../types";

// Initialize the API client
const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

const cleanAndParseJson = (text: string): any => {
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch (e) {
    // ignore
  }
  let clean = text.replace(/```json/g, '').replace(/```/g, '');
  const start = clean.indexOf('{');
  const end = clean.lastIndexOf('}');
  if (start !== -1 && end !== -1) {
    clean = clean.substring(start, end + 1);
  }
  try {
    return JSON.parse(clean);
  } catch (e) {
    console.error("JSON Parse Error", text);
    throw new Error("Invalid JSON format");
  }
};

// -- 1. Scenario Generation --
export const generateScenario = async (
  difficulty: string,
  environment: string,
  mode: 'Standard' | 'Night Ops' | 'Heat Wave' | 'Tiny Mistakes',
  customInput: string = ""
): Promise<Scenario> => {
  const ai = getAI();
  
  let modeInstructions = "";
  if (mode === 'Night Ops') modeInstructions = "The scenario MUST take place at dusk or night. Visibility is poor. Temperature is dropping. Theme: 'night'.";
  else if (mode === 'Heat Wave') modeInstructions = "The scenario MUST take place in extreme heat/sun. Dehydration is a major risk. Theme: 'heat'.";
  else if (mode === 'Tiny Mistakes') modeInstructions = "The scenario MUST start with the user realizing they made a small, realistic error (forgot water, missed a turn, left gear behind) that complicates things. Theme: 'normal'.";
  else modeInstructions = "Standard scenario. Theme: 'normal'.";

  const prompt = `
    Create a backcountry survival scenario.
    Difficulty: ${difficulty}
    Environment: ${environment}
    Game Mode: ${mode}
    ${modeInstructions}
    User Notes: ${customInput || "None"}
    
    Realistic, educational, no horror.
    Use Google Maps to find a real region fitting the description.
    
    Return ONLY JSON:
    {
      "title": "Short title",
      "description": "Situation description (2-3 sentences).",
      "theme": "normal" | "night" | "heat",
      "location": {
        "name": "Region Name",
        "lat": 0.0,
        "lng": 0.0,
        "terrainType": "Terrain description"
      },
      "environment": {
        "timeOfDay": "e.g. Dusk",
        "weather": "e.g. Clear",
        "temperature": "e.g. 35°C / 95°F",
        "visibility": "Good/Fair/Poor",
        "signalStrength": "None/Weak/Strong",
        "distanceFromSafety": "e.g. 5km"
      },
      "inventory": {
        "onPerson": ["Item 1"],
        "inPack": ["Item 2"],
        "atCampOrVehicle": ["Item 3"]
      },
      "choices": [
        { "id": "a", "text": "Option A" },
        { "id": "b", "text": "Option B" },
        { "id": "c", "text": "Option C" }
      ],
      "estimatedDuration": 5
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        tools: [{ googleMaps: {} }],
      }
    });

    const data = cleanAndParseJson(response.text || "{}");
    const mapUrl = response.candidates?.[0]?.groundingMetadata?.groundingChunks?.[0]?.maps?.uri;

    return {
      id: Date.now().toString(),
      turnCount: 1,
      estimatedDuration: data.estimatedDuration || 5,
      ...data,
      location: {
        ...data.location,
        mapUrl
      }
    };
  } catch (error) {
    console.error("Scenario generation failed:", error);
    return {
      id: "fallback",
      title: "Signal Lost",
      description: "Connection to the ranger station failed. Please retry.",
      theme: 'normal',
      location: { name: "Unknown", lat: 0, lng: 0, terrainType: "N/A" },
      environment: { timeOfDay: "?", weather: "?", temperature: "?", visibility: "Good", signalStrength: "None", distanceFromSafety: "?" },
      inventory: { onPerson: [], inPack: [], atCampOrVehicle: [] },
      choices: [{ id: "retry", text: "Retry Connection" }],
      turnCount: 0,
      estimatedDuration: 5
    };
  }
};

// -- 2. Fast Evaluation with Granular Scoring --
export const evaluateChoice = async (
  scenario: Scenario,
  choiceText: string,
  currentScores: ScoreBreakdown,
  history: Array<any> = []
): Promise<EvaluationResult> => {
  const ai = getAI();
  
  const historyContext = history.length > 0 
    ? history.map((h, i) => `Turn ${i+1}: Action="${h.choice}", Result="${h.outcome}"`).join('\n')
    : "None";

  const prompt = `
    Context: ${scenario.description}
    History: ${historyContext}
    Env: ${scenario.environment.weather}, ${scenario.environment.timeOfDay}, ${scenario.environment.temperature}
    Action: "${choiceText}"
    
    Evaluate this action. Return JSON.
    Calculate score deltas (-10 to +10) for: navigation, weather, groupSafety, riskManagement, timing.
    - Risk Management: Did they minimize unnecessary danger?
    - Timing: Did they act fast enough or too rashly?
    
    Structure:
    {
      "outcomeText": "What happens next...",
      "scoreDeltas": { "navigation": 0, "weather": 0, "groupSafety": 0, "riskManagement": 0, "timing": 0 },
      "isGameOver": boolean,
      "gameOverReason": "string or null",
      "nextScenarioDescription": "New situation description if continuing...",
      "nextChoices": [{ "id": "x", "text": "..." }]
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-lite',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        maxOutputTokens: 2000,
      }
    });

    const data = cleanAndParseJson(response.text || "{}");
    
    const result: EvaluationResult = {
      outcomeText: data.outcomeText || "Outcome processed.",
      scoreDeltas: data.scoreDeltas || {},
      isGameOver: !!data.isGameOver,
      gameOverReason: data.gameOverReason,
    };

    if (!data.isGameOver && data.nextScenarioDescription) {
      result.nextScenarioPart = {
        description: data.nextScenarioDescription,
        choices: data.nextChoices
      };
    }

    return result;

  } catch (error) {
    console.error("Evaluation failed", error);
    return {
      outcomeText: "System interference. Action recorded.",
      scoreDeltas: {},
      isGameOver: false
    };
  }
};

// -- 3. Deep Analysis / "What Could I Have Done Differently?" --
export const getDetailedAnalysis = async (
  history: Array<any>,
  finalScores: ScoreBreakdown
): Promise<string> => {
  const ai = getAI();
  
  const historyText = history.map((h, i) => `
    Turn ${i+1}:
    Situation: ${h.scenarioDescription}
    Action: ${h.choice}
    Result: ${h.outcome}
  `).join("\n---\n");

  const prompt = `
    Analyze this Backcountry Safety session.
    Final Scores: ${JSON.stringify(finalScores)}
    
    History:
    ${historyText}
    
    Provide a "What Could I Have Done Differently?" Report:
    1. **Key Turning Points**: Identify the exact moment things went right or wrong.
    2. **Better Alternatives**: Specifically, what option should they have picked and why?
    3. **Ideal Sequence**: Briefly describe the "Perfect Run" for this scenario.
    4. **Category Breakdown**: Comment on their lowest score category (e.g. if Nav is low, explain why).
    
    Tone: Constructive, educational, safety-focused. Markdown format.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: {
        thinkingConfig: { thinkingBudget: 4096 },
      }
    });
    
    return response.text || "Analysis unavailable.";
  } catch (e) {
    console.error("Analysis failed", e);
    return "Could not retrieve mission data.";
  }
};

export const chatWithCoach = async (
  history: ChatMessage[],
  context: string
): Promise<string> => {
  const ai = getAI();
  const conversation = history.map(h => `${h.role}: ${h.text}`).join('\n');
  const prompt = `
    Role: Expert Outdoor Safety Instructor.
    Context: ${context}
    Chat:
    ${conversation}
    
    Reply briefly and helpfully.
  `;
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text || "...";
  } catch (e) {
    return "Signal lost.";
  }
};
