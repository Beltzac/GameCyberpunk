// src/index.ts
import { GameEngine } from './core/GameEngine';
import { Cena1TrabalhoScene } from './scenes/Cena1TrabalhoScene';
import { Cena2RuaScene } from './scenes/Cena2RuaScene';
import { StartMenuScene } from './scenes/StartMenuScene';
import { injectSpeedInsights } from '@vercel/speed-insights';
import { inject } from '@vercel/analytics';

// Import other necessary managers or utilities if needed later
// import { AssetLoader } from './utils/AssetLoader';
// import { UIManager } from './ui/UIManager';

// --- Main Application Setup ---
inject();
injectSpeedInsights();

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

const startMenuScene = new StartMenuScene(gameEngine, gameEngine.assetLoader, gameEngine.sceneManager);
const cena1TrabalhoScene = new Cena1TrabalhoScene(gameEngine, gameEngine.assetLoader, gameEngine.sceneManager);
const cena2RuaScene = new Cena2RuaScene(gameEngine, gameEngine.assetLoader, gameEngine.sceneManager);

// 4. Add Scenes to the Scene Manager
gameEngine.sceneManager.addScene('start_menu', startMenuScene);
gameEngine.sceneManager.addScene('cena1_trabalho', cena1TrabalhoScene);
gameEngine.sceneManager.addScene('cena2_rua', cena2RuaScene);

// 5. Set the Initial Scene
//await gameEngine.sceneManager.setScene('start_menu');

// 6. Start the Game Engine's Main Loop
await gameEngine.start();

console.log('AION Game Engine started.');

// Optional: Add cleanup logic if needed (e.g., for hot module replacement)
// if (module.hot) {
//     module.hot.dispose(() => {
//         console.log('Disposing game engine...');
//         gameEngine.dispose();
//     });
// }