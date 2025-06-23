import User from "../models/User.js";

// update user cart data - /api/cart/update
export const updateCart = async (req, res) => {
    try {
        const { userId, cartItems } = req.body;
        await User.findByIdAndUpdate(userId, {cartItems});
        return res.json({success: true, message: "cart Updated"})
    } catch (error) {
        console.log(error.message)
        res.json({success: false, message: error.message});
    }
}