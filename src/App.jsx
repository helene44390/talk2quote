import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from "firebase/app";
import { getAuth, signInAnonymously, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, sendPasswordResetEmail, setPersistence, browserLocalPersistence, signInWithCustomToken } from "firebase/auth";
import { getFirestore, collection, addDoc, onSnapshot, query, doc, updateDoc, setDoc, getDoc } from "firebase/firestore";
import {
  Menu, Mic, Settings, History, DollarSign, Building, Check, Share2, Mail, MessageSquare, List,
  Home, User, CreditCard, Save, Pencil, Phone, FileText, X, ChevronRight, Star, Shield, Gift, TrendingUp, Loader, LogOut, Lock, ArrowLeft, Printer, Upload, Download, Globe, MapPin
} from 'lucide-react';

// --- CONFIGURATION ---

const API_KEY = "AIzaSyCmFx-cWKIZXFcYQHtvGkj-yqDFV-XtCMk";

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

const APP_ID = 'talk2quote-v1';
const DEFAULT_LOGO_URL = "https://placehold.co/600x150/e2e8f0/475569?text=Your+Logo&font=roboto";
const T2Q_LOGO_URL = "/LOGO.png";

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
    <img src={T2Q_LOGO_URL} alt="Talk2Quote App" className="h-10 object-contain" />
);

const LogoTitle = () => (
    <img src={T2Q_LOGO_URL} alt="Talk2Quote Logo" className="h-8 object-contain" />
);

// --- Screen Components ---

const LoginScreen = ({ handleLogin, handleSignUp, handlePasswordReset }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');
    const [loading, setLoading] = useState(false);
    const [isResetting, setIsResetting] = useState(false);

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

    const onSignUp = async (e) => {
        e.preventDefault();
        if (!email || !password) { setError("Please enter email and password."); return; }
        if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
        setLoading(true);
        setError('');
        try {
            await handleSignUp(email, password);
        } catch (err) {
            console.log("Signup error handled:", err.code);
            if (err.code === 'auth/email-already-in-use') {
                setError("This email is already registered. Please use 'Sign In' instead.");
            } else {
                setError("Could not create account: " + err.message.replace("Firebase: ", ""));
            }
            setLoading(false);
        }
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
                    <button onClick={onSignUp} disabled={loading} className="w-full py-3 text-lg font-semibold text-blue-600 bg-white border-2 border-blue-600 rounded-lg hover:bg-blue-50">
                        Create Account
                    </button>
                </div>
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
  const handleDeleteItem = (itemId) => {
    const newItems = mockQuote.items.filter(item => item.id !== itemId);
    setMockQuote({...mockQuote, items: newItems});
  };

  const handleAddItem = () => {
    const newId = mockQuote.items.length > 0 ? Math.max(...mockQuote.items.map(i => i.id)) + 1 : 1;
    const newItem = { id: newId, description: 'New Item', qty: 1, price: 0 };
    setMockQuote({...mockQuote, items: [...mockQuote.items, newItem]});
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Scope Summary (From Transcript)</label>
            <textarea
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 transition duration-150 text-gray-700 resize-y min-h-[100px]"
                value={mockQuote.scopeSummary || ''}
                onChange={(e) => setMockQuote({...mockQuote, scopeSummary: e.target.value})}
            />
        </div>

        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Line Items (From Audio Transcript)</h3>
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
    <div className="fixed inset-0 bg-gray-900 z-50 flex flex-col print:bg-white print:static">
        {/* Navigation Bar - Hidden during print */}
        <div className="bg-white p-4 shadow-md flex justify-between items-center print:hidden">
            <h2 className="font-bold text-gray-800">PDF Preview</h2>
            <button onClick={() => navigateTo('review')} className="text-gray-500 hover:text-red-500" aria-label="Close Preview">
                <X size={24} />
            </button>
        </div>

        {/* Scrollable Content Area */}
        <div className="flex-grow overflow-y-auto p-4 bg-gray-800 flex justify-center print:p-0 print:bg-white print:overflow-visible">
            {/* The Actual PDF Document - A4 Aspect Ratio */}
            <div className="bg-white w-full max-w-[595px] min-h-[842px] p-8 shadow-xl text-xs sm:text-sm print:shadow-none print:w-full print:max-w-none">
                <div className="flex justify-between items-start mb-8 border-b pb-4">
                    <div>
                        <h1 className="text-2xl font-bold text-blue-800 mb-2">QUOTE</h1>
                        <p className="text-gray-500">#{mockQuote.id}</p>
                        <p className="text-gray-500">Date: {mockQuote.date}</p>
                    </div>
                    <div className="text-right">
                        {companyDetails.logoUrl ? (
                           <img src={companyDetails.logoUrl} alt="Company Logo" className="h-16 mx-auto mb-2 object-contain" />
                        ) : (
                           <h3 className="font-bold text-2xl text-gray-800">{companyDetails.name || 'Your Business Name'}</h3>
                        )}
                        {!companyDetails.logoUrl && <div className="h-2"></div>} 
                        
                        <p className="text-gray-600">{companyDetails.address || 'Company Address'}</p>
                        <p className="text-gray-600">{companyDetails.email}</p>
                        <p className="text-gray-600">{companyDetails.phone}</p>
                        <p className="text-gray-600">{companyDetails.website}</p>
                        <p className="text-gray-600">ABN: {companyDetails.abn}</p>
                    </div>
                </div>

                <div className="mb-8 bg-gray-50 p-4 rounded">
                    <h4 className="font-bold text-gray-700 mb-2">Prepared For:</h4>
                    <p className="text-lg font-semibold">{mockQuote.clientName || 'Valued Client'}</p>
                    <p className="text-gray-600">{mockQuote.jobAddress}</p>
                    <p className="text-gray-600 font-semibold mt-1">Email: {mockQuote.clientEmail || 'N/A'}</p>
                </div>

                {mockQuote.scopeSummary && (
                    <div className="mb-8">
                        <h4 className="font-bold text-gray-800 mb-2 border-b pb-1">Scope of Work Summary</h4>
                        <p className="whitespace-pre-wrap text-gray-700 leading-relaxed">{mockQuote.scopeSummary}</p>
                    </div>
                )}

                <table className="w-full mb-8">
                    <thead>
                        <tr className="border-b-2 border-gray-800">
                            <th className="text-left py-2">Description</th>
                            <th className="text-right py-2">Qty</th>
                            <th className="text-right py-2">Unit</th>
                            <th className="text-right py-2">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {mockQuote.items && mockQuote.items.map((item) => (
                            <tr key={item.id} className="border-b border-gray-200">
                                <td className="py-2 text-gray-800">{item.description}</td>
                                <td className="py-2 text-right text-gray-600">{item.qty}</td>
                                <td className="py-2 text-right text-gray-600">${item.price ? Number(item.price).toFixed(2) : '0.00'}</td>
                                <td className="py-2 text-right font-medium">${((Number(item.qty) || 0) * (Number(item.price) || 0)).toFixed(2)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                <div className="flex justify-end mb-8">
                    <div className="w-1/2 space-y-2">
                        {companyDetails.gstRegistered && (
                            <>
                                <div className="flex justify-between text-gray-600">
                                    <span>Subtotal</span>
                                    <span>${subTotal.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-gray-600">
                                    <span>GST (10%)</span>
                                    <span>${gstAmount.toFixed(2)}</span>
                                </div>
                            </>
                        )}
                        <div className="flex justify-between pt-2 border-t border-gray-800">
                            <span className="font-bold text-lg">Total</span>
                            <span className="font-bold text-lg text-blue-800">${total.toFixed(2)}</span>
                        </div>
                        <p className="text-right text-xs text-gray-500">
                            {companyDetails.gstRegistered ? 'Includes GST' : 'GST Free'}
                        </p>
                    </div>
                </div>

                <div className="border-t pt-4">
                    {/* Hide approval note on printed PDF to look cleaner */}
                    <div className="bg-blue-50 p-3 rounded-lg text-xs text-blue-800 mb-4 font-medium flex items-center print:hidden">
                        <Check size={16} className="mr-2 flex-shrink-0" />
                        This quote is **approveable** via a secure link in the shared email.
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <h4 className="font-bold text-gray-700 mb-1">Bank Details</h4>
                            <p>Bank: {companyDetails.bankName}</p>
                            <p>Acct: {companyDetails.accountName}</p>
                            <p>BSB: {companyDetails.bsb} | Acc: {companyDetails.accountNumber}</p>
                        </div>
                        <div className="text-right">
                            <h4 className="font-bold text-gray-700 mb-1">Terms</h4>
                            <p>{companyDetails.terms}</p>
                            <p>Valid for 30 Days</p>
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

const SettingsScreen = () => (
    <div className="p-4 bg-gray-50 h-full overflow-y-auto">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Settings</h2>
        
        <div className="bg-white rounded-lg shadow-sm divide-y">
            <div className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition duration-150">
                <div className="flex items-center">
                    <User className="text-gray-400 mr-3" size={20}/>
                    <div>
                        <p className="font-medium">Profile</p>
                        <p className="text-xs text-gray-500">John Doe</p>
                    </div>
                </div>
                <ChevronRight className="text-gray-300" size={20}/>
            </div>
            <div className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition duration-150">
                <div className="flex items-center">
                    <Shield className="text-gray-400 mr-3" size={20}/>
                    <div>
                        <p className="font-medium">Security</p>
                        <p className="text-xs text-gray-500">Password, 2FA</p>
                    </div>
                </div>
                <ChevronRight className="text-gray-300" size={20}/>
            </div>
        </div>

        <h3 className="font-bold text-gray-600 mt-6 mb-2 ml-1 text-sm uppercase">Preferences</h3>
        <div className="bg-white rounded-lg shadow-sm p-4 space-y-4">
            <div className="flex justify-between items-center">
                <span>Default Tax Rate (GST)</span>
                <select className="bg-gray-100 border-none rounded p-1 text-sm focus:ring-blue-500 focus:border-blue-500"><option>10%</option><option>0%</option></select>
            </div>
            <div className="flex justify-between items-center">
                <span>Currency</span>
                <span className="text-gray-500">AUD ($)</span>
            </div>
            <div className="flex justify-between items-center">
                <span>Push Notifications</span>
                <div className="w-10 h-6 bg-green-500 rounded-full relative cursor-pointer p-0.5 transition duration-200">
                    <div className="w-5 h-5 bg-white rounded-full shadow-md transform translate-x-4 transition duration-200"></div>
                </div>
            </div>
        </div>
    </div>
);

const AccountingScreen = ({ connectedAccountingSoftware, setConnectedAccountingSoftware, user, db, updateWebhookUrl }) => {
    const [email, setEmail] = useState('');
    const [showInputFor, setShowInputFor] = useState(null);

    const handleConnect = (softwareId) => {
        setShowInputFor(softwareId);
    };

    const saveEmail = async (softwareId) => {
        if (!email || !email.includes('@')) {
            alert('Please enter a valid email address');
            return;
        }
        setConnectedAccountingSoftware(softwareId);
        await updateWebhookUrl(softwareId, email);
        setShowInputFor(null);
        alert(`Connected! Quotes will be emailed to: ${email}`);
    };

    const handleDisconnect = () => {
        setConnectedAccountingSoftware('');
        setEmail('');
    };

    return (
        <div className="p-4 bg-gray-50 h-full overflow-y-auto">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Accounting Integration</h2>
            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6">
                <p className="text-sm text-blue-700">
                    <strong>Simple Email Integration:</strong> Enter your accounting software email address and quotes will be automatically forwarded there. Easy setup, no technical knowledge required.
                </p>
            </div>

            <h3 className="lg font-bold text-gray-700 mb-3">Available Integrations</h3>
            <div className="space-y-3">
                {[
                  { id: 'Xero', name: 'Xero', color: 'bg-blue-500', icon: 'X', helpText: 'Use your Xero inbox email' },
                  { id: 'QuickBooks', name: 'QuickBooks', color: 'bg-green-600', icon: 'Q', helpText: 'Use your QuickBooks email' },
                  { id: 'MYOB', name: 'MYOB', color: 'bg-purple-600', icon: 'M', helpText: 'Use your MYOB inbox email' },
                ].map(option => (
                    <div key={option.id} className="flex flex-col bg-white rounded-xl shadow-md overflow-hidden">
                        <div
                            className={`p-4 flex items-center justify-between transition duration-150 ${connectedAccountingSoftware === option.id ? 'bg-blue-50 border-b border-blue-100' : ''}`}
                        >
                            <div className='flex items-center'>
                                <div className={`w-8 h-8 flex items-center justify-center rounded-full text-white font-bold mr-4 ${option.color}`}>{option.icon}</div>
                                <span className="font-semibold text-gray-800">{option.name}</span>
                            </div>
                            {connectedAccountingSoftware === option.id ? (
                                <div className="flex items-center">
                                    <span className="text-sm text-green-600 font-semibold mr-3 flex items-center"><Check size={14} className="mr-1"/> ACTIVE</span>
                                    <button onClick={handleDisconnect} className="text-xs text-red-500 underline">Disconnect</button>
                                </div>
                            ) : (
                                <button
                                    onClick={() => handleConnect(option.id)}
                                    className="text-sm px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition duration-150"
                                >
                                    Connect
                                </button>
                            )}
                        </div>

                        {showInputFor === option.id && (
                            <div className="p-4 bg-gray-50 border-t border-gray-100">
                                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Email Address</label>
                                <div className="flex space-x-2">
                                    <input
                                        type="email"
                                        placeholder={option.helpText}
                                        className="flex-grow border border-gray-300 rounded-lg px-3 py-2 text-sm"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                    />
                                    <button
                                        onClick={() => saveEmail(option.id)}
                                        className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-green-700"
                                    >
                                        Save
                                    </button>
                                </div>
                                <p className="text-xs text-gray-400 mt-2">
                                    Quotes will be automatically sent to this email address
                                </p>
                            </div>
                        )}
                    </div>
                ))}
            </div>
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
    <div className="p-4 bg-gray-50 h-full overflow-y-auto">
        <h2 className="text-2xl font-bold text-blue-600 mb-4 flex items-center"><Gift size={24} className="mr-2"/> Referral Program</h2>
        <p className="text-gray-600 mb-6">Refer your industry friends and earn discounts on your next subscription payment!</p>

        <div className="bg-white p-6 rounded-xl shadow-lg border-2 border-green-100 mb-6 text-center">
            <h3 className="text-3xl font-bold text-green-700 mb-1">$20 OFF</h3>
            <p className="text-sm font-semibold text-gray-700 mb-4">For every successful signup.</p>
            <div className="border-t pt-4">
                <p className="text-xs text-gray-500 mb-2">Your Unique Referral Code:</p>
                <div className="bg-gray-100 p-3 rounded-lg flex justify-between items-center">
                    <span className="font-mono font-bold text-lg text-gray-800 select-all">TQ-JD-3289</span>
                    <button className="text-blue-500 hover:text-blue-700 text-sm font-semibold">Copy</button>
                </div>
            </div>
        </div>

        <h3 className="font-bold text-gray-700 mb-3">How It Works</h3>
        <div className="bg-white rounded-lg shadow-sm divide-y">
            {[
                { step: 1, text: "Share your unique referral code (TQ-JD-3289) with a fellow tradie." },
                { step: 2, text: "They sign up for Talk2Quote Pro Plan using your code." },
                { step: 3, text: "You automatically receive $20 off your next bill!" },
            ].map((item) => (
                <div key={item.step} className="p-4 flex items-start space-x-3">
                    <div className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full bg-blue-100 text-blue-600 font-bold text-sm mt-0.5">
                        {item.step}
                    </div>
                    <p className="text-gray-700">{item.text}</p>
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

const SubscriptionScreen = () => {
    const handleAddPayment = () => {
        alert('Payment integration coming soon! This will open a secure payment form to add your card details.');
    };

    return (
    <div className="p-4 bg-gray-50 h-full overflow-y-auto">
      <h2 className="text-2xl font-bold text-gray-800 mb-2">Subscription</h2>
      <div className="bg-white p-6 rounded-xl shadow-lg border-2 border-blue-100 mb-6">
        <div className="flex justify-between items-start mb-4">
            <div>
                <h3 className="text-lg font-bold text-blue-800">Pro Plan</h3>
                <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full font-bold">Active</span>
            </div>
            <Star className="text-yellow-400 fill-current" size={24} />
        </div>
        <p className="text-gray-600 mb-4">Unlimited quotes and PDF generation.</p>
        <div className="text-3xl font-bold text-gray-900 mb-1">$29.99<span className="text-sm text-gray-500 font-normal">/mo</span></div>
        <p className="text-xs text-gray-400 mb-4">Next billing date: Dec 28, 2025</p>
        <button
          onClick={handleAddPayment}
          className="w-full py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 flex items-center justify-center transition"
        >
          <CreditCard size={18} className="mr-2"/> Add Payment Method
        </button>
      </div>

      <h3 className="font-bold text-gray-700 mb-3">Plan Usage</h3>
      <div className="bg-white p-4 rounded-lg shadow-sm space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-1"><span>Quotes Generated</span><span className="font-bold">124 / Unlimited</span></div>
            <div className="w-full bg-gray-200 rounded-full h-2"><div className="bg-blue-600 h-2 rounded-full w-3/4"></div></div>
          </div>
          <div>
            <div className="flex justify-between text-sm mb-1"><span>Cloud Storage</span><span className="font-bold">2.1GB / 10GB</span></div>
            <div className="w-full bg-gray-200 rounded-full h-2"><div className="bg-purple-600 h-2 rounded-full w-1/4"></div></div>
          </div>
      </div>
    </div>
    );
};

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
          <AppHeader />
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
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${API_KEY}`, {
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
        content = <SubscriptionScreen />; 
        break;
      case 'settings': 
        content = <SettingsScreen />; 
        break;
      case 'referral': 
        content = <ReferralScreen />; 
        break; 
      case 'accounting': 
        content = <AccountingScreen 
            connectedAccountingSoftware={connectedAccountingSoftware} 
            setConnectedAccountingSoftware={setConnectedAccountingSoftware}
            updateWebhookUrl={updateWebhookUrl}
            user={user}
            db={db}
        />; 
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
    <Layout 
        isMenuOpen={isMenuOpen} 
        setIsMenuOpen={setIsMenuOpen} 
        navigateTo={navigateTo} 
        handleLogout={handleLogout}
    >
        {content}
    </Layout>
  );
};

export default App;