import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from "firebase/app";
import { getAuth, signInAnonymously, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, sendPasswordResetEmail, setPersistence, browserLocalPersistence, signInWithCustomToken } from "firebase/auth";
import { getFirestore, collection, addDoc, onSnapshot, query, doc, updateDoc, setDoc, getDoc } from "firebase/firestore";
import { createClient } from '@supabase/supabase-js';
import {
  Menu, Mic, Settings, History, DollarSign, Building, Check, Share2, Mail, MessageSquare, List,
  Home, User, CreditCard, Save, Pencil, Phone, FileText, X, ChevronRight, Star, Shield, Gift, TrendingUp, Loader, LogOut, Lock, ArrowLeft, Printer, Upload, Download, Globe, MapPin
} from 'lucide-react';

// --- CONFIGURATION ---

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "AIzaSyCmFx-cWKIZXFcYQHtvGkj-yqDFV-XtCMk";

const firebaseConfig = {
  apiKey: "AIzaSyCz6yEiW0VhnNliNFsH0y-9DSL2yRc081c",
  authDomain: "talk2quote-app.firebaseapp.com",
  projectId: "talk2quote-app",
  storageBucket: "talk2quote-app.firebasestorage.app",
  messagingSenderId: "218593379035",
  appId: "1:218593379035:web:a340b1bc7f222ddcd542fe",
  measurementId: "G-6H1CXGYD9L"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const APP_ID = 'talk2quote-v1';
const DEFAULT_LOGO_URL = "https://placehold.co/600x150/e2e8f0/475569?text=Your+Logo&font=roboto";
const T2Q_LOGO_URL = "/LOGO1.png";

// --- Helper Functions ---
const calculateQuoteTotal = (items) => {
    if (!items || !Array.isArray(items)) return 0;
    return items.reduce((acc, item) => acc + ((Number(item.qty) || 0) * (Number(item.price) || 0)), 0);
};

const exportToCSV = (quotes) => {
    if (!quotes || quotes.length === 0) {
        alert("No quotes to export.");
        return;
    }
    
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Date,Quote ID,Client Name,Client Email,Job Address,Status,Total Amount,GST Included\n";

    quotes.forEach(quote => {
        const row = [
            quote.displayDate || '',
            quote.id || '',
            `"${(quote.clientName || '').replace(/"/g, '""')}"`,
            quote.clientEmail || '',
            `"${(quote.jobAddress || '').replace(/"/g, '""')}"`,
            quote.status || '',
            calculateQuoteTotal(quote.items).toFixed(2),
            "Yes"
        ];
        csvContent += row.join(",") + "\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "talk2quote_export.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

// --- Independent Components ---

const InputField = ({ label, value, onChange, placeholder, type = 'text', readOnly = false, className = '' }) => (
  <div>
    {label && <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>}
    <input
      type={type}
      value={value || ''}
      onChange={onChange}
      placeholder={placeholder}
      readOnly={readOnly}
      className={`w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 transition duration-150 text-gray-700 ${readOnly ? 'bg-gray-50' : ''} ${className}`}
    />
  </div>
);

const QuoteLineItem = ({ item, handleItemChange, onDelete }) => {
    const qty = Number(item.qty) || 0;
    const price = Number(item.price) || 0;
    const itemTotal = (qty * price).toFixed(2);

    return (
      <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 relative">
        <div
          onClick={() => onDelete(item.id)}
          className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center rounded-full bg-red-100 hover:bg-red-200 text-red-600 cursor-pointer transition"
          role="button"
          tabIndex={0}
          title="Delete item"
        >
          <X size={14} />
        </div>
        <textarea
          className="w-full bg-transparent text-sm font-medium text-gray-800 focus:outline-none mb-2 resize-none pr-8"
          rows={2}
          value={item.description || ''}
          onChange={(e) => handleItemChange(item.id, 'description', e.target.value)}
        />
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
              <div className="flex flex-col w-16">
                <label className="text-[10px] text-gray-500">Qty</label>
                <input
                    type="number"
                    className="w-full bg-white border border-gray-300 rounded px-2 py-1 text-sm focus:outline-blue-500"
                    value={qty}
                    onChange={(e) => handleItemChange(item.id, 'qty', parseFloat(e.target.value) || 0)}
                />
              </div>
              <div className="flex flex-col w-24">
                <label className="text-[10px] text-gray-500">Price ($)</label>
                <input
                    type="number"
                    className="w-full bg-white border border-gray-300 rounded px-2 py-1 text-sm focus:outline-blue-500"
                    value={price}
                    onChange={(e) => handleItemChange(item.id, 'price', parseFloat(e.target.value) || 0)}
                />
              </div>
          </div>
          <div className="text-right">
              <label className="text-[10px] text-gray-500">Line Total</label>
              <div className="font-bold text-gray-800">${itemTotal}</div>
          </div>
        </div>
      </div>
    );
  };

// SAFE SHARE OPTION (Using DIV instead of Button)
const ShareOption = ({ icon, label, color, onClick, disabled }) => (
  <div 
    onClick={disabled ? null : onClick} 
    className={`w-full flex items-center p-4 rounded-xl shadow-md text-white ${disabled ? 'bg-gray-300 cursor-not-allowed' : color + ' hover:shadow-lg cursor-pointer'} transition duration-150`}
    role="button"
    tabIndex={0}
  >
    <div className="mr-4">{icon}</div>
    <span className="font-semibold text-lg">{label}</span>
  </div>
);

// SAFE MENU ITEM (Using DIV)
const MenuItem = ({ icon: Icon, label, onClick, isDestructive }) => (
  <div
    onClick={onClick}
    className={`w-full flex items-center p-3 text-left rounded-lg transition duration-150 cursor-pointer ${isDestructive ? 'text-red-600 hover:bg-red-50' : 'text-gray-700 hover:bg-blue-50 hover:text-blue-600'}`}
    role="button"
    tabIndex={0}
  >
    <Icon size={20} className="mr-3 flex-shrink-0" />
    <span className="text-base font-medium">{label}</span>
  </div>
);

const AppHeader = () => (
    <div className="flex justify-center">
        <img src={T2Q_LOGO_URL} alt="Talk2Quote App" className="h-48 object-contain" />
    </div>
);

const LogoTitle = () => (
    <div className="flex justify-center">
        <img src={T2Q_LOGO_URL} alt="Talk2Quote Logo" className="h-20 object-contain" />
    </div>
);

// --- Screen Components ---

const LoginScreen = ({ handleLogin, handleSignUp, handlePasswordReset }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');
    const [loading, setLoading] = useState(false);
    const [isResetting, setIsResetting] = useState(false);
    const [isSigningUp, setIsSigningUp] = useState(false);

    const onLogin = async (e) => {
        e.preventDefault();
        if (!email || !password) { setError("Please enter email and password."); return; }
        setLoading(true);
        setError('');
        try {
            await handleLogin(email, password);
        } catch (err) {
            console.log("Login error handled:", err.code);
            if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
                setError("Incorrect details. If you are new, please click 'Create Account' below.");
            } else if (err.code === 'auth/too-many-requests') {
                setError("Too many attempts. Please wait a moment or reset your password.");
            } else {
                setError("Login failed. Please check your connection.");
            }
            setLoading(false);
        }
    };

    const showSignUpScreen = () => {
        setIsSigningUp(true);
        setError('');
    };

    const onReset = async (e) => {
        e.preventDefault();
        if (!email) { setError("Please enter your email address first."); return; }
        setLoading(true);
        setError('');
        setSuccessMsg('');
        try {
            await handlePasswordReset(email);
            setSuccessMsg("Link sent! Please check your email (and spam folder).");
        } catch (err) {
            console.log("Reset error handled:", err.code);
            if (err.code === 'auth/user-not-found') {
                setError("This email is not registered. Please go back and Create Account.");
            } else {
                setError(err.message.replace("Firebase: ", ""));
            }
        }
        setLoading(false);
    };

    if (isSigningUp) {
        return <SignUpScreen handleSignUp={handleSignUp} onBack={() => setIsSigningUp(false)} />;
    }

    if (isResetting) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-6">
                <div className="w-full max-w-sm p-8 space-y-6 bg-white shadow-xl rounded-xl">
                    <div className="flex items-center text-blue-600 mb-2 cursor-pointer" onClick={() => setIsResetting(false)}>
                        <ArrowLeft size={20} className="mr-2"/> Back to Login
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800">Reset Password</h2>
                    <p className="text-gray-500 text-sm">Enter your email to receive a reset link.</p>
                    
                    {error && <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg border border-red-200">{error}</div>}
                    {successMsg && <div className="bg-green-50 text-green-700 text-sm p-3 rounded-lg border border-green-200 font-semibold">{successMsg}</div>}

                    {!successMsg && (
                        <>
                            <InputField 
                                type="email" 
                                placeholder="Email Address" 
                                value={email}
                                onChange={(e) => { setEmail(e.target.value); setError(''); }}
                            />
                            
                            <button onClick={onReset} disabled={loading} className="w-full py-3 text-lg font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 shadow-md flex justify-center items-center">
                                {loading ? <Loader className="animate-spin" size={24}/> : "Send Reset Link"}
                            </button>
                        </>
                    )}
                    {successMsg && (
                         <button onClick={() => setIsResetting(false)} className="w-full py-3 text-lg font-semibold text-blue-600 border-2 border-blue-600 rounded-lg hover:bg-blue-50">
                            Back to Login
                        </button>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-6">
            <div className="w-full max-w-sm p-8 space-y-6 bg-white shadow-xl rounded-xl">
                <AppHeader />
                <p className="text-center text-gray-500 mt-4">Business estimates, simplified.</p>
                
                {error && <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg text-center font-medium border border-red-200">{error}</div>}

                <div className="space-y-4 mt-6">
                    <InputField 
                        type="email" 
                        placeholder="Email Address" 
                        value={email}
                        onChange={(e) => { setEmail(e.target.value); setError(''); }}
                    />
                    <InputField 
                        type="password" 
                        placeholder="Password" 
                        value={password}
                        onChange={(e) => { setPassword(e.target.value); setError(''); }}
                    />
                </div>
                
                <div className="space-y-3 pt-2">
                    <button onClick={onLogin} disabled={loading} className="w-full py-3 text-lg font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 shadow-md flex justify-center items-center">
                        {loading ? <Loader className="animate-spin" size={24}/> : "Sign In"}
                    </button>
                    
                    <div className="text-center">
                        <button onClick={() => setIsResetting(true)} className="text-sm text-blue-600 hover:text-blue-800 font-medium">
                            Forgot Password?
                        </button>
                    </div>

                    <div className="relative flex py-2 items-center">
                        <div className="flex-grow border-t border-gray-300"></div>
                        <span className="flex-shrink-0 mx-4 text-gray-400 text-xs">New User?</span>
                        <div className="flex-grow border-t border-gray-300"></div>
                    </div>
                    <button onClick={showSignUpScreen} disabled={loading} className="w-full py-3 text-lg font-semibold text-blue-600 bg-white border-2 border-blue-600 rounded-lg hover:bg-blue-50">
                        Create Account
                    </button>
                </div>
            </div>
        </div>
    );
};

const SignUpScreen = ({ handleSignUp, onBack }) => {
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        confirmPassword: '',
        cardNumber: '',
        cardExpiry: '',
        cardCVC: '',
        cardName: '',
        reminderEmail: false,
        termsAccepted: false,
        autoChargeConsent: false
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        setError('');
    };

    const formatCardNumber = (value) => {
        const numbers = value.replace(/\D/g, '');
        const groups = numbers.match(/.{1,4}/g) || [];
        return groups.join(' ').substring(0, 19);
    };

    const formatExpiry = (value) => {
        const numbers = value.replace(/\D/g, '');
        if (numbers.length >= 2) {
            return numbers.substring(0, 2) + (numbers.length > 2 ? '/' + numbers.substring(2, 4) : '');
        }
        return numbers;
    };

    const onSubmit = async (e) => {
        e.preventDefault();

        if (!formData.email || !formData.password) {
            setError('Please enter email and password.');
            return;
        }

        if (formData.password.length < 6) {
            setError('Password must be at least 6 characters.');
            return;
        }

        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match.');
            return;
        }

        if (!formData.cardNumber || formData.cardNumber.replace(/\s/g, '').length < 13) {
            setError('Please enter a valid card number.');
            return;
        }

        if (!formData.cardExpiry || formData.cardExpiry.length < 5) {
            setError('Please enter a valid expiry date (MM/YY).');
            return;
        }

        if (!formData.cardCVC || formData.cardCVC.length < 3) {
            setError('Please enter a valid CVC code.');
            return;
        }

        if (!formData.cardName) {
            setError('Please enter the cardholder name.');
            return;
        }

        if (!formData.termsAccepted) {
            setError('Please accept the terms and conditions.');
            return;
        }

        if (!formData.autoChargeConsent) {
            setError('Please consent to be charged after using all free trial quotes.');
            return;
        }

        setLoading(true);
        setError('');

        try {
            await handleSignUp(formData.email, formData.password);

            const user = auth.currentUser;
            if (user) {
                const cardNumberClean = formData.cardNumber.replace(/\s/g, '');
                const last4 = cardNumberClean.slice(-4);
                const expiryParts = formData.cardExpiry.split('/');

                await supabase.from('user_registration_data').insert({
                    user_id: user.uid,
                    card_number_last4: last4,
                    card_brand: 'Visa',
                    card_expiry_month: parseInt(expiryParts[0]),
                    card_expiry_year: parseInt('20' + expiryParts[1]),
                    reminder_email_opt_in: formData.reminderEmail,
                    terms_accepted: formData.termsAccepted,
                    auto_charge_consent: formData.autoChargeConsent
                });
            }
        } catch (err) {
            console.log('Signup error:', err);
            if (err.code === 'auth/email-already-in-use') {
                setError('This email is already registered. Please use Sign In instead.');
            } else {
                setError('Could not create account: ' + err.message.replace('Firebase: ', ''));
            }
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-6">
            <div className="w-full max-w-md p-8 space-y-6 bg-white shadow-xl rounded-xl">
                <div className="flex items-center text-blue-600 mb-2 cursor-pointer" onClick={onBack}>
                    <ArrowLeft size={20} className="mr-2"/> Back to Login
                </div>

                <div>
                    <h2 className="text-2xl font-bold text-gray-800">Create Account</h2>
                    <p className="text-gray-500 text-sm mt-1">Start your free trial - 10 professional quotes</p>
                </div>

                {error && <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg border border-red-200">{error}</div>}

                <form onSubmit={onSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                        <input
                            type="email"
                            value={formData.email}
                            onChange={(e) => handleChange('email', e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                            placeholder="your@email.com"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                        <input
                            type="password"
                            value={formData.password}
                            onChange={(e) => handleChange('password', e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                            placeholder="At least 6 characters"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
                        <input
                            type="password"
                            value={formData.confirmPassword}
                            onChange={(e) => handleChange('confirmPassword', e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Re-enter password"
                        />
                    </div>

                    <div className="pt-4 border-t border-gray-200">
                        <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                            <CreditCard size={16} className="mr-2"/>
                            Payment Information
                        </h3>
                        <p className="text-xs text-gray-500 mb-4">Your card will be charged $29/month after your 10 free trial quotes are used.</p>

                        <div className="space-y-3">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Card Number</label>
                                <input
                                    type="text"
                                    value={formData.cardNumber}
                                    onChange={(e) => handleChange('cardNumber', formatCardNumber(e.target.value))}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="1234 5678 9012 3456"
                                    maxLength="19"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Expiry</label>
                                    <input
                                        type="text"
                                        value={formData.cardExpiry}
                                        onChange={(e) => handleChange('cardExpiry', formatExpiry(e.target.value))}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                                        placeholder="MM/YY"
                                        maxLength="5"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">CVC</label>
                                    <input
                                        type="text"
                                        value={formData.cardCVC}
                                        onChange={(e) => handleChange('cardCVC', e.target.value.replace(/\D/g, '').substring(0, 4))}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                                        placeholder="123"
                                        maxLength="4"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Cardholder Name</label>
                                <input
                                    type="text"
                                    value={formData.cardName}
                                    onChange={(e) => handleChange('cardName', e.target.value)}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="Name on card"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="pt-4 space-y-3">
                        <label className="flex items-start cursor-pointer">
                            <input
                                type="checkbox"
                                checked={formData.reminderEmail}
                                onChange={(e) => handleChange('reminderEmail', e.target.checked)}
                                className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <span className="ml-3 text-sm text-gray-700">
                                Send me a reminder email when my free trial is ending
                            </span>
                        </label>

                        <label className="flex items-start cursor-pointer">
                            <input
                                type="checkbox"
                                checked={formData.termsAccepted}
                                onChange={(e) => handleChange('termsAccepted', e.target.checked)}
                                className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <span className="ml-3 text-sm text-gray-700">
                                I agree to the <span className="text-blue-600 underline">Terms and Conditions</span>
                            </span>
                        </label>

                        <label className="flex items-start cursor-pointer">
                            <input
                                type="checkbox"
                                checked={formData.autoChargeConsent}
                                onChange={(e) => handleChange('autoChargeConsent', e.target.checked)}
                                className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <span className="ml-3 text-sm text-gray-700">
                                I consent to be automatically charged $29/month after using all 10 free trial quotes
                            </span>
                        </label>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 text-lg font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 shadow-md flex justify-center items-center mt-6"
                    >
                        {loading ? <Loader className="animate-spin" size={24}/> : 'Create Account & Start Free Trial'}
                    </button>
                </form>
            </div>
        </div>
    );
};

const MainScreen = ({ mockQuote, setMockQuote, isClientInfoSet, handleRecordToggle, isRecording, isProcessing, transcript }) => (
    <div className="flex flex-col h-full p-4 bg-gray-50">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-1">Create a Quote</h2>
        <p className="text-sm text-gray-500">Start by entering the client's essential details.</p>
      </div>

      <div className="mb-8 p-4 bg-white rounded-xl shadow-lg border border-gray-100 space-y-4">
        <h3 className="text-lg font-semibold text-blue-700 mb-3">Client Details</h3>
        <InputField
            label="Client Name (Optional)"
            value={mockQuote.clientName}
            onChange={(e) => setMockQuote({...mockQuote, clientName: e.target.value})}
            placeholder="e.g. Sarah Jenkins"
        />
        <InputField
            label="Client Email (Required)"
            type="email"
            value={mockQuote.clientEmail}
            onChange={(e) => setMockQuote({...mockQuote, clientEmail: e.target.value})}
            placeholder="e.g. sarah@client.com"
        />

        <div className={`mt-6 p-3 rounded-lg border transition duration-300 ${isClientInfoSet ? 'border-green-300 bg-green-50' : 'border-red-300 bg-red-50'}`}>
            {isClientInfoSet ? (
                <p className="text-sm text-green-700 font-semibold flex items-center"><Check size={16} className="mr-2"/> Client Email Set. Ready to record.</p>
            ) : (
                <p className="text-sm text-red-700 font-semibold">Please enter the Client Email to enable recording.</p>
            )}
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-6">
        <p className="text-xs text-blue-800 font-medium mb-1">Quick tip:</p>
        <p className="text-xs text-blue-700">Speak clearly and include all necessary details: client name, job address, scope of work, quantities, and pricing. The more detail you provide, the better your quote will be!</p>
      </div>
      
      <div className="flex flex-col justify-center items-center mt-auto mb-8 mx-auto">
        {/* SAFE MIC BUTTON (DIV) */}
        <div
          onClick={handleRecordToggle}
          className={`w-32 h-32 flex items-center justify-center rounded-full transition-all duration-300 transform shadow-2xl relative cursor-pointer ${isRecording ? 'bg-red-500 scale-110 animate-pulse' : 'bg-blue-600 hover:bg-blue-700'} text-white ${!isClientInfoSet && 'opacity-50 cursor-not-allowed'}`}
          role="button"
          tabIndex={0}
        >
          {isProcessing ? (
             <Loader size={48} className="animate-spin text-white z-10" />
          ) : (
             <Mic size={48} className={isRecording ? 'text-white z-10' : 'z-10'} />
          )}
          {isRecording && <div className="absolute inset-0 border-4 border-red-300 rounded-full animate-ping opacity-75"></div>}
        </div>
        {isRecording && (
            <div className="mt-4 p-2 bg-gray-100 rounded text-xs text-gray-600 w-full max-w-xs text-center min-h-[20px]">
                {transcript || "Listening..."}
            </div>
        )}
      </div>
      <p className="text-center text-sm font-semibold text-gray-700 mb-2">
        {isProcessing ? 'AI IS THINKING...' : (isRecording ? 'LISTENING... (Tap to Stop)' : (isClientInfoSet ? 'Tap to Start Recording' : 'Enter email above to start'))}
      </p>
    </div>
);

const ReviewScreen = ({ mockQuote, setMockQuote, handleItemChange, navigateTo, handleQuoteSent }) => {
  const [isRewriting, setIsRewriting] = useState(false);
  const [originalSummary, setOriginalSummary] = useState('');
  const [hasAiVersion, setHasAiVersion] = useState(false);

  const handleDeleteItem = (itemId) => {
    const newItems = mockQuote.items.filter(item => item.id !== itemId);
    setMockQuote({...mockQuote, items: newItems});
  };

  const handleAddItem = () => {
    const newId = mockQuote.items.length > 0 ? Math.max(...mockQuote.items.map(i => i.id)) + 1 : 1;
    const newItem = { id: newId, description: 'New Item', qty: 1, price: 0 };
    setMockQuote({...mockQuote, items: [...mockQuote.items, newItem]});
  };

  const handleAiRewrite = async () => {
    if (!mockQuote.scopeSummary) {
      alert('No scope summary to rewrite.');
      return;
    }

    setIsRewriting(true);
    setOriginalSummary(mockQuote.scopeSummary);

    try {
      const prompt = `Rewrite the following job scope summary to be more professional, clear, and comprehensive. Keep all important details but improve the structure and language:\n\n${mockQuote.scopeSummary}`;

      console.log('Calling AI API...');
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('AI Response:', data);

      const aiText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';

      if (aiText) {
        setMockQuote(prev => ({...prev, scopeSummary: aiText}));
        setHasAiVersion(true);
        console.log('AI rewrite successful');
      } else {
        alert('AI returned an empty response. Please try again.');
      }
    } catch (error) {
      console.error('AI rewrite error:', error);
      alert(`Failed to rewrite summary: ${error.message}`);
    } finally {
      setIsRewriting(false);
    }
  };

  const handleRestoreOriginal = () => {
    if (originalSummary) {
      setMockQuote(prev => ({...prev, scopeSummary: originalSummary}));
      setHasAiVersion(false);
      setOriginalSummary('');
    }
  };

  return (
    <div className="p-4 bg-gray-50 h-full overflow-y-auto pb-20">
      <div className="flex justify-between items-center mb-2">
          <h2 className="text-xl font-bold text-blue-700">Quote Review</h2>
          {mockQuote.firestoreId && <span className="text-xs font-semibold text-green-600 bg-green-100 px-2 py-1 rounded-full">Draft Saved</span>}
      </div>
      <p className="text-sm text-gray-500 mb-4">Review and edit the quote details below.</p>

      <div className="bg-white p-4 rounded-xl shadow-lg space-y-4 mb-4">
        <div className="space-y-3 border-b pb-3">
            <InputField
                label="Client Name"
                value={mockQuote.clientName}
                onChange={(e) => setMockQuote({...mockQuote, clientName: e.target.value})}
                placeholder="Client Name"
                className="mt-0"
            />
             <InputField
                label="Client Email"
                value={mockQuote.clientEmail}
                onChange={(e) => setMockQuote({...mockQuote, clientEmail: e.target.value})}
                placeholder="Client Email"
                className="mt-0"
            />
            <InputField
                label="Job Address"
                value={mockQuote.jobAddress}
                onChange={(e) => setMockQuote({...mockQuote, jobAddress: e.target.value})}
                placeholder="Job Address"
                className="mt-0"
            />
        </div>

        <div className="space-y-2 pb-3 border-b">
            <label className="block text-sm font-medium text-gray-700 mb-1">
                Scope Summary {hasAiVersion ? '(AI Enhanced)' : '(From Transcript)'}
            </label>
            <textarea
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 transition duration-150 text-gray-700 resize-y min-h-[100px]"
                value={mockQuote.scopeSummary || ''}
                onChange={(e) => setMockQuote({...mockQuote, scopeSummary: e.target.value})}
            />
            <div className="flex gap-2 mt-2">
                {!hasAiVersion ? (
                    <button
                        onClick={handleAiRewrite}
                        disabled={isRewriting || !mockQuote.scopeSummary}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                        {isRewriting ? (
                            <>
                                <Loader size={16} className="animate-spin" />
                                AI is rewriting...
                            </>
                        ) : (
                            <>
                                <Star size={16} />
                                Enhance with AI
                            </>
                        )}
                    </button>
                ) : (
                    <button
                        onClick={handleRestoreOriginal}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-all"
                    >
                        <ArrowLeft size={16} />
                        Restore Original
                    </button>
                )}
            </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Line Items</h3>
          {mockQuote.items && mockQuote.items.length > 0 ? (
            mockQuote.items.map((item) => (
                <QuoteLineItem key={item.id} item={item} handleItemChange={handleItemChange} onDelete={handleDeleteItem} />
            ))
          ) : (
            <p className="text-gray-500 italic p-4 bg-gray-100 rounded-lg">No line items generated yet. Record a job description to generate items.</p>
          )}
          <div
            onClick={handleAddItem}
            className="text-blue-500 hover:text-blue-700 text-sm font-semibold flex items-center pt-2 cursor-pointer"
            role="button"
            tabIndex={0}
          >
              <Pencil size={16} className="mr-1"/> Add Item
          </div>
        </div>

        <div className="pt-4 border-t flex justify-between items-center">
            <span className="font-bold text-gray-700">Total Estimate</span>
            <span className="font-bold text-2xl text-green-600">${calculateQuoteTotal(mockQuote.items).toFixed(2)}</span>
        </div>
      </div>

      <div className="space-y-3">
        <button
            onClick={() => navigateTo('pdfPreview')}
            className="w-full py-3 text-lg font-semibold text-blue-600 bg-white border-2 border-blue-600 rounded-lg hover:bg-blue-50 flex items-center justify-center"
        >
            <FileText size={20} className="mr-2"/> Preview PDF
        </button>
        <button
            onClick={handleQuoteSent}
            className="w-full py-3 text-lg font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 shadow-lg flex items-center justify-center"
        >
            <Share2 size={20} className="mr-2"/> Approve & Share
        </button>
      </div>
    </div>
  );
};

const PdfPreviewScreen = ({ mockQuote, companyDetails, navigateTo, handleQuoteSent }) => {
    const handlePrint = () => {
        window.print();
    };

    // Calculate GST if registered
    const total = calculateQuoteTotal(mockQuote.items);
    const gstAmount = companyDetails.gstRegistered ? (total / 11) : 0;
    const subTotal = companyDetails.gstRegistered ? (total - gstAmount) : total;

    return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col print:static">
        {/* Navigation Bar - Hidden during print */}
        <div className="bg-white p-4 shadow-md flex justify-between items-center print:hidden">
            <h2 className="font-bold text-gray-800">PDF Preview</h2>
            <button onClick={() => navigateTo('review')} className="text-gray-500 hover:text-red-500" aria-label="Close Preview">
                <X size={24} />
            </button>
        </div>

        {/* Scrollable Content Area */}
        <div className="flex-grow overflow-y-auto p-4 bg-gray-100 flex justify-center print:p-0 print:overflow-visible print:bg-white">
            {/* The Actual PDF Document - A4 Aspect Ratio */}
            <div className="bg-white w-full max-w-[210mm] h-auto p-12 shadow-xl text-sm print:shadow-none print:w-full print:max-w-none print:p-8">
                <div className="flex justify-between items-start mb-10 border-b-2 border-gray-200 pb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-blue-800 mb-3">QUOTE</h1>
                        <p className="text-gray-600 text-base">#{mockQuote.id}</p>
                        <p className="text-gray-600 text-base">Date: {mockQuote.date}</p>
                    </div>
                    <div className="text-right max-w-md">
                        {companyDetails.logoUrl ? (
                           <img src={companyDetails.logoUrl} alt="Company Logo" className="h-20 mx-auto mb-3 object-contain" />
                        ) : (
                           <h3 className="font-bold text-2xl text-gray-800">{companyDetails.name || 'Your Business Name'}</h3>
                        )}
                        {!companyDetails.logoUrl && <div className="h-2"></div>}

                        <p className="text-gray-700 text-base leading-relaxed">{companyDetails.address || 'Company Address'}</p>
                        <p className="text-gray-700 text-base">{companyDetails.email}</p>
                        <p className="text-gray-700 text-base">{companyDetails.phone}</p>
                        <p className="text-gray-700 text-base">{companyDetails.website}</p>
                        <p className="text-gray-700 text-base font-semibold">ABN: {companyDetails.abn}</p>
                    </div>
                </div>

                <div className="mb-10 bg-gray-50 p-6 rounded-lg">
                    <h4 className="font-bold text-gray-700 mb-3 text-base">Prepared For:</h4>
                    <p className="text-lg font-semibold text-gray-800">{mockQuote.clientName || 'Valued Client'}</p>
                    <p className="text-gray-600 text-base mt-2 leading-relaxed">{mockQuote.jobAddress}</p>
                    <p className="text-gray-600 font-medium mt-2 text-base">Email: {mockQuote.clientEmail || 'N/A'}</p>
                </div>

                {mockQuote.scopeSummary && (
                    <div className="mb-10">
                        <h4 className="font-bold text-gray-800 mb-3 text-base border-b-2 border-gray-200 pb-2">Scope of Work Summary</h4>
                        <p className="whitespace-pre-wrap text-gray-700 leading-relaxed text-base">{mockQuote.scopeSummary}</p>
                    </div>
                )}

                <table className="w-full mb-10">
                    <thead>
                        <tr className="border-b-2 border-gray-800 bg-gray-50">
                            <th className="text-left py-3 px-3 font-bold text-gray-800">Description</th>
                            <th className="text-right py-3 px-3 font-bold text-gray-800">Qty</th>
                            <th className="text-right py-3 px-3 font-bold text-gray-800">Unit</th>
                            <th className="text-right py-3 px-3 font-bold text-gray-800">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {mockQuote.items && mockQuote.items.map((item) => (
                            <tr key={item.id} className="border-b border-gray-200">
                                <td className="py-3 px-3 text-gray-800">{item.description}</td>
                                <td className="py-3 px-3 text-right text-gray-600">{item.qty}</td>
                                <td className="py-3 px-3 text-right text-gray-600">${item.price ? Number(item.price).toFixed(2) : '0.00'}</td>
                                <td className="py-3 px-3 text-right font-medium">${((Number(item.qty) || 0) * (Number(item.price) || 0)).toFixed(2)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                <div className="flex justify-end mb-10">
                    <div className="w-1/2 space-y-3">
                        {companyDetails.gstRegistered && (
                            <>
                                <div className="flex justify-between text-gray-600 text-base">
                                    <span>Subtotal</span>
                                    <span>${subTotal.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-gray-600 text-base">
                                    <span>GST (10%)</span>
                                    <span>${gstAmount.toFixed(2)}</span>
                                </div>
                            </>
                        )}
                        <div className="flex justify-between pt-3 border-t-2 border-gray-800">
                            <span className="font-bold text-xl">Total</span>
                            <span className="font-bold text-xl text-blue-800">${total.toFixed(2)}</span>
                        </div>
                        <p className="text-right text-sm text-gray-500">
                            {companyDetails.gstRegistered ? 'Includes GST' : 'GST Free'}
                        </p>
                    </div>
                </div>

                <div className="border-t-2 border-gray-200 pt-6">
                    {/* Hide approval note on printed PDF to look cleaner */}
                    <div className="bg-blue-50 p-4 rounded-lg text-sm text-blue-800 mb-6 font-medium flex items-center print:hidden">
                        <Check size={18} className="mr-2 flex-shrink-0" />
                        This quote is **approveable** via a secure link in the shared email.
                    </div>
                    <div className="grid grid-cols-2 gap-8">
                        <div>
                            <h4 className="font-bold text-gray-700 mb-3 text-base">Bank Details</h4>
                            <p className="text-sm text-gray-600">Bank: {companyDetails.bankName}</p>
                            <p className="text-sm text-gray-600">Acct: {companyDetails.accountName}</p>
                            <p className="text-sm text-gray-600">BSB: {companyDetails.bsb} | Acc: {companyDetails.accountNumber}</p>
                        </div>
                        <div className="text-right">
                            <h4 className="font-bold text-gray-700 mb-3 text-base">Terms</h4>
                            <p className="text-sm text-gray-600">{companyDetails.terms}</p>
                            <p className="text-sm text-gray-600">Valid for 30 Days</p>
                        </div>
                    </div>
                </div>
                
                {/* FOOTER - POWERED BY */}
                <div className="mt-12 pt-8 border-t border-gray-100 text-center">
                    <p className="text-xs text-gray-400 font-medium">Powered by Talk2Quote App</p>
                </div>
            </div>
        </div>
        
        {/* Footer Buttons - Hidden during print */}
        <div className="bg-white p-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] space-y-2 print:hidden">
            <button onClick={handlePrint} className="w-full py-3 text-lg font-semibold text-blue-600 bg-white border-2 border-blue-600 rounded-lg hover:bg-blue-50 flex items-center justify-center">
                <Printer size={20} className="mr-2"/> Download / Print PDF
            </button>
            <button onClick={handleQuoteSent} className="w-full py-3 text-lg font-semibold text-white bg-green-600 rounded-lg hover:bg-green-700 shadow-lg flex items-center justify-center">
                Confirm & Share Link
            </button>
        </div>
        
        {/* CSS for printing - Ensures only the document prints */}
        <style>{`
            @media print {
                @page {
                    margin: 0.5in;
                    size: A4;
                }
                body {
                    margin: 0;
                    padding: 0;
                }
                body * {
                    visibility: hidden;
                }
                .bg-white.w-full.max-w-\\[595px\\],
                .bg-white.w-full.max-w-\\[595px\\] * {
                    visibility: visible !important;
                }
                .bg-white.w-full.max-w-\\[595px\\] {
                    position: absolute;
                    left: 0;
                    top: 0;
                    width: 100%;
                    max-width: 100%;
                    box-shadow: none;
                    margin: 0;
                    padding: 0.5in;
                    background: white !important;
                }
                .bg-gray-50,
                .bg-blue-50 {
                    background-color: white !important;
                    -webkit-print-color-adjust: exact;
                    print-color-adjust: exact;
                }
            }
        `}</style>
    </div>
    );
};

const HistoryScreen = ({ previousQuotes, lastQuoteAccepted, loadingQuotes, onSelectQuote }) => (
    <div className="p-4 bg-gray-50 h-full overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-gray-800">History</h2>
            <button 
                onClick={() => exportToCSV(previousQuotes)}
                className="text-xs bg-green-100 text-green-800 px-3 py-1.5 rounded-lg font-bold flex items-center hover:bg-green-200"
            >
                <Download size={14} className="mr-1"/> Export CSV
            </button>
        </div>
        
        {lastQuoteAccepted && (
             <div className="bg-yellow-100 p-4 rounded-xl text-yellow-800 mb-4 font-semibold flex items-center">
                 <Check size={20} className="mr-2" />
                 Quote saved successfully!
            </div>
        )}
        
        {loadingQuotes ? (
            <div className="flex flex-col items-center justify-center py-10">
                <Loader className="animate-spin text-blue-600 mb-2" size={32} />
                <p className="text-gray-500 text-sm">Loading your history...</p>
            </div>
        ) : (
            <div className="space-y-4">
                {previousQuotes && previousQuotes.map((quote) => (
                    <div 
                        key={quote.firestoreId} 
                        onClick={() => onSelectQuote(quote)}
                        className={`bg-white p-4 rounded-xl shadow-md flex justify-between items-center cursor-pointer transition duration-150 border-2 ${quote.status === 'Accepted (Client Approved)' ? 'border-green-500 hover:bg-green-50' : 'border-transparent hover:border-blue-500 hover:bg-blue-50'}`}
                    >
                        <div>
                            <div className="flex items-center">
                                <p className="font-semibold text-gray-800 mr-2">{quote.client || quote.clientName || 'Unnamed Client'}</p>
                                {quote.status === 'Draft' && <span className="bg-yellow-100 text-yellow-800 text-[10px] font-bold px-2 py-0.5 rounded-full">DRAFT</span>}
                            </div>
                            <p className="text-xs text-gray-500">Quote #{String(quote.id || '???').substring(0,6)} - {String(quote.displayDate || 'Unknown Date')}</p>
                        </div>
                        <div className="text-right">
                            <span className="font-bold text-lg text-green-600">${Number(quote.total || 0).toFixed(2)}</span>
                            <p className={`text-xs font-semibold ${quote.status === 'Draft' ? 'text-yellow-600' : quote.status && quote.status.includes('Accepted') ? 'text-green-600' : quote.status === 'Not Started' ? 'text-gray-400' : 'text-gray-600'}`}>
                                {quote.status || 'Unknown'}
                            </p>
                        </div>
                    </div>
                ))}
                {(!previousQuotes || previousQuotes.length === 0) && <div className="text-center py-10 bg-white rounded-xl border border-dashed border-gray-300">
                    <p className="text-gray-400 mb-2">No quotes found.</p>
                    <p className="text-sm text-blue-500">Create your first quote now!</p>
                </div>}
                <div className="text-center pt-4 text-gray-400 text-sm">-- End of Quotes History --</div>
            </div>
        )}
    </div>
);

const ProfileScreen = ({ navigateTo, user }) => {
    const [displayName, setDisplayName] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');

    return (
        <div className="p-4 bg-gray-50 h-full overflow-y-auto">
            <div className="flex items-center mb-4">
                <button onClick={() => navigateTo('settings')} className="p-2 rounded-full hover:bg-gray-200 mr-2">
                    <ArrowLeft size={20} />
                </button>
                <h2 className="text-2xl font-bold text-gray-800">Profile</h2>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-4 space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input
                        type="email"
                        value={user?.email || ''}
                        disabled
                        className="w-full p-2 border border-gray-300 rounded bg-gray-100 text-gray-600"
                    />
                    <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Display Name</label>
                    <input
                        type="text"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder="Enter your name"
                        className="w-full p-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                    <input
                        type="tel"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        placeholder="Enter phone number"
                        className="w-full p-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                    />
                </div>

                <button className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition duration-150 font-semibold">
                    Save Changes
                </button>
            </div>
        </div>
    );
};

const SecurityScreen = ({ navigateTo, user }) => {
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const handlePasswordChange = () => {
        if (!currentPassword || !newPassword || !confirmPassword) {
            alert('Please fill in all fields');
            return;
        }
        if (newPassword !== confirmPassword) {
            alert('New passwords do not match');
            return;
        }
        alert('Password change functionality will be implemented');
    };

    const handlePasswordReset = async () => {
        if (user?.email) {
            try {
                await sendPasswordResetEmail(auth, user.email);
                alert(`Password reset email sent to ${user.email}`);
            } catch (error) {
                alert(`Error: ${error.message}`);
            }
        }
    };

    return (
        <div className="p-4 bg-gray-50 h-full overflow-y-auto">
            <div className="flex items-center mb-4">
                <button onClick={() => navigateTo('settings')} className="p-2 rounded-full hover:bg-gray-200 mr-2">
                    <ArrowLeft size={20} />
                </button>
                <h2 className="text-2xl font-bold text-gray-800">Security</h2>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-4 space-y-4 mb-4">
                <h3 className="font-semibold text-gray-800">Change Password</h3>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
                    <input
                        type="password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="Enter current password"
                        className="w-full p-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                    <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Enter new password"
                        className="w-full p-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
                    <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Confirm new password"
                        className="w-full p-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                    />
                </div>

                <button
                    onClick={handlePasswordChange}
                    className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition duration-150 font-semibold"
                >
                    Update Password
                </button>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-4">
                <h3 className="font-semibold text-gray-800 mb-2">Password Reset</h3>
                <p className="text-sm text-gray-600 mb-3">Send a password reset email to {user?.email}</p>
                <button
                    onClick={handlePasswordReset}
                    className="w-full bg-gray-200 text-gray-800 py-2 px-4 rounded-lg hover:bg-gray-300 transition duration-150 font-semibold"
                >
                    Send Reset Email
                </button>
            </div>
        </div>
    );
};

const SettingsScreen = ({ navigateTo, user }) => {
    const [taxRate, setTaxRate] = useState('10');
    const [notificationsEnabled, setNotificationsEnabled] = useState(true);

    const handleProfileClick = () => {
        navigateTo('profile');
    };

    const handleSecurityClick = () => {
        navigateTo('security');
    };

    const handleTaxRateChange = (e) => {
        setTaxRate(e.target.value);
    };

    const toggleNotifications = () => {
        setNotificationsEnabled(!notificationsEnabled);
    };

    return (
        <div className="p-4 bg-gray-50 h-full overflow-y-auto">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Settings</h2>

            <div className="bg-white rounded-lg shadow-sm divide-y">
                <div
                    onClick={handleProfileClick}
                    className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition duration-150"
                >
                    <div className="flex items-center">
                        <User className="text-gray-400 mr-3" size={20}/>
                        <div>
                            <p className="font-medium">Profile</p>
                            <p className="text-xs text-gray-500">{user?.email || 'User'}</p>
                        </div>
                    </div>
                    <ChevronRight className="text-gray-300" size={20}/>
                </div>
                <div
                    onClick={handleSecurityClick}
                    className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition duration-150"
                >
                    <div className="flex items-center">
                        <Shield className="text-gray-400 mr-3" size={20}/>
                        <div>
                            <p className="font-medium">Security</p>
                            <p className="text-xs text-gray-500">Password, Authentication</p>
                        </div>
                    </div>
                    <ChevronRight className="text-gray-300" size={20}/>
                </div>
            </div>

            <h3 className="font-bold text-gray-600 mt-6 mb-2 ml-1 text-sm uppercase">Preferences</h3>
            <div className="bg-white rounded-lg shadow-sm p-4 space-y-4">
                <div className="flex justify-between items-center">
                    <span>Default Tax Rate (GST)</span>
                    <select
                        value={taxRate}
                        onChange={handleTaxRateChange}
                        className="bg-gray-100 border-none rounded p-1 text-sm focus:ring-blue-500 focus:border-blue-500"
                    >
                        <option value="10">10%</option>
                        <option value="0">0%</option>
                    </select>
                </div>
                <div className="flex justify-between items-center">
                    <span>Currency</span>
                    <span className="text-gray-500">AUD ($)</span>
                </div>
                <div className="flex justify-between items-center">
                    <span>Push Notifications</span>
                    <div
                        onClick={toggleNotifications}
                        className={`w-10 h-6 rounded-full relative cursor-pointer p-0.5 transition duration-200 ${notificationsEnabled ? 'bg-green-500' : 'bg-gray-300'}`}
                    >
                        <div className={`w-5 h-5 bg-white rounded-full shadow-md transform transition duration-200 ${notificationsEnabled ? 'translate-x-4' : 'translate-x-0'}`}></div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const AccountingScreen = ({ user, supabase }) => {
    const [integrations, setIntegrations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [syncLogs, setSyncLogs] = useState([]);

    useEffect(() => {
        if (user) {
            fetchIntegrations();
            fetchSyncLogs();
        }
    }, [user]);

    const fetchIntegrations = async () => {
        try {
            const { data, error } = await supabase
                .from('accounting_integrations')
                .select('*')
                .eq('user_id', user.uid);

            if (error) throw error;

            const integrationsMap = {};
            data?.forEach(integration => {
                integrationsMap[integration.provider] = integration;
            });

            setIntegrations(integrationsMap);
        } catch (error) {
            console.error('Error fetching integrations:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchSyncLogs = async () => {
        try {
            const { data, error } = await supabase
                .from('integration_sync_logs')
                .select('*')
                .eq('user_id', user.uid)
                .order('created_at', { ascending: false })
                .limit(5);

            if (error) throw error;
            setSyncLogs(data || []);
        } catch (error) {
            console.error('Error fetching sync logs:', error);
        }
    };

    const handleConnect = async (providerId) => {
        const provider = providerId.toLowerCase();

        alert(`Connecting to ${providerId}...\n\nThis will redirect you to ${providerId}'s OAuth login page to authorize the connection.\n\nDemo mode: Integration UI is ready. To complete the OAuth flow, you'll need to:\n1. Set up OAuth credentials with ${providerId}\n2. Configure the Edge Function callback URLs\n3. Add your OAuth client ID and secret`);

        try {
            const { data, error } = await supabase
                .from('accounting_integrations')
                .insert({
                    user_id: user.uid,
                    provider: provider,
                    status: 'active',
                    organization_name: `${providerId} Demo Account`
                })
                .select()
                .single();

            if (error) throw error;

            await fetchIntegrations();
            alert(`Successfully connected to ${providerId}!`);
        } catch (error) {
            console.error('Error connecting:', error);
            if (error.code === '23505') {
                alert('You are already connected to this provider.');
            } else {
                alert('Failed to connect. Please try again.');
            }
        }
    };

    const handleDisconnect = async (providerId) => {
        const provider = providerId.toLowerCase();

        if (!confirm(`Are you sure you want to disconnect from ${providerId}?`)) {
            return;
        }

        try {
            const { error } = await supabase
                .from('accounting_integrations')
                .delete()
                .eq('user_id', user.uid)
                .eq('provider', provider);

            if (error) throw error;

            await fetchIntegrations();
            alert(`Successfully disconnected from ${providerId}`);
        } catch (error) {
            console.error('Error disconnecting:', error);
            alert('Failed to disconnect. Please try again.');
        }
    };

    const handleSyncTest = async (providerId) => {
        const provider = providerId.toLowerCase();
        const integration = integrations[provider];

        if (!integration) {
            alert('Please connect first');
            return;
        }

        try {
            const { error } = await supabase
                .from('integration_sync_logs')
                .insert({
                    integration_id: integration.id,
                    user_id: user.uid,
                    quote_id: 'DEMO-' + Date.now(),
                    action: 'sync_quote',
                    status: 'success',
                    synced_at: new Date().toISOString()
                });

            if (error) throw error;

            await fetchSyncLogs();
            alert(`Test sync to ${providerId} completed successfully!`);
        } catch (error) {
            console.error('Error syncing:', error);
            alert('Sync failed. Please try again.');
        }
    };

    if (loading) {
        return (
            <div className="p-4 bg-gray-50 h-full flex items-center justify-center">
                <div className="text-gray-600">Loading integrations...</div>
            </div>
        );
    }

    const providers = [
        { id: 'xero', name: 'Xero', logo: '/Xero logo copy copy.png', description: 'Direct API connection to Xero' },
        { id: 'quickbooks', name: 'QuickBooks', logo: '/Quickbooks logo copy copy.png', description: 'Direct API connection to QuickBooks' },
        { id: 'myob', name: 'MYOB', logo: '/MYOB logo.jpg', description: 'Direct API connection to MYOB' },
    ];

    return (
        <div className="p-4 bg-gray-50 h-full overflow-y-auto">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Accounting Integration</h2>

            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6">
                <p className="text-sm text-blue-700">
                    <strong>Direct API Integration:</strong> Connect your accounting software with one click using secure OAuth authentication. Your quotes will automatically sync to your accounting platform.
                </p>
            </div>

            <h3 className="font-bold text-gray-700 mb-3">Available Integrations</h3>
            <div className="space-y-3 mb-6">
                {providers.map(provider => {
                    const isConnected = integrations[provider.id];

                    return (
                        <div key={provider.id} className="bg-white rounded-xl shadow-md overflow-hidden">
                            <div className={`p-4 ${isConnected ? 'bg-blue-50 border-b border-blue-100' : ''}`}>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center">
                                        <div className="w-12 h-12 flex items-center justify-center rounded-lg mr-4 bg-white border border-gray-200 p-2">
                                            <img src={provider.logo} alt={`${provider.name} logo`} className="w-full h-full object-contain" style={{ backgroundColor: 'white' }} />
                                        </div>
                                        <div>
                                            <div className="font-semibold text-gray-800">{provider.name}</div>
                                            <div className="text-xs text-gray-500">{provider.description}</div>
                                            {isConnected && (
                                                <div className="text-xs text-gray-600 mt-1">
                                                    Connected to: {isConnected.organization_name}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center space-x-2">
                                        {isConnected ? (
                                            <>
                                                <span className="text-sm text-green-600 font-semibold flex items-center">
                                                    <Check size={14} className="mr-1"/> CONNECTED
                                                </span>
                                                <button
                                                    onClick={() => handleSyncTest(provider.name)}
                                                    className="text-xs px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                                                >
                                                    Test Sync
                                                </button>
                                                <button
                                                    onClick={() => handleDisconnect(provider.name)}
                                                    className="text-xs px-3 py-1 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition"
                                                >
                                                    Disconnect
                                                </button>
                                            </>
                                        ) : (
                                            <button
                                                onClick={() => handleConnect(provider.name)}
                                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold"
                                            >
                                                Connect
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {syncLogs.length > 0 && (
                <>
                    <h3 className="font-bold text-gray-700 mb-3">Recent Sync Activity</h3>
                    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                        {syncLogs.map(log => (
                            <div key={log.id} className="p-3 border-b border-gray-100 last:border-b-0">
                                <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                        <div className="text-sm font-medium text-gray-800">
                                            {log.action.replace('_', ' ').toUpperCase()}
                                        </div>
                                        <div className="text-xs text-gray-500">
                                            Quote: {log.quote_id}
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <span className={`text-xs px-2 py-1 rounded-full font-semibold ${
                                            log.status === 'success' ? 'bg-green-100 text-green-800' :
                                            log.status === 'failed' ? 'bg-red-100 text-red-800' :
                                            'bg-yellow-100 text-yellow-800'
                                        }`}>
                                            {log.status.toUpperCase()}
                                        </span>
                                        <span className="text-xs text-gray-400">
                                            {new Date(log.created_at).toLocaleDateString()}
                                        </span>
                                    </div>
                                </div>
                                {log.error_message && (
                                    <div className="text-xs text-red-600 mt-1">{log.error_message}</div>
                                )}
                            </div>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
};

const ShareScreen = ({ connectedAccountingSoftware, mockQuote, handleQuoteSent, navigateTo, integrationUrl }) => {
    const [sendingToAcc, setSendingToAcc] = useState(false);
    
    // --- BASIC SHARE LOGIC ---
    const shareText = `Here is the quote for ${mockQuote.clientName || 'your project'}. Total: $${calculateQuoteTotal(mockQuote.items).toFixed(2)}`;

    const handleShareWhatsApp = () => {
        const pdfUrl = window.location.origin + '/quote-preview';
        const message = `${shareText}\n\nView quote: ${pdfUrl}`;
        const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
        window.open(url, '_blank');
    };

    const handleShareEmail = () => {
        const subject = `Quote for ${mockQuote.clientName || 'Project'}`;
        const body = `${shareText}\n\nPlease reply to approve.`;
        window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    };

    const handleShareSMS = () => {
        const url = `sms:?body=${encodeURIComponent(shareText)}`;
        window.location.href = url;
    };

    const handleDirectIntegration = async () => {
        if (!integrationUrl) {
            alert("Please configure your integration link in the 'Accounting' menu first.");
            navigateTo('accounting');
            return;
        }
        
        setSendingToAcc(true);
        try {
            // Send payload to the user's configured webhook
            await fetch(integrationUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(mockQuote)
            });
            alert(`Successfully sent quote to ${connectedAccountingSoftware}!`);
        } catch (error) {
            console.error("Integration Error", error);
            alert("Failed to send. Please check your internet or integration link.");
        }
        setSendingToAcc(false);
    };

    const label = connectedAccountingSoftware 
        ? `Send to ${connectedAccountingSoftware}`
        : 'Connect Accounting';

    return (
      <div className="p-4 bg-gray-50 h-full flex flex-col items-center justify-center">
        <div className="w-full max-w-sm text-center">
          <Share2 size={48} className="text-blue-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Ready to Share</h2>
          <p className="text-sm text-gray-500 mb-8">Your quote for {mockQuote.clientName || 'the job'} is approved and ready to send.</p>
          <div className="space-y-4">
            
            {/* Direct Integration Button */}
            <div 
                onClick={(!sendingToAcc && connectedAccountingSoftware) ? handleDirectIntegration : (!connectedAccountingSoftware ? () => navigateTo('accounting') : null)}
                className={`w-full flex items-center p-4 rounded-xl shadow-md text-white transition duration-150 cursor-pointer ${connectedAccountingSoftware ? 'bg-orange-600 hover:bg-orange-700' : 'bg-gray-500 hover:bg-gray-600'}`}
                role="button"
                tabIndex={0}
            >
                <div className="mr-4">
                    {sendingToAcc ? <Loader className="animate-spin" size={24}/> : <TrendingUp size={24}/>}
                </div>
                <span className="font-semibold text-lg">
                    {sendingToAcc ? "Sending..." : label}
                </span>
            </div>

            <ShareOption icon={<MessageSquare size={24}/>} label="WhatsApp" color="bg-green-500" onClick={handleShareWhatsApp} />
            <ShareOption icon={<Mail size={24}/>} label="Email" color="bg-red-500" onClick={handleShareEmail} />
            <ShareOption icon={<Phone size={24}/>} label="SMS" color="bg-blue-500" onClick={handleShareSMS} />
            
            <button onClick={handleQuoteSent} className="w-full py-3 text-lg font-semibold text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 mt-6">New Quote</button>
          </div>
        </div>
      </div>
    );
};

const ReferralScreen = () => (
    <div className="p-4 bg-gray-50 h-full overflow-y-auto pb-6">
        <h2 className="text-xl sm:text-2xl font-bold text-blue-600 mb-3 flex items-center"><Gift size={20} className="mr-2"/> Referral Program</h2>
        <p className="text-sm text-gray-600 mb-4">Refer your industry friends and earn discounts on your next subscription payment!</p>

        <div className="bg-white p-4 sm:p-6 rounded-xl shadow-lg border-2 border-green-100 mb-4 text-center">
            <h3 className="text-2xl sm:text-3xl font-bold text-green-700 mb-1">$20 OFF</h3>
            <p className="text-xs sm:text-sm font-semibold text-gray-700 mb-3">For every successful signup.</p>
            <div className="border-t pt-3">
                <p className="text-xs text-gray-500 mb-2">Your Unique Referral Code:</p>
                <div className="bg-gray-100 p-2 sm:p-3 rounded-lg flex justify-between items-center">
                    <span className="font-mono font-bold text-base sm:text-lg text-gray-800 select-all">TQ-JD-3289</span>
                    <button className="text-blue-500 hover:text-blue-700 text-xs sm:text-sm font-semibold ml-2">Copy</button>
                </div>
            </div>
        </div>

        <h3 className="font-bold text-gray-700 mb-2 text-sm sm:text-base">How It Works</h3>
        <div className="bg-white rounded-lg shadow-sm divide-y">
            {[
                { step: 1, text: "Share your unique referral code (TQ-JD-3289) with a fellow tradie." },
                { step: 2, text: "They sign up for Talk2Quote Pro Plan using your code." },
                { step: 3, text: "You automatically receive $20 off your next bill!" },
            ].map((item) => (
                <div key={item.step} className="p-3 sm:p-4 flex items-start space-x-2 sm:space-x-3">
                    <div className="flex-shrink-0 w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center rounded-full bg-blue-100 text-blue-600 font-bold text-xs sm:text-sm mt-0.5">
                        {item.step}
                    </div>
                    <p className="text-xs sm:text-sm text-gray-700">{item.text}</p>
                </div>
            ))}
        </div>
    </div>
);

const CompanyDetailsScreen = ({ companyDetails, setCompanyDetails }) => {
    // Logo Upload Logic
    const handleLogoUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setCompanyDetails(prev => ({ ...prev, logoUrl: reader.result }));
            };
            reader.readAsDataURL(file);
        }
    };

    return (
    <div className="p-4 bg-gray-50 h-full overflow-y-auto">
      <h2 className="text-xl font-bold text-gray-800 mb-4">Company Details</h2>
      <div className="bg-white p-4 rounded-xl shadow-lg space-y-6">
        <div className="border-b pb-4">
          <h3 className="font-semibold text-blue-700 mb-3 flex items-center"><Building size={18} className="mr-2"/> Business Information</h3>
          
          {/* LOGO UPLOAD SECTION */}
          <div className="mb-6 p-4 bg-gray-50 border border-dashed border-gray-300 rounded-lg flex items-center justify-between">
              <div className="flex items-center space-x-4">
                  <div className="h-16 w-16 bg-white rounded-lg border border-gray-200 flex items-center justify-center overflow-hidden">
                      {companyDetails.logoUrl ? (
                          <img src={companyDetails.logoUrl} alt="Logo Preview" className="h-full w-full object-contain" />
                      ) : (
                          <span className="text-xs text-gray-400">No Logo</span>
                      )}
                  </div>
                  <div>
                      <p className="text-sm font-medium text-gray-700">Company Logo</p>
                      <p className="text-xs text-gray-500">Appears on PDF</p>
                  </div>
              </div>
              <label className="cursor-pointer bg-white border border-gray-300 hover:bg-gray-50 px-3 py-2 rounded-lg shadow-sm text-sm font-medium text-gray-700 flex items-center">
                  <Upload size={16} className="mr-2" /> Upload
                  <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
              </label>
          </div>

          <div className='space-y-4'>
            <InputField label="Company Name" value={companyDetails.name} onChange={e => setCompanyDetails({...companyDetails, name: e.target.value})} placeholder="Company Name" />
            
            {/* Added Address & Website */}
            <InputField label="Business Address" value={companyDetails.address} onChange={e => setCompanyDetails({...companyDetails, address: e.target.value})} placeholder="Street, City, State, ZIP" />
            <InputField label="Website (Optional)" value={companyDetails.website} onChange={e => setCompanyDetails({...companyDetails, website: e.target.value})} placeholder="www.yourbusiness.com" />
            
            <InputField label="ABN/Tax ID" value={companyDetails.abn} onChange={e => setCompanyDetails({...companyDetails, abn: e.target.value})} placeholder="ABN/Tax ID" />
            
            {/* GST Toggle */}
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                <span className="text-sm font-medium text-gray-700">Registered for GST?</span>
                <button 
                    onClick={() => setCompanyDetails({...companyDetails, gstRegistered: !companyDetails.gstRegistered})}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${companyDetails.gstRegistered ? 'bg-blue-600' : 'bg-gray-200'}`}
                >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${companyDetails.gstRegistered ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
            </div>

            <InputField label="Standard Terms" value={companyDetails.terms} onChange={e => setCompanyDetails({...companyDetails, terms: e.target.value})} placeholder="Terms (e.g., 14 Days Net)" />
          </div>
        </div>
        <div>
          <h3 className="font-semibold text-blue-700 mb-3 flex items-center"><CreditCard size={18} className="mr-2"/> Bank Details</h3>
          <div className='space-y-4'>
            <InputField label="Bank Name" value={companyDetails.bankName} onChange={e => setCompanyDetails({...companyDetails, bankName: e.target.value})} placeholder="Bank Name" />
            <InputField label="Account Name" value={companyDetails.accountName} onChange={e => setCompanyDetails({...companyDetails, accountName: e.target.value})} placeholder="Account Name" />
            <div className='flex space-x-4'>
                <InputField label="BSB" value={companyDetails.bsb} onChange={e => setCompanyDetails({...companyDetails, bsb: e.target.value})} placeholder="BSB (e.g., 012-345)" />
                <InputField label="Account Number" value={companyDetails.accountNumber} onChange={e => setCompanyDetails({...companyDetails, accountNumber: e.target.value})} placeholder="Account Number" />
            </div>
          </div>
        </div>
        <div className="pt-4 border-t flex justify-end">
            <button className="py-2 px-4 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 flex items-center shadow-md">
                <Save size={18} className="mr-2"/> Save Details
            </button>
        </div>
      </div>
    </div>
    );
};

const SubscriptionScreen = ({ user, supabase }) => {
    const [subscription, setSubscription] = useState(null);
    const [usage, setUsage] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showCancelModal, setShowCancelModal] = useState(false);

    useEffect(() => {
        if (user) {
            fetchSubscriptionData();
        }
    }, [user]);

    const fetchSubscriptionData = async () => {
        try {
            const { data: subData, error: subError } = await supabase
                .from('subscriptions')
                .select('*')
                .eq('user_id', user.uid)
                .maybeSingle();

            if (subError) throw subError;

            const { data: usageData, error: usageError } = await supabase
                .from('subscription_usage')
                .select('*')
                .eq('user_id', user.uid)
                .maybeSingle();

            if (usageError) throw usageError;

            setSubscription(subData || {
                plan_type: 'free',
                status: 'active',
                cancel_at_period_end: false
            });

            setUsage(usageData || {
                quotes_generated: 0,
                storage_used_gb: 0
            });
        } catch (error) {
            console.error('Error fetching subscription:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddPayment = () => {
        alert('To set up payments:\n\n1. Create a Stripe account at https://dashboard.stripe.com/register\n2. Get your Stripe secret key from the Developers section\n3. Payment integration will be completed with Stripe\n\nFor now, this is a demo showing the UI.');
    };

    const handleCancelSubscription = async () => {
        if (!subscription?.id) {
            alert('No active subscription found');
            return;
        }

        try {
            const { error } = await supabase
                .from('subscriptions')
                .update({
                    cancel_at_period_end: true,
                    status: 'canceled'
                })
                .eq('id', subscription.id);

            if (error) throw error;

            alert('Your subscription has been canceled. You will retain access until the end of your billing period.');
            setShowCancelModal(false);
            fetchSubscriptionData();
        } catch (error) {
            console.error('Error canceling subscription:', error);
            alert('Failed to cancel subscription. Please try again.');
        }
    };

    const handleReactivateSubscription = async () => {
        if (!subscription?.id) return;

        try {
            const { error } = await supabase
                .from('subscriptions')
                .update({
                    cancel_at_period_end: false,
                    status: 'active'
                })
                .eq('id', subscription.id);

            if (error) throw error;

            alert('Your subscription has been reactivated!');
            fetchSubscriptionData();
        } catch (error) {
            console.error('Error reactivating subscription:', error);
            alert('Failed to reactivate subscription. Please try again.');
        }
    };

    if (loading) {
        return (
            <div className="p-4 bg-gray-50 h-full flex items-center justify-center">
                <div className="text-gray-600">Loading subscription...</div>
            </div>
        );
    }

    const planDetails = {
        trial: { name: 'Free Trial', price: '$0', features: '10 professional quotes to experience the power of voice-to-quote' },
        pro: { name: 'Pro Plan', price: '$29', features: 'Unlimited quotes, PDF generation, and all features' }
    };

    const currentPlan = planDetails[subscription?.plan_type || 'trial'];
    const nextBillingDate = subscription?.current_period_end
        ? new Date(subscription.current_period_end).toLocaleDateString()
        : 'N/A';

    const statusColors = {
        active: 'bg-green-100 text-green-800',
        canceled: 'bg-red-100 text-red-800',
        expired: 'bg-gray-100 text-gray-800',
        past_due: 'bg-yellow-100 text-yellow-800'
    };

    return (
        <div className="p-4 bg-gray-50 h-full overflow-y-auto">
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Subscription</h2>

            <div className="bg-white p-6 rounded-xl shadow-lg border-2 border-blue-100 mb-6">
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <h3 className="text-lg font-bold text-blue-800">{currentPlan.name}</h3>
                        <span className={`text-xs px-2 py-1 rounded-full font-bold ${statusColors[subscription?.status || 'active']}`}>
                            {subscription?.status?.toUpperCase() || 'ACTIVE'}
                        </span>
                        {subscription?.cancel_at_period_end && (
                            <div className="text-xs text-red-600 mt-1">
                                Cancels on {nextBillingDate}
                            </div>
                        )}
                    </div>
                    <Star className="text-yellow-400 fill-current" size={24} />
                </div>

                <p className="text-gray-600 mb-4">{currentPlan.features}</p>

                <div className="text-3xl font-bold text-gray-900 mb-1">
                    {currentPlan.price}
                    {subscription?.plan_type !== 'trial' && <span className="text-sm text-gray-500 font-normal">/mo</span>}
                </div>

                {subscription?.plan_type === 'pro' && (
                    <p className="text-xs text-gray-400 mb-4">Next billing date: {nextBillingDate}</p>
                )}

                {subscription?.plan_type === 'trial' && (
                    <div className="bg-blue-50 border-l-4 border-blue-500 p-3 rounded mb-4">
                        <p className="text-sm text-blue-700">
                            <strong>Free Trial Active!</strong> You have {10 - (usage?.quotes_generated || 0)} quotes remaining. Upgrade to Pro for unlimited quotes.
                        </p>
                    </div>
                )}

                {subscription?.payment_method_last4 && (
                    <div className="bg-gray-50 p-3 rounded-lg mb-4">
                        <div className="text-sm text-gray-600">
                            Payment Method: {subscription.payment_method_brand} •••• {subscription.payment_method_last4}
                        </div>
                    </div>
                )}

                {subscription?.plan_type === 'trial' ? (
                    <button
                        onClick={handleAddPayment}
                        className="w-full py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-bold rounded-lg hover:from-blue-700 hover:to-blue-800 flex items-center justify-center transition shadow-lg"
                    >
                        <Star size={18} className="mr-2"/>
                        Upgrade to Pro - $29/month
                    </button>
                ) : (
                    <button
                        onClick={handleAddPayment}
                        className="w-full py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 flex items-center justify-center transition mb-3"
                    >
                        <CreditCard size={18} className="mr-2"/>
                        {subscription?.payment_method_last4 ? 'Update Payment Method' : 'Add Payment Method'}
                    </button>
                )}

                {subscription?.plan_type === 'pro' && subscription?.status === 'active' && !subscription?.cancel_at_period_end && (
                    <button
                        onClick={() => setShowCancelModal(true)}
                        className="w-full py-3 bg-red-50 text-red-600 font-semibold rounded-lg hover:bg-red-100 transition"
                    >
                        Cancel Subscription
                    </button>
                )}

                {subscription?.cancel_at_period_end && (
                    <button
                        onClick={handleReactivateSubscription}
                        className="w-full py-3 bg-green-50 text-green-600 font-semibold rounded-lg hover:bg-green-100 transition"
                    >
                        Reactivate Subscription
                    </button>
                )}
            </div>

            <h3 className="font-bold text-gray-700 mb-3">Plan Usage</h3>
            <div className="bg-white p-4 rounded-lg shadow-sm space-y-4">
                <div>
                    <div className="flex justify-between text-sm mb-1">
                        <span>Quotes Generated</span>
                        <span className="font-bold">
                            {usage?.quotes_generated || 0} / {subscription?.plan_type === 'pro' ? 'Unlimited' : '10'}
                        </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                            className="bg-blue-600 h-2 rounded-full"
                            style={{ width: subscription?.plan_type === 'pro' ? '75%' : `${Math.min((usage?.quotes_generated || 0) / 10 * 100, 100)}%` }}
                        ></div>
                    </div>
                </div>
                <div>
                    <div className="flex justify-between text-sm mb-1">
                        <span>Cloud Storage</span>
                        <span className="font-bold">{(usage?.storage_used_gb || 0).toFixed(1)}GB / 10GB</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                            className="bg-purple-600 h-2 rounded-full"
                            style={{ width: `${Math.min((usage?.storage_used_gb || 0) / 10 * 100, 100)}%` }}
                        ></div>
                    </div>
                </div>
            </div>

            {showCancelModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-xl shadow-2xl max-w-md w-full mx-4">
                        <h3 className="text-xl font-bold text-gray-800 mb-3">Cancel Subscription?</h3>
                        <p className="text-gray-600 mb-4">
                            Are you sure you want to cancel your subscription? You will retain access until {nextBillingDate}.
                        </p>
                        <div className="flex space-x-3">
                            <button
                                onClick={() => setShowCancelModal(false)}
                                className="flex-1 py-2 px-4 bg-gray-200 text-gray-800 font-semibold rounded-lg hover:bg-gray-300 transition"
                            >
                                Keep Subscription
                            </button>
                            <button
                                onClick={handleCancelSubscription}
                                className="flex-1 py-2 px-4 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const InstallBanner = ({ onInstall, onDismiss }) => (
    <div className="fixed top-0 left-0 right-0 bg-blue-600 text-white p-4 shadow-lg z-50 flex items-center justify-between">
      <div className="flex items-center flex-1">
        <Download size={24} className="mr-3 flex-shrink-0" />
        <div className="flex-1">
          <p className="font-semibold text-sm">Install Talk2Quote</p>
          <p className="text-xs opacity-90">Get the best experience with our app</p>
        </div>
      </div>
      <div className="flex gap-2 ml-2">
        <button
          onClick={onInstall}
          className="bg-white text-blue-600 px-4 py-2 rounded-lg font-semibold text-sm hover:bg-blue-50"
        >
          Install
        </button>
        <button
          onClick={onDismiss}
          className="p-2 hover:bg-blue-700 rounded-lg"
          aria-label="Dismiss"
        >
          <X size={20} />
        </button>
      </div>
    </div>
);

const MenuDrawer = ({ isMenuOpen, navigateTo, handleLogout }) => (
    <div className={`fixed top-0 left-0 h-full w-64 bg-white shadow-2xl z-50 transform transition-transform duration-300 ${isMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
      <div className="p-6">
        <img src={T2Q_LOGO_URL} alt="Talk2Quote Logo" className="h-8 mb-8" />
        <div className="space-y-3">
          <MenuItem icon={Home} label="Create a Quote" onClick={() => navigateTo('main')} />
          <MenuItem icon={History} label="Previous Quotes" onClick={() => navigateTo('history')} />
          <MenuItem icon={Gift} label="Referral Program" onClick={() => navigateTo('referral')} />
          <MenuItem icon={TrendingUp} label="Accounting Integration" onClick={() => navigateTo('accounting')} />
          <MenuItem icon={Building} label="Company Details" onClick={() => navigateTo('companyDetails')} />
          <MenuItem icon={CreditCard} label="Subscription" onClick={() => navigateTo('subscription')} />
          <MenuItem icon={Settings} label="Settings" onClick={() => navigateTo('settings')} />
          <div className="pt-6 border-t mt-6">
            <MenuItem icon={LogOut} label="Sign Out" onClick={handleLogout} isDestructive={true} />
          </div>
        </div>
      </div>
    </div>
);

const Layout = ({ children, isMenuOpen, setIsMenuOpen, navigateTo, handleLogout }) => (
    <div className="flex flex-col h-screen max-w-md mx-auto bg-gray-100 shadow-2xl">
      <header className="flex items-center justify-between p-4 bg-white border-b border-gray-200 shadow-sm sticky top-0 z-40">
          <button onClick={() => setIsMenuOpen(true)} className="p-2 rounded-full text-blue-600 hover:bg-blue-50" aria-label="Open Menu">
            <Menu size={24} />
          </button>
          <div className="flex justify-center">
            <img src={T2Q_LOGO_URL} alt="Talk2Quote App" className="h-16 object-contain" />
          </div>
          <button
            onClick={() => navigateTo('referral')}
            className="p-2 rounded-full text-purple-600 hover:bg-purple-50"
            aria-label="Referral Program"
          >
            <Gift size={24}/>
          </button>
      </header>
      <main className="flex-grow overflow-y-auto">{children}</main>
      <MenuDrawer isMenuOpen={isMenuOpen} navigateTo={navigateTo} handleLogout={handleLogout} />
      {isMenuOpen && <div className="fixed inset-0 bg-black bg-opacity-50 z-40" onClick={() => setIsMenuOpen(false)}></div>}
    </div>
);

// --- Component: Main Application ---
const App = () => {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState('login');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [loadingQuotes, setLoadingQuotes] = useState(false);
  const [integrationUrl, setIntegrationUrl] = useState('');

  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);

  // Speech Recognition State
  const [transcript, setTranscript] = useState('');
  const recognitionRef = useRef(null);

  const [lastQuoteAccepted, setLastQuoteAccepted] = useState(false);
  const [connectedAccountingSoftware, setConnectedAccountingSoftware] = useState('');

  const [companyDetails, setCompanyDetails] = useState({
    name: 'Talk2Quote Services Pty Ltd',
    abn: '87 654 321 000',
    terms: '14 Days Net',
    email: 'billing@talk2quote.com',
    phone: '(02) 8000 1234',
    website: 'www.talk2quote.app',
    address: '123 Business Rd, Sydney NSW 2000',
    gstRegistered: true, // Default to true for AU
    bankName: 'ANZ',
    accountName: 'Talk2Quote Holdings',
    bsb: '012-345',
    accountNumber: '987654321',
    logoUrl: null
  });

  const [mockQuote, setMockQuote] = useState({
    id: 104,
    clientName: '', 
    clientEmail: '', 
    jobAddress: '',
    scopeSummary: '', 
    paymentTerms: '7 Days EOM',
    status: 'Not Started',
    date: new Date().toLocaleDateString(),
    items: [],
    firestoreId: null
  });
  
  const [previousQuotes, setPreviousQuotes] = useState([]);

  // --- PWA INSTALL PROMPT ---
  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    if (window.matchMedia('(display-mode: standalone)').matches) {
      setShowInstallBanner(false);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      setShowInstallBanner(false);
    }

    setDeferredPrompt(null);
  };

  // --- FIREBASE AUTHENTICATION ---
  useEffect(() => {
    const initAuth = async () => {
      try {
        await setPersistence(auth, browserLocalPersistence);
      } catch (e) {
        console.warn("Persistence setting failed, using default:", e);
      }
    };
    initAuth();

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
        if (currentUser) {
            setUser(currentUser);
        } else {
            setUser(null);
        }
        setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // --- FIREBASE DATA SYNC ---
  useEffect(() => {
    if (!user) return;
    setLoadingQuotes(true);

    // Fetch User Integration Settings
    const fetchSettings = async () => {
        try {
            const settingsRef = doc(db, 'artifacts', APP_ID, 'users', user.uid, 'settings', 'integration');
            const docSnap = await getDoc(settingsRef);
            if (docSnap.exists()) {
                const data = docSnap.data();
                setConnectedAccountingSoftware(data.softwareId || '');
                setIntegrationUrl(data.webhookUrl || '');
            }
        } catch (err) {
            console.log("No settings found yet.");
        }
    };
    fetchSettings();

    // Listen to the 'quotes' collection for this user
    const q = query(collection(db, 'artifacts', APP_ID, 'users', user.uid, 'quotes'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
        const quotesData = snapshot.docs.map(doc => ({
            ...doc.data(),
            firestoreId: doc.id
        }));
        
        quotesData.sort((a, b) => {
            const dateA = a.createdAt ? new Date(a.createdAt) : new Date(0);
            const dateB = b.createdAt ? new Date(b.createdAt) : new Date(0);
            return dateB - dateA;
        });
        
        setPreviousQuotes(quotesData);
        setLoadingQuotes(false);
    }, (error) => {
        console.error("Data Fetch Error:", error);
        setLoadingQuotes(false);
    });

    return () => unsubscribe();
  }, [user]);

  const updateWebhookUrl = async (softwareId, url) => {
      if (!user) return;
      setIntegrationUrl(url);
      const settingsRef = doc(db, 'artifacts', APP_ID, 'users', user.uid, 'settings', 'integration');
      await setDoc(settingsRef, { softwareId, webhookUrl: url }, { merge: true });
  };

  const isClientInfoSet = mockQuote.clientEmail && mockQuote.clientEmail.trim() !== '';

  // --- SPEECH RECOGNITION SETUP ---
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = true;

        recognitionRef.current.onresult = (event) => {
            let currentTranscript = '';
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                currentTranscript += event.results[i][0].transcript;
            }
            setTranscript(currentTranscript);
        };
        
        recognitionRef.current.onerror = (event) => {
            console.error("Speech Error:", event.error);
            setIsRecording(false);
        };
    } else {
        console.log("Browser does not support Speech Recognition");
    }
  }, []);

  // --- ACTIONS ---
  const handleLogin = async (email, password) => {
      await signInWithEmailAndPassword(auth, email, password);
      setCurrentPage('main');
  };

  const handleSignUp = async (email, password) => {
      await createUserWithEmailAndPassword(auth, email, password);
      setCurrentPage('main');
  };

  const handlePasswordReset = async (email) => {
      await sendPasswordResetEmail(auth, email);
  };

  const handleLogout = async () => {
    await signOut(auth);
    setIsMenuOpen(false); 
    setCurrentPage('login'); 
  };

  const navigateTo = (page) => {
    setCurrentPage(page);
    setIsMenuOpen(false);
  };

  const handleSelectQuote = (quote) => {
      setMockQuote(quote);
      navigateTo('review');
  };

  // --- THE AI ENGINE & AUTO-SAVE ---
  const generateQuoteFromAI = async (finalText) => {
    setIsProcessing(true);

    if (!finalText || finalText.trim().length < 5) {
        alert("I didn't hear enough detail. Please try recording again.");
        setIsProcessing(false);
        return;
    }

    const prompt = `
      You are a precise transcription assistant for trade quotes.

      CRITICAL RULES:
      1. Convert the speech EXACTLY as spoken into a professional "Scope of Work" format
      2. DO NOT invent, estimate, or add prices unless specifically mentioned in the audio
      3. DO NOT invent quantities unless explicitly stated
      4. ONLY extract line items that were clearly mentioned in the transcript
      5. If prices/quantities were NOT mentioned, use 0 as placeholder
      6. Stay faithful to what was actually said - no creativity or assumptions

      TRANSCRIPT: "${finalText}"

      JSON FORMAT REQUIRED:
      {
        "scopeSummary": "Exact transcription of what was said, formatted professionally",
        "items": [
          { "id": 1, "description": "Exactly what was mentioned", "qty": 0, "price": 0 }
        ]
      }

      REMEMBER: If it wasn't said in the audio, don't include it. Accuracy over completeness.
    `;

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }]
            })
        });

        const data = await response.json();
        const textResult = data.candidates[0].content.parts[0].text;
        const jsonString = textResult.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsedResult = JSON.parse(jsonString);

        // --- NEW: AUTO-SAVE DRAFT TO FIRESTORE ---
        
        // Safety: Ensure AI items are valid numbers/strings before saving to prevent React crashes
        const safeItems = (parsedResult.items || []).map((item, index) => ({
            ...item,
            id: index + 1,
            qty: Number(item.qty) || 0,
            price: Number(item.price) || 0,
            description: String(item.description || '')
        }));

        let newDocId = null;
        if (user) {
            const draftData = {
                clientName: mockQuote.clientName,
                clientEmail: mockQuote.clientEmail,
                jobAddress: '123 Oak St, Sydney NSW (Detected via GPS)', // Using mock GPS for now
                scopeSummary: parsedResult.scopeSummary,
                items: safeItems,
                paymentTerms: '7 Days EOM',
                status: 'Draft',
                createdAt: new Date().toISOString(),
                displayDate: new Date().toLocaleDateString(),
                total: calculateQuoteTotal(safeItems)
            };
            
            const docRef = await addDoc(collection(db, 'artifacts', APP_ID, 'users', user.uid, 'quotes'), draftData);
            newDocId = docRef.id;
            console.log("Draft auto-saved with ID:", newDocId);
        }

        setMockQuote(prev => ({
            ...prev,
            jobAddress: '123 Oak St, Sydney NSW (Detected via GPS)',
            status: 'Review Pending',
            scopeSummary: parsedResult.scopeSummary,
            items: safeItems,
            firestoreId: newDocId // Link local state to DB doc
        }));

        setIsProcessing(false);
        setTranscript(''); 
        navigateTo('review');

    } catch (error) {
        console.error("AI Error:", error);
        alert("Error connecting to AI. Please check your API Key or try again.");
        setIsProcessing(false);
    }
  };

  const handleRecordToggle = (e) => {
    // PREVENT PAGE REFRESH ON CLICK
    if (e) e.preventDefault();
    
    if (!isRecording && !isClientInfoSet) return;
    
    if (!isRecording) {
      setTranscript('');
      setIsRecording(true);
      try {
        recognitionRef.current?.start();
      } catch (err) {
        console.error("Mic start error:", err);
        setIsRecording(false);
      }
    } else {
      setIsRecording(false);
      try {
        recognitionRef.current?.stop();
      } catch (err) {
        console.error("Mic stop error:", err);
      }
      setTimeout(() => {
          generateQuoteFromAI(transcript);
      }, 500);
    }
  };

  // --- UPDATE DATABASE ON SEND ---
  const handleQuoteSent = async () => {
    if (!user) {
        alert("You must be logged in to save.");
        return;
    }

    const total = calculateQuoteTotal(mockQuote.items);
    
    try {
        if (mockQuote.firestoreId) {
            // Update the existing Draft
            const quoteRef = doc(db, 'artifacts', APP_ID, 'users', user.uid, 'quotes', mockQuote.firestoreId);
            await updateDoc(quoteRef, {
                status: 'Sent',
                total: total,
                // Update any fields changed during review
                clientName: mockQuote.clientName,
                clientEmail: mockQuote.clientEmail,
                jobAddress: mockQuote.jobAddress,
                scopeSummary: mockQuote.scopeSummary,
                items: mockQuote.items
            });
            console.log("Quote Updated to Sent!");
        } else {
            // Fallback: Create new if no draft exists
            const newQuoteData = {
                ...mockQuote,
                total: total,
                status: 'Sent',
                createdAt: new Date().toISOString(),
                displayDate: new Date().toLocaleDateString()
            };
            await addDoc(collection(db, 'artifacts', APP_ID, 'users', user.uid, 'quotes'), newQuoteData);
            console.log("Quote Created directly as Sent!");
        }
        
        setLastQuoteAccepted(true);
        setTimeout(() => setLastQuoteAccepted(false), 3000);

        setMockQuote({
            id: Math.floor(Math.random() * 10000),
            clientName: '', clientEmail: '', jobAddress: '', scopeSummary: '', 
            paymentTerms: '7 Days EOM', status: 'Not Started', date: new Date().toLocaleDateString(),
            items: [],
            firestoreId: null
        });

        navigateTo('share'); 

    } catch (error) {
        console.error("Error saving quote: ", error);
        alert("Failed to save quote. Check console.");
    }
  }

  const handleItemChange = (id, field, value) => {
    const newItems = mockQuote.items.map(item => {
      if (item.id === id) {
        return { ...item, [field]: value };
      }
      return item;
    });
    setMockQuote({ ...mockQuote, items: newItems });
  };

  // While checking auth status, show nothing or a loader
  if (authLoading) return <div className="h-screen flex items-center justify-center"><Loader className="animate-spin text-blue-600"/></div>;

  let content;
  if (!user || currentPage === 'login') {
      content = <LoginScreen handleLogin={handleLogin} handleSignUp={handleSignUp} handlePasswordReset={handlePasswordReset} />;
  } else {
    switch (currentPage) {
      case 'main': 
        content = <MainScreen 
            mockQuote={mockQuote} 
            setMockQuote={setMockQuote} 
            isClientInfoSet={isClientInfoSet} 
            handleRecordToggle={handleRecordToggle} 
            isRecording={isRecording} 
            isProcessing={isProcessing} 
            transcript={transcript} 
        />; 
        break;
      case 'review': 
        content = <ReviewScreen 
            mockQuote={mockQuote} 
            setMockQuote={setMockQuote} 
            handleItemChange={handleItemChange} 
            navigateTo={navigateTo} 
            handleQuoteSent={handleQuoteSent} 
        />; 
        break;
      case 'pdfPreview': 
        content = <PdfPreviewScreen 
            mockQuote={mockQuote} 
            companyDetails={companyDetails} 
            navigateTo={navigateTo} 
            handleQuoteSent={handleQuoteSent} 
        />; 
        break;
      case 'share': 
        content = <ShareScreen 
            connectedAccountingSoftware={connectedAccountingSoftware} 
            mockQuote={mockQuote} 
            handleQuoteSent={handleQuoteSent} 
            navigateTo={navigateTo} 
            integrationUrl={integrationUrl}
        />; 
        break;
      case 'history': 
        content = <HistoryScreen 
            previousQuotes={previousQuotes} 
            lastQuoteAccepted={lastQuoteAccepted} 
            loadingQuotes={loadingQuotes}
            onSelectQuote={handleSelectQuote}
        />; 
        break; 
      case 'companyDetails': 
        content = <CompanyDetailsScreen 
            companyDetails={companyDetails} 
            setCompanyDetails={setCompanyDetails} 
        />; 
        break;
      case 'subscription':
        content = <SubscriptionScreen user={user} supabase={db} />;
        break;
      case 'settings':
        content = <SettingsScreen navigateTo={navigateTo} user={user} />;
        break;
      case 'profile':
        content = <ProfileScreen navigateTo={navigateTo} user={user} />;
        break;
      case 'security':
        content = <SecurityScreen navigateTo={navigateTo} user={user} />;
        break;
      case 'referral':
        content = <ReferralScreen />;
        break; 
      case 'accounting':
        content = <AccountingScreen user={user} supabase={db} />;
        break;
      default: 
        content = <MainScreen 
            mockQuote={mockQuote} 
            setMockQuote={setMockQuote} 
            isClientInfoSet={isClientInfoSet} 
            handleRecordToggle={handleRecordToggle} 
            isRecording={isRecording} 
            isProcessing={isProcessing} 
            transcript={transcript} 
        />;
    }
  }

  // If user is logged in but on login page, redirect logic is handled in handleLogin,
  // but if they refresh, the useEffect sets user, and we need to show content.
  if (user && currentPage === 'login') {
      // Small side effect to push them to main if they are already authed
      setTimeout(() => setCurrentPage('main'), 0);
  }

  return (
    <>
      {showInstallBanner && user && (
        <InstallBanner
          onInstall={handleInstallClick}
          onDismiss={() => setShowInstallBanner(false)}
        />
      )}
      <Layout
          isMenuOpen={isMenuOpen}
          setIsMenuOpen={setIsMenuOpen}
          navigateTo={navigateTo}
          handleLogout={handleLogout}
      >
          {content}
      </Layout>
    </>
  );
};

export default App;