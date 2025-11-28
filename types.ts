
export interface Choice {
  id: string;
  text: string;
}

export interface Inventory {
  onPerson: string[];
  inPack: string[];
  atCampOrVehicle: string[];
}

export interface ScoreBreakdown {
  navigation: number;
  weather: number;
  groupSafety: number;
  riskManagement: number;
  timing: number;
}

export type ScenarioTheme = 'normal' | 'night' | 'heat';

export interface Scenario {
  id: string;
  title: string;
  description: string;
  theme: ScenarioTheme; 
  location: {
    name: string;
    lat: number;
    lng: number;
    terrainType: string;
    mapUrl?: string;
  };
  environment: {
    timeOfDay: string;
    weather: string;
    temperature: string;
    visibility: 'Good' | 'Fair' | 'Poor';
    signalStrength: 'None' | 'Weak' | 'Strong';
    distanceFromSafety: string;
  };
  inventory: Inventory;
  choices: Choice[];
  turnCount: number;
  estimatedDuration: number; // Target number of turns to survive
}

export interface GameState {
  phase: 'disclaimer' | 'menu' | 'loading' | 'playing' | 'summary';
  currentScenario: Scenario | null;
  history: Array<{
    scenarioDescription: string;
    choice: string;
    outcome: string;
    scoreDeltas: Partial<ScoreBreakdown>;
  }>;
  scores: ScoreBreakdown;
  totalTurns: number;
  gameOverReason?: string;
}

export interface EvaluationResult {
  outcomeText: string;
  scoreDeltas: Partial<ScoreBreakdown>;
  isGameOver: boolean;
  gameOverReason?: string;
  nextScenarioPart?: Partial<Scenario>;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  isThinking?: boolean;
}
