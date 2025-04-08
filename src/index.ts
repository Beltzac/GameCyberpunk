import { GameEngine } from './core/GameEngine';
import { Cena1TrabalhoScene } from './scenes/Cena1TrabalhoScene';
import { Cena2RuaScene } from './scenes/Cena2RuaScene';
import { Cena3GaleriaScene } from './scenes/Cena3GaleriaScene';
import { StartMenuScene } from './scenes/StartMenuScene';
import { injectSpeedInsights } from '@vercel/speed-insights';
import { inject } from '@vercel/analytics';

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

const startMenuScene = new StartMenuScene(gameEngine, gameEngine.assetLoader, gameEngine.sceneManager);
const cena1TrabalhoScene = new Cena1TrabalhoScene(gameEngine, gameEngine.assetLoader, gameEngine.sceneManager);
const cena2RuaScene = new Cena2RuaScene(gameEngine, gameEngine.assetLoader, gameEngine.sceneManager);
const cena3GaleriaScene = new Cena3GaleriaScene(gameEngine, gameEngine.assetLoader, gameEngine.sceneManager);

// 4. Add Scenes to the Scene Manager
gameEngine.sceneManager.addScene('start_menu', startMenuScene);
gameEngine.sceneManager.addScene('cena1_trabalho', cena1TrabalhoScene);
gameEngine.sceneManager.addScene('cena2_rua', cena2RuaScene);
gameEngine.sceneManager.addScene('cena3_galeria', cena3GaleriaScene);

// 6. Start the Game Engine's Main Loop
await gameEngine.start();

console.log('AION Game Engine started.');