import cookieParser from 'cookie-parser';
import express from 'express';
import cors from 'cors';
import connectDB from './configs/db.js';
import 'dotenv/config';
import userRouter from './routes/userRoute.js';
import sellerRouter from './routes/sellerRoute.js';
import connectCloudinary from './configs/cloudinary.js';
import productRouter from './routes/productRoute.js';
import cartRouter from './routes/cartRoute.js';
import addressRouter from './routes/addressRoute.js';
import orderRouter from './routes/orderRoute.js';
import { stripeWebhooks } from './controllers/orderController.js';

// creating express app
const app = express();
const port = process.env.PORT || 4000;

// Data-Base Connection 
await connectDB();
await connectCloudinary();

// allow origins to access our back-end - cors
const allowedOrigins = ['http://localhost:5173', 'https://gro-kart-three.vercel.app']

app.post('/stripe', express.raw({type: 'application/json'}), stripeWebhooks);

// Middleware configuration
app.use(express.json());
app.use(cookieParser());
app.use(cors({origin : allowedOrigins, credentials: true}));

// api testing
app.get('/', (req, res) => {
    res.send("API is working sir!!");
})

// routes 
app.use('/api/user', userRouter);
app.use('/api/seller', sellerRouter);
app.use('/api/product', productRouter);
app.use('/api/cart', cartRouter);
app.use('/api/address', addressRouter);
app.use('/api/order', orderRouter);

app.listen(port, () => {
    console.log(`Server is ruuning on http://localhost:${port}`);
})