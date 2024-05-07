import { createApp } from './app.js';
import { createStore } from './store/index.js';
import { seedStore } from './seed.js';
import { config } from './config.js';

const store = createStore();
await store.init();
const seedResult = await seedStore(store);
console.log(`[Hotelora] DB adapter: ${store.constructor.name}, seed: ${JSON.stringify(seedResult)}`);
createApp(store).listen(config.port, () => {
  console.log(`[Hotelora] API chay tai http://localhost:${config.port}`);
});
