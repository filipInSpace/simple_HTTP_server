
import express from 'express';
import axios from 'axios';

type Product = {
  productId: string;
  quantity: number;
};

type Position = {
  positionId: string;
  x: number;
  y: number;
  z: number;
  productId: string;
  quantity: number;
};

type ProductPosition = {
  productId: string;
  positionId: string;
  quantity: number;
};

const app = express();


app.get('/order-picking', async (req, res) => {

  
  const queryProducts = req.query.products;
  if (!Array.isArray(queryProducts) || queryProducts.length === 0) {
    res.status(400).send('Missing or invalid products to pick in the request');
    return;
  }
  const productsToPick: Product[] = Array.isArray(req.query.products) 
    ? req.query.products.map((p: any) => ({productId: p.productId, quantity: p.quantity}))
    : [];

  if (productsToPick.length === 0 || productsToPick.some(p => !p.productId || p.quantity <= 0)) {
    res.status(400).send('Missing or invalid products to pick in the request');
    return;
  }

  
  const productPositions: ProductPosition[] = [];
  for (const product of productsToPick) {
    
    const positionsResponse = await axios.get(
      `https://dev.aux.boxpi.com/case-study/products/${product.productId}/positions`,
      {
        headers: { 'x-api-key': 'MVGBMS0VQI555bTery9qJ91BfUpi53N24SkKMf9Z' },
      }
    );
    const positions = positionsResponse.data as Position[];

    
    const filteredPositions = positions.filter(
      (position) => position.quantity >= product.quantity - productPositions.filter(p => p.productId === product.productId).reduce((acc, p) => acc + p.quantity, 0) && position.productId === product.productId
    );

    
    filteredPositions.forEach((position) => {
      productPositions.push({
        productId: product.productId,
        positionId: position.positionId,
        quantity: position.quantity,
      });
    });
  }

  
  productPositions.sort((a, b) => a.quantity - b.quantity);

  
  const groupedProductPositions: Record<string, Record<string, number>> = {};
  for (const productPosition of productPositions) {
    const productId = productPosition.productId;
    const positionId = productPosition.positionId;
    if (!groupedProductPositions[productId]) {
      groupedProductPositions[productId] = {};
    }
    if (!groupedProductPositions[productId][positionId]) {
      groupedProductPositions[productId][positionId] = 0;
    }
    groupedProductPositions[productId][positionId] += productPosition.quantity;
  }
  
  const output: ProductPosition[] = [];
  for (const productId in groupedProductPositions) {
    for (const positionId in groupedProductPositions[productId]) {
      const quantity = groupedProductPositions[productId][positionId];
      output.push({ productId, positionId, quantity });
    }
  }

  res.send(JSON.stringify(output));
});


app.listen(3000, () => {
  console.log('Server is running on port 3000');
});
