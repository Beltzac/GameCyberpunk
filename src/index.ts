// src/index.ts
import { GameEngine } from './core/GameEngine';
import { JoaoScene } from './scenes/JoaoScene';
import { NyxScene } from './scenes/NyxScene';
// Import other necessary managers or utilities if needed later
// import { AssetLoader } from './utils/AssetLoader';
// import { UIManager } from './ui/UIManager';

// --- Main Application Setup ---

// 1. Get the Canvas Element
const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;

if (!canvas) {
    throw new Error("Could not find canvas element with id 'game-canvas'");
}

// 2. Initialize the Game Engine
console.log("Initializing Game Engine...");
const gameEngine = new GameEngine(canvas);

// Optional: Instantiate other managers if they are needed outside the engine scope
// const assetLoader = new AssetLoader();
// const uiManager = new UIManager();

// 3. Create Scene Instances
// Pass any required managers (like AssetLoader, UIManager) to scene constructors if needed
const joaoScene = new JoaoScene(/* pass managers here if needed */);
const nyxScene = new NyxScene(/* pass managers here if needed */);

// 4. Add Scenes to the Scene Manager
gameEngine.sceneManager.addScene('joao', joaoScene);
gameEngine.sceneManager.addScene('nyx', nyxScene);

// 5. Set the Initial Scene
gameEngine.sceneManager.setScene('joao'); // Start with Joao's scene

// 6. Start the Game Engine's Main Loop
gameEngine.start();

console.log('AION Game Engine started.');

// Optional: Add cleanup logic if needed (e.g., for hot module replacement)
// if (module.hot) {
//     module.hot.dispose(() => {
//         console.log('Disposing game engine...');
//         gameEngine.dispose();
//     });
// }