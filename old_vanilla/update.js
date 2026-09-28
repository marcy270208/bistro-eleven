const fs = require('fs');
let content = fs.readFileSync('app.js', 'utf8');

const newDishesStr = 
  , { id: 'lava-cake', name: 'Chocolate Lava Cake', description: 'Warm chocolate cake with a gooey molten center, dusted with powdered sugar.', price: 25000, image: 'images/lava_cake.png' }
  , { id: 'pancakes', name: 'Berry & Butter Pancakes', description: 'Fluffy pancakes topped with fresh berries, butter, and maple syrup.', price: 28000, image: 'images/pancakes.png' }
  , { id: 'orange-juice', name: 'Fresh Orange Juice', description: 'Freshly squeezed orange juice served with mint and ice.', price: 15000, image: 'images/orange_juice.png' }
  , { id: 'strawberry-smoothie', name: 'Strawberry Smoothie', description: 'Creamy strawberry smoothie blended with fresh mint.', price: 18000, image: 'images/strawberry_smoothie.png' }
;

content = content.replace(/(id: 'pizza-pep'.*?\})/, $1 + newDishesStr);

const migrationScript = 
// Migration to add new dishes
try {
  let saved = JSON.parse(localStorage.getItem('adminDishes'));
  if (saved) {
    const newIds = ['lava-cake', 'pancakes', 'orange-juice', 'strawberry-smoothie'];
    const newItems = startingDishes.filter(d => newIds.includes(d.id));
    for (let item of newItems) {
      if (!saved.find(d => d.id === item.id)) {
        saved.push(item);
      }
    }
    localStorage.setItem('adminDishes', JSON.stringify(saved));
  }
} catch (e) {}
;

content = content.replace('const getDishes =', migrationScript + '\nconst getDishes =');

fs.writeFileSync('app.js', content);
