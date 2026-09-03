export interface FoodItem {
  id: string;
  name: string;
  brand?: string;
  servingLabel: string; // e.g. "1 scoop (32g)"
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
}

/**
 * A stand-in for a real food database (MyFitnessPal, Nutritionix, USDA
 * FoodData Central, or scanning a label's barcode/OCR would all plug in
 * here in production — this app has no live connection to any of them,
 * so search only matches what's in this local list).
 */
export const foodDatabase: FoodItem[] = [
  { id: "f1", name: "Chicken Breast, grilled", servingLabel: "100 g", kcal: 165, protein: 31, carbs: 0, fat: 3.6 },
  { id: "f2", name: "White Rice, cooked", servingLabel: "1 cup (158g)", kcal: 205, protein: 4.3, carbs: 45, fat: 0.4 },
  { id: "f3", name: "Brown Rice, cooked", servingLabel: "1 cup (195g)", kcal: 216, protein: 5, carbs: 45, fat: 1.8 },
  { id: "f4", name: "Whole Eggs", servingLabel: "1 large", kcal: 72, protein: 6.3, carbs: 0.4, fat: 4.8 },
  { id: "f5", name: "Egg Whites", servingLabel: "1 cup (243g)", kcal: 126, protein: 26, carbs: 1.8, fat: 0.4 },
  { id: "f6", name: "Rolled Oats, dry", servingLabel: "1/2 cup (40g)", kcal: 150, protein: 5, carbs: 27, fat: 3 },
  { id: "f7", name: "Whey Protein Powder", brand: "Optimum Nutrition", servingLabel: "1 scoop (32g)", kcal: 120, protein: 24, carbs: 3, fat: 1 },
  { id: "f8", name: "Banana", servingLabel: "1 medium (118g)", kcal: 105, protein: 1.3, carbs: 27, fat: 0.4 },
  { id: "f9", name: "Blueberries", servingLabel: "1 cup (148g)", kcal: 84, protein: 1.1, carbs: 21, fat: 0.5 },
  { id: "f10", name: "Greek Yoghurt, nonfat", brand: "Fage", servingLabel: "170 g", kcal: 100, protein: 18, carbs: 6, fat: 0 },
  { id: "f11", name: "Almonds", servingLabel: "1 oz (28g)", kcal: 164, protein: 6, carbs: 6, fat: 14 },
  { id: "f12", name: "Peanut Butter", servingLabel: "2 tbsp (32g)", kcal: 190, protein: 8, carbs: 6, fat: 16 },
  { id: "f13", name: "Avocado", servingLabel: "1/2 fruit (100g)", kcal: 160, protein: 2, carbs: 9, fat: 15 },
  { id: "f14", name: "Salmon, cooked", servingLabel: "100 g", kcal: 208, protein: 20, carbs: 0, fat: 13 },
  { id: "f15", name: "Ground Beef, 90/10, cooked", servingLabel: "100 g", kcal: 217, protein: 26, carbs: 0, fat: 12 },
  { id: "f16", name: "Sweet Potato, baked", servingLabel: "1 medium (150g)", kcal: 130, protein: 2.3, carbs: 30, fat: 0.2 },
  { id: "f17", name: "Broccoli, steamed", servingLabel: "1 cup (156g)", kcal: 55, protein: 3.7, carbs: 11, fat: 0.6 },
  { id: "f18", name: "Mixed Greens", servingLabel: "2 cups (60g)", kcal: 15, protein: 1.5, carbs: 3, fat: 0.2 },
  { id: "f19", name: "Whole Wheat Bread", servingLabel: "1 slice (28g)", kcal: 80, protein: 4, carbs: 14, fat: 1 },
  { id: "f20", name: "Bagel, plain", servingLabel: "1 bagel (105g)", kcal: 289, protein: 11, carbs: 56, fat: 1.7 },
  { id: "f21", name: "Cottage Cheese, low-fat", servingLabel: "1 cup (226g)", kcal: 163, protein: 28, carbs: 6.2, fat: 2.3 },
  { id: "f22", name: "Protein Bar", brand: "Quest", servingLabel: "1 bar (60g)", kcal: 190, protein: 21, carbs: 22, fat: 8 },
  { id: "f23", name: "Tortilla, flour", servingLabel: "1 large (64g)", kcal: 180, protein: 5, carbs: 30, fat: 4 },
  { id: "f24", name: "Black Beans, cooked", servingLabel: "1 cup (172g)", kcal: 227, protein: 15, carbs: 41, fat: 0.9 },
  { id: "f25", name: "Olive Oil", servingLabel: "1 tbsp (14g)", kcal: 119, protein: 0, carbs: 0, fat: 14 },
  { id: "f26", name: "Whole Milk", servingLabel: "1 cup (244g)", kcal: 149, protein: 8, carbs: 12, fat: 8 },
  { id: "f27", name: "Skim Milk", servingLabel: "1 cup (245g)", kcal: 83, protein: 8.3, carbs: 12, fat: 0.2 },
  { id: "f28", name: "Apple", servingLabel: "1 medium (182g)", kcal: 95, protein: 0.5, carbs: 25, fat: 0.3 },
  { id: "f29", name: "Pasta, cooked", servingLabel: "1 cup (140g)", kcal: 221, protein: 8, carbs: 43, fat: 1.3 },
  { id: "f30", name: "Turkey Breast, sliced", servingLabel: "100 g", kcal: 135, protein: 24, carbs: 3.5, fat: 2.7 },
  { id: "f31", name: "Tuna, canned in water", servingLabel: "1 can (142g)", kcal: 128, protein: 29, carbs: 0, fat: 0.8 },
  { id: "f32", name: "Shrimp, cooked", servingLabel: "100 g", kcal: 99, protein: 24, carbs: 0.2, fat: 0.3 },
  { id: "f33", name: "White Potato, baked", servingLabel: "1 medium (173g)", kcal: 161, protein: 4.3, carbs: 37, fat: 0.2 },
  { id: "f34", name: "Cheddar Cheese", servingLabel: "1 oz (28g)", kcal: 113, protein: 7, carbs: 0.4, fat: 9.3 },
  { id: "f35", name: "Hummus", servingLabel: "2 tbsp (30g)", kcal: 70, protein: 2, carbs: 6, fat: 5 },
];

export function scaleFood(food: FoodItem, servings: number) {
  return {
    kcal: Math.round(food.kcal * servings),
    protein: Math.round(food.protein * servings * 10) / 10,
    carbs: Math.round(food.carbs * servings * 10) / 10,
    fat: Math.round(food.fat * servings * 10) / 10,
  };
}
