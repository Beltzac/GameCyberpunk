// src/core/GameState.ts
export class GameState {
    public currentCharacter: 'Joao' | 'Nyx' | null = null;
    public currentSceneId: string | null = null;

    // Add other relevant game state properties here based on GDD
    // For example:
    // public inventory: string[] = [];
    // public playerPosition: { x: number, y: number, z: number } = { x: 0, y: 0, z: 0 };

    constructor() {
        // Initialize default state if needed
        console.log("GameState initialized");
    }

    // Methods to modify state can be added here
    public setScene(sceneId: string) {
        this.currentSceneId = sceneId;
        console.log(`GameState: Scene changed to ${sceneId}`);
    }

    public setCharacter(character: 'Joao' | 'Nyx') {
        this.currentCharacter = character;
        console.log(`GameState: Character set to ${character}`);
    }
}

// Optional: Singleton pattern if preferred
// export const gameState = new GameState();