import { createContext, useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { dummyProducts } from "../assets/assets.js";
import toast from "react-hot-toast";
import axios from 'axios'

axios.defaults.withCredentials = true; // can send cookies 
axios.defaults.baseURL = import.meta.env.VITE_BACKEND_URL;

export const AppContext = createContext();

export const AppContextProvider = ({children}) => {

    const currency = import.meta.env.VITE_CURRENCY;

    const navigate = useNavigate(); 
    const [user, setUser] = useState(null);
    const [isSeller, setIsSeller] = useState(false);
    const [showUserLogin, setShowUserLogin] = useState(false);
    const [products, setProducts] = useState([]);
    const [cartItems, setCartItems] = useState({}); // map ids with quantities for a product 
    const [searchQuery, setSearchQuery] = useState({});

    // fetch seller status 
    const fetchSeller = async () => {
        try {
            const { data } = await axios.get('/api/seller/is-auth')
            if(data.success) {
                setIsSeller(true);
            } else {
                setIsSeller(false);
            }
        } catch (error) {
            setIsSeller(false);
        }
    }

    // fetch user auth status, userData and cartItems 
    const fetchUser = async () => {
        try {
            const { data } = await axios.get('/api/user/is-auth');
            
            if(data.success) {
                setUser(data.user);
                setCartItems(data.user.cartItems);
            }
        } catch (error) {
            setUser(null);
        }
    }

    // fetch all products 
    const fetchProducts = async () => {
        try {
            const { data } = await axios.get('/api/product/list');
            if(data.success) {
                setProducts(data.products);
            } else {
                toast.error(data.message)
            }
        } catch (error) {
            toast.error(error.message);
        }
    }

    // add product to cart
    const addToCart = (itemId) => {
        let cartData = structuredClone(cartItems); // makes copy 

        if(cartData[itemId]) {
            cartData[itemId] = cartData[itemId] + 1;
        } else {
            cartData[itemId] = 1;
        }
        setCartItems(cartData);
        toast.success("Added To Cart");
    }

    // update cart items quantity 
    const updateCartItem = (itemId, quantity) => {
        let cartData = structuredClone(cartItems);
        cartData[itemId] = quantity;
        setCartItems(cartData);
        toast.success("Cart Updated");
    }

    // remove product from cart
    const removeFromCart = (itemId) => {
        let cartData = structuredClone(cartItems);
        if(cartData[itemId]) {
            cartData[itemId] = cartData[itemId] - 1;
            if(cartData[itemId] === 0) {
                delete cartData[itemId];
            }
        }
        setCartItems(cartData);
        toast.success("Removed from Cart");
    }
    
    // get Cart items Count
    const getCartCount = () => {
        let totalCount = 0;
        for(const item in cartItems) {
            totalCount += cartItems[item] 
        }
        return totalCount;
    }

    // get Cart total amount 
    const getCartAmount = () => {
        let totalAmount = 0;
        for(const items in cartItems) {
            const itemInfo = products.find((product) => product._id === items);
            if(cartItems[items] > 0) {
                totalAmount += cartItems[items] * itemInfo.offerPrice;
            }
        }
        return Math.floor(totalAmount*100) / 100;
    }

    useEffect( () => {
        fetchProducts()
        fetchSeller()
        fetchUser()
    }, [])

    // update data-base cart items 
    useEffect( () => {
        const updateCart = async () => {
            try {
                const {data} = await axios.post('/api/cart/update', {cartItems});
                if(!data.success) {
                    toast.error(data.message);
                }
            } catch (error) {
                toast.error(error.message);
            }
        }
        if(user) {
            updateCart();
        }
    }, [cartItems])

    const value = {navigate, user, setUser, isSeller, setIsSeller, showUserLogin, setShowUserLogin, products, currency, cartItems, addToCart, updateCartItem, removeFromCart, searchQuery, setSearchQuery, getCartCount, getCartAmount, axios, fetchProducts, setCartItems};
    
    return <AppContext.Provider value={value}>
        {children}
    </AppContext.Provider>
}

export const useAppContext = () => {
    return useContext(AppContext);
}