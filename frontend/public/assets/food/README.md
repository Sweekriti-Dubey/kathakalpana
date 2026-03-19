# Food Assets Setup

This directory contains food images for the pet feeding feature in Katha Kalpana.

## Required Files

Add the following images to this directory in JPEG format:

1. **panipuri.jpeg** - Image of panipuri/gol gappa (the food item with sauces)
2. **burger.jpeg** - Image of a burger
3. **pizza.jpeg** - Image of a pizza
4. **apple.jpeg** - Image of a red apple

## Image Specifications

- **Format**: JPEG 
- **Size**: 300x300px recommended (will be displayed at 140px height)
- **File naming**: Use lowercase names exactly as listed above with .jpeg extension

## How to Add Images

1. Save your food images as JPEG files
2. Place them in this directory (`public/assets/food/`)
3. The filenames must match exactly:
   - `panipuri.jpeg`
   - `burger.jpeg`
   - `pizza.jpeg`
   - `apple.jpeg`

## Integration

Once images are added, they will automatically appear in the food feeding modal when users finish reading a story. The modal displays:
- A Lottie animation of the pet waiting for food
- 4 food option cards with images laid out in a 2x2 grid
- Food names displayed below each image
- Interactive hover and selection effects

## Reference

The food selection order in the popup is:
1. Top-left: Panipuri 🥣
2. Top-right: Burger 🍔
3. Bottom-left: Pizza 🍕
4. Bottom-right: Apple 🍎

