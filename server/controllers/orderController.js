import Order from "../models/Order.js";
import Product from "../models/Product.js";
import stripe from 'stripe'
import User from "../models/User.js"

// place order at COD - /api/order/cod
export const placeOrderCOD = async (req, res) => {
    try {
        const {userId, items, address} = req.body;
        
        if(!address || items.length == 0) {
            return res.json({success: false, message: "Invalid Data"});
        }

        let amount = await items.reduce( async (acc, item) => {
            const product = await Product.findById(item.product);
            return ((await acc) + product.offerPrice * item.quantity);
        }, 0)

        // adding tax charges - 
        amount = amount + Math.floor(amount * 0.02);

        await Order.create({
            userId, 
            items, 
            amount, 
            address, 
            paymentType: "COD"
        });
        return res.json({success: true, message: "Order Placed Succesfully"})
    } catch (error) {
        console.log(error.message);
        res.json({success: false, message: error.message});
    }
}

// Stripe Code 

// place order Stripe - /api/order/stripe
export const placeOrderStripe = async (req, res) => {
    try {
        const {userId, items, address} = req.body;
        const {origin} = req.headers;


        if(!address || items.length == 0) {
            return res.json({success: false, message: "Invalid Data"});
        }

        let productData = [];

        let amount = await items.reduce( async (acc, item) => {
            const product = await Product.findById(item.product);
            productData.push({
                name: product.name,
                price: product.offerPrice,
                quantity: item.quantity
            });
            return ((await acc) + product.offerPrice * item.quantity);
        }, 0)

        // adding tax charges - 
        amount = amount + Math.floor(amount * 0.02);

        const order = await Order.create({
            userId, 
            items, 
            amount, 
            address, 
            paymentType: "Online"
        });
        
        // stripe gateway 
        const stripeInstance = new stripe(process.env.STRIPE_SECRET_KEY);

        // create line items for stripe 
        const line_items = productData.map( (item) => {
            return {
                price_data: {
                    currency: "usd",
                    product_data: {
                        name: item.name,
                    },
                    unit_amount: Math.floor(item.price + item.price * 0.02) * 100
                },
                quantity: item.quantity,

            }
        } )

        // create Session 
        const session = await stripeInstance.checkout.sessions.create({
            line_items,
            mode: "payment",
            success_url: `${origin}/loader?next=my-orders`,
            cancel_url: `${origin}/cart`,
            metadata: {
                orderId: order._id.toString(),
                userId,
            }
        })

        return res.json({success: true, url: session.url})
    } catch (error) {
        console.log(error.message);
        res.json({success: false, message: error.message});
    }
}

// stripe webHooks to verify payments action : /stripe 
export const stripeWebhooks = async (req, res) => {
    // stripe gateway 
    const stripeInstance = new stripe(process.env.STRIPE_SECRET_KEY);

    const sig = req.headers["stripe-signature"];
    let event;

    try {
        event = stripeInstance.webhooks.constructEvent(
            req.body,
            sig,
            process.env.STRIPE_WEBHOOK_SECRET
        )
    } catch (error) {
        res.status(400).send(`web-hook error ${error.message}`);
    }

    // handle-event 
    switch (event.type) {
        case "payment_intent.succeeded": {
            const paymentIntent = event.data.object;
            const paymentIntentId = paymentIntent.id;

            // getting session meta-data 
            const session = await stripeInstance.checkout.sessions.list({
                payment_intent: paymentIntentId,
            })

            const {orderId, userId} = session.data[0].metadata;

            // mark payment as paid
            await Order.findByIdAndUpdate(orderId, {isPaid: true});
            // clear cart data of user 
            await User.findByIdAndUpdate(userId, {cartItems: {}}) ;
            break;
        }
        case "payment_intent.payment_failed": {
            const paymentIntent = event.data.object;
            const paymentIntentId = paymentIntent.id;

            // getting session meta-data 
            const session = await stripeInstance.checkout.sessions.list({
                payment_intent: paymentIntentId,
            })

            const { orderId } = session.data[0].metadata;

            await Order.findByIdAndDelete(orderId);
            break;
        }
           
    
        default:
            console.error(`unhandeled event type ${event.type}`)
            break;
    }
    res.json({received: true});
}

// get orders by user ID - /api/order/user
export const getUserOrders = async (req, res) => {
    try {
        const { userId } = req.body;
        const orders = await Order.find({
            userId,
            $or:[
                {paymentType: "COD"},
                {isPaid: true}
            ]
        }).populate("items.product address").sort({createdAt: -1});
        return res.json({success: true, orders})
    } catch (error) {
        console.log(error.message);
        res.json({success: false, message: error.message})
    }
}

// get all orders for seller/admin - /api/order/seller
export const getAllOrders = async (req, res) => {
    try {
        const orders = await Order.find({
            $or:[
                {paymentType: "COD"},
                {isPaid: true}
            ]
        }).populate("items.product address").sort({createdAt: -1});
        return res.json({success: true, orders})
    } catch (error) {
        console.log(error.message);
        res.json({success: false, message: error.message});
    }
}