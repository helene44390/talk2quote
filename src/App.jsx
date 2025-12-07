import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from "firebase/app";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  setPersistence,
  browserLocalPersistence
} from "firebase/auth";
import {
  getFirestore,
  collection,
  addDoc,
  onSnapshot,
  query,
  doc,
  updateDoc,
  setDoc,
  getDoc,
  deleteDoc,
  orderBy
} from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import {
  Menu, Mic, Settings, History, Building, Check, Share2, Mail, MessageSquare,
  Home, User, CreditCard, Save, Pencil, Phone, FileText, X, ChevronRight, Star, Shield, Gift, TrendingUp, Loader, LogOut, ArrowLeft, Printer, Upload, Download
} from 'lucide-react';
import { generatePDFBase64, downloadPDF } from './utils/pdfGenerator';

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
const functions = getFunctions(app);

const T2Q_LOGO_URL = "/LOGO1.png";

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
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
            <div className="w-full max-w-sm p-6 space-y-4 bg-white shadow-xl rounded-xl">
                <AppHeader />
                <h1 className="handwriting-title text-center text-3xl text-gray-800 mx-auto -mt-2" style={{ fontFamily: "'Caveat', cursive" }}>Turn Recordings Into Quotes Instantly</h1>

                {error && <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg text-center font-medium border border-red-200">{error}</div>}

                <div className="space-y-3 pt-2">
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

                <div className="space-y-3 pt-1">
                    <button onClick={onLogin} disabled={loading} className="w-full py-3 text-lg font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 shadow-md flex justify-center items-center">
                        {loading ? <Loader className="animate-spin" size={24}/> : "Sign In"}
                    </button>

                    <div className="text-center">
                        <button onClick={() => setIsResetting(true)} className="text-sm text-blue-600 hover:text-blue-800 font-medium">
                            Forgot Password?
                        </button>
                    </div>

                    <div className="relative flex py-1 items-center">
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

const TermsModal = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] flex flex-col">
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                    <h2 className="text-2xl font-bold text-gray-800">Terms and Conditions</h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition">
                        <X size={24} className="text-gray-500"/>
                    </button>
                </div>
                <div className="flex-grow overflow-y-auto p-6 space-y-4 text-sm text-gray-700">
                    <h3 className="font-bold text-lg text-gray-800">1. Acceptance of Terms</h3>
                    <p>By accessing and using Talk2Quote ("the Service"), you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to these Terms and Conditions, please do not use the Service.</p>

                    <h3 className="font-bold text-lg text-gray-800">2. Description of Service</h3>
                    <p>Talk2Quote provides a platform for creating, managing, and sharing professional quotes through voice-to-text technology and automated quote generation. The Service includes both free trial and paid subscription options.</p>

                    <h3 className="font-bold text-lg text-gray-800">3. User Accounts</h3>
                    <p>You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You agree to notify us immediately of any unauthorized use of your account.</p>

                    <h3 className="font-bold text-lg text-gray-800">4. Free Trial and Subscriptions</h3>
                    <p>New users receive 10 free trial quotes. After the trial period, continued use requires a paid subscription at $29/month. You may cancel your subscription at any time through your account settings.</p>

                    <h3 className="font-bold text-lg text-gray-800">5. Data and Privacy</h3>
                    <p>We collect and process your personal data in accordance with our Privacy Policy. By using the Service, you consent to such processing and warrant that all data provided by you is accurate.</p>

                    <h3 className="font-bold text-lg text-gray-800">6. User Content</h3>
                    <p>You retain all rights to the quotes and content you create using the Service. You grant us a license to store, process, and display your content solely for the purpose of providing the Service.</p>

                    <h3 className="font-bold text-lg text-gray-800">7. Prohibited Uses</h3>
                    <p>You agree not to use the Service for any unlawful purpose or in any way that could damage, disable, or impair the Service. You may not attempt to gain unauthorized access to any part of the Service.</p>

                    <h3 className="font-bold text-lg text-gray-800">8. Limitation of Liability</h3>
                    <p>The Service is provided "as is" without warranties of any kind. We shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of the Service.</p>

                    <h3 className="font-bold text-lg text-gray-800">9. Changes to Terms</h3>
                    <p>We reserve the right to modify these Terms at any time. Continued use of the Service after changes constitutes acceptance of the modified Terms.</p>

                    <h3 className="font-bold text-lg text-gray-800">10. Contact</h3>
                    <p>For questions about these Terms, please contact us at legal@talk2quote.app</p>

                    <p className="pt-4 text-xs text-gray-500 italic">Last updated: {new Date().toLocaleDateString()}</p>
                </div>
                <div className="p-6 border-t border-gray-200">
                    <button
                        onClick={onClose}
                        className="w-full py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition"
                    >
                        Close
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
        termsAccepted: false
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showTermsModal, setShowTermsModal] = useState(false);

    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        setError('');
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

        if (!formData.termsAccepted) {
            setError('Please accept the terms and conditions.');
            return;
        }

        setLoading(true);
        setError('');

        try {
            await handleSignUp(formData.email, formData.password);

            const user = auth.currentUser;
            if (user) {
                const userProfileRef = doc(db, 'users', user.uid, 'profile', 'details');
                await setDoc(userProfileRef, {
                    email: formData.email,
                    terms_accepted: formData.termsAccepted,
                    plan_type: 'trial',
                    status: 'active',
                    quotes_generated: 0,
                    createdAt: new Date().toISOString()
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

                    <div className="pt-4">
                        <label className="flex items-start">
                            <input
                                type="checkbox"
                                checked={formData.termsAccepted}
                                onChange={(e) => handleChange('termsAccepted', e.target.checked)}
                                className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-pointer"
                            />
                            <span className="ml-3 text-sm text-gray-700">
                                I agree to the <span
                                    className="text-blue-600 underline cursor-pointer hover:text-blue-800"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        setShowTermsModal(true);
                                    }}
                                >Terms and Conditions</span>
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
            <TermsModal isOpen={showTermsModal} onClose={() => setShowTermsModal(false)} />
        </div>
    );
};

const MainScreen = ({ mockQuote, setMockQuote, isClientInfoSet, handleRecordToggle, isRecording, isProcessing, transcript }) => (
    <div className="flex flex-col h-full p-3 bg-gray-50">
      <div className="text-center mb-3">
        <h2 className="text-2xl font-bold text-gray-800 mb-1">Create a Quote</h2>
        <p className="text-sm text-gray-500">Start by entering the client's essential details.</p>
      </div>

      <div className="mb-4 p-3 bg-white rounded-xl shadow-lg border border-gray-100 space-y-3">
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

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 mb-3">
        <p className="text-xs text-blue-800 font-medium mb-1">Quick tip:</p>
        <p className="text-xs text-blue-700">Speak clearly and include all necessary details: client name, job address, scope of work, quantities, and pricing. The more detail you provide, the better your quote will be!</p>
      </div>

      <div className="flex flex-col justify-center items-center mt-auto mb-4 mx-auto">
        <div
          onClick={handleRecordToggle}
          className={`w-28 h-28 flex items-center justify-center rounded-full transition-all duration-300 transform shadow-2xl relative cursor-pointer ${isRecording ? 'bg-red-500 scale-110 animate-pulse' : 'bg-blue-600 hover:bg-blue-700'} text-white ${!isClientInfoSet && 'opacity-50 cursor-not-allowed'}`}
          role="button"
          tabIndex={0}
        >
          {isProcessing ? (
             <Loader size={44} className="animate-spin text-white z-10" />
          ) : (
             <Mic size={44} className={isRecording ? 'text-white z-10' : 'z-10'} />
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
      const generateQuote = httpsCallable(functions, 'generateQuote');
      const result = await generateQuote({
        transcript: mockQuote.scopeSummary,
        type: 'rewrite'
      });

      const aiText = result.data?.rewrittenText || '';

      if (aiText) {
        setMockQuote(prev => ({...prev, scopeSummary: aiText}));
        setHasAiVersion(true);
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

    const handleDownloadPDF = () => {
        downloadPDF(mockQuote, companyDetails);
    };

    const total = calculateQuoteTotal(mockQuote.items);
    const gstAmount = companyDetails.gstRegistered ? (total / 11) : 0;
    const subTotal = companyDetails.gstRegistered ? (total - gstAmount) : total;

    return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col print:static">
        <div className="bg-white p-4 shadow-md flex justify-between items-center print:hidden">
            <h2 className="font-bold text-gray-800">PDF Preview</h2>
            <button onClick={() => navigateTo('review')} className="text-gray-500 hover:text-red-500" aria-label="Close Preview">
                <X size={24} />
            </button>
        </div>

        <div className="flex-grow overflow-y-auto p-4 bg-gray-100 flex justify-center print:p-0 print:overflow-visible print:bg-white">
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
                    <div className="bg-blue-50 p-4 rounded-lg text-sm text-blue-800 mb-6 font-medium flex items-center print:hidden">
                        <Check size={18} className="mr-2 flex-shrink-0" />
                        This quote is approveable via a secure link in the shared email.
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

                <div className="mt-12 pt-8 border-t border-gray-100 text-center">
                    <p className="text-xs text-gray-400 font-medium">Powered by Talk2Quote App</p>
                </div>
            </div>
        </div>

        <div className="bg-white p-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] space-y-2 print:hidden">
            <button onClick={handleDownloadPDF} className="w-full py-3 text-lg font-semibold text-blue-600 bg-white border-2 border-blue-600 rounded-lg hover:bg-blue-50 flex items-center justify-center">
                <Download size={20} className="mr-2"/> Download PDF
            </button>
            <button onClick={handlePrint} className="w-full py-3 text-lg font-semibold text-gray-600 bg-white border-2 border-gray-300 rounded-lg hover:bg-gray-50 flex items-center justify-center">
                <Printer size={20} className="mr-2"/> Print
            </button>
            <button onClick={handleQuoteSent} className="w-full py-3 text-lg font-semibold text-white bg-green-600 rounded-lg hover:bg-green-700 shadow-lg flex items-center justify-center">
                Confirm & Share
            </button>
        </div>

        <style>{`
            @media print {
                @page { margin: 0.5in; size: A4; }
                body { margin: 0; padding: 0; }
                body * { visibility: hidden; }
                .bg-white.w-full.max-w-\\[210mm\\], .bg-white.w-full.max-w-\\[210mm\\] * { visibility: visible !important; }
                .bg-white.w-full.max-w-\\[210mm\\] { position: absolute; left: 0; top: 0; width: 100%; max-width: 100%; box-shadow: none; margin: 0; padding: 0.5in; background: white !important; }
                .bg-gray-50, .bg-blue-50 { background-color: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
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
            </div>
        )}
    </div>
);

const ProfileScreen = ({ navigateTo, user }) => {
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
                </div>
            </div>
        </div>
    );
};

const SecurityScreen = ({ navigateTo, user }) => {
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
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) return;

        const loadSettings = async () => {
            try {
                const settingsRef = doc(db, 'users', user.uid, 'settings', 'preferences');
                const settingsSnap = await getDoc(settingsRef);
                if (settingsSnap.exists()) {
                    const data = settingsSnap.data();
                    setTaxRate(data.taxRate || '10');
                    setNotificationsEnabled(data.notificationsEnabled !== false);
                }
            } catch (error) {
                console.error('Error loading settings:', error);
            } finally {
                setLoading(false);
            }
        };

        loadSettings();
    }, [user]);

    const saveSettings = async (updates) => {
        if (!user) return;
        try {
            const settingsRef = doc(db, 'users', user.uid, 'settings', 'preferences');
            await setDoc(settingsRef, updates, { merge: true });
        } catch (error) {
            console.error('Error saving settings:', error);
        }
    };

    const handleProfileClick = () => { navigateTo('profile'); };
    const handleSecurityClick = () => { navigateTo('security'); };

    const handleTaxRateChange = (e) => {
        const newRate = e.target.value;
        setTaxRate(newRate);
        saveSettings({ taxRate: newRate });
    };

    const toggleNotifications = () => {
        const newValue = !notificationsEnabled;
        setNotificationsEnabled(newValue);
        saveSettings({ notificationsEnabled: newValue });
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

const AccountingScreen = ({ user }) => {
    const [accountingSettings, setAccountingSettings] = useState({});
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedProvider, setSelectedProvider] = useState(null);
    const [emailInput, setEmailInput] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (user) {
            fetchAccountingSettings();
        }
    }, [user]);

    const fetchAccountingSettings = async () => {
        try {
            const settingsSnapshot = await getDoc(doc(db, 'users', user.uid, 'settings', 'accounting'));
            if(settingsSnapshot.exists()){
                setAccountingSettings(settingsSnapshot.data());
            }
        } catch (error) {
            console.error('Error fetching accounting settings:', error);
        } finally {
            setLoading(false);
        }
    };

    const openModal = (provider) => {
        setSelectedProvider(provider);
        setEmailInput(accountingSettings[provider.id]?.email || '');
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setSelectedProvider(null);
        setEmailInput('');
    };

    const handleSaveLink = async () => {
        if (!emailInput.trim()) {
            alert('Please enter an email address');
            return;
        }

        setSaving(true);
        try {
            const settingsRef = doc(db, 'users', user.uid, 'settings', 'accounting');
            await setDoc(settingsRef, {
                [selectedProvider.id]: {
                    email: emailInput.trim(),
                    linkedAt: new Date().toISOString()
                }
            }, { merge: true });

            await fetchAccountingSettings();
            closeModal();
        } catch (error) {
            console.error('Error saving link:', error);
            alert('Failed to save link. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    const getHelpText = (providerId) => {
        const helpTexts = {
            xero: 'Open Xero > Click "Business" menu > Select "Bills to pay" > Look for the "Email to bills" link at the top.',
            myob: 'Open MYOB > Click "Purchases" > Click "In Tray" > Copy the email address shown there.',
            quickbooks: 'Open QuickBooks > Go to "Bookkeeping" > "Transactions" > "Receipts" > Copy the forwarding email.'
        };
        return helpTexts[providerId] || '';
    };

    if (loading) return <div className="p-4 bg-gray-50 flex justify-center"><Loader className="animate-spin text-gray-500"/></div>;

    const providers = [
        { id: 'xero', name: 'Xero', logo: '/Xero logo copy copy.png' },
        { id: 'quickbooks', name: 'QuickBooks', logo: '/Quickbooks logo copy copy.png' },
        { id: 'myob', name: 'MYOB', logo: '/MYOB logo.jpg' },
    ];

    return (
        <>
            <div className="p-4 bg-gray-50 h-full overflow-y-auto">
                <h2 className="text-2xl font-bold text-gray-800 mb-4">Accounting Integration</h2>
                <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6">
                    <p className="text-sm text-blue-700">Link your accounting software to send quotes directly via email.</p>
                </div>

                <div className="space-y-3">
                    {providers.map(provider => {
                        const linkedEmail = accountingSettings[provider.id]?.email;
                        return (
                            <div key={provider.id} className="bg-white rounded-xl shadow-md overflow-hidden">
                                <div className="p-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center flex-1">
                                            <div className="w-12 h-12 flex items-center justify-center rounded-lg mr-4 bg-white border border-gray-200 p-2">
                                                <img src={provider.logo} alt={provider.name} className="w-full h-full object-contain" />
                                            </div>
                                            <div className="flex-1">
                                                <div className="font-semibold text-gray-800">{provider.name}</div>
                                                {linkedEmail ? (
                                                    <div className="mt-1 inline-flex items-center px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                                                        <Check size={12} className="mr-1" />
                                                        Linked to {linkedEmail}
                                                    </div>
                                                ) : (
                                                    <div className="text-xs text-gray-500 mt-1">Not linked</div>
                                                )}
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => openModal(provider)}
                                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold text-sm whitespace-nowrap ml-2"
                                        >
                                            {linkedEmail ? 'Update' : 'Link via Email'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {isModalOpen && selectedProvider && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-xl font-bold text-gray-800">Link {selectedProvider.name}</h3>
                                <button onClick={closeModal} className="p-1 hover:bg-gray-100 rounded-full">
                                    <X size={20} className="text-gray-500" />
                                </button>
                            </div>

                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Paste your unique {selectedProvider.name} Email Address
                                </label>
                                <input
                                    type="email"
                                    value={emailInput}
                                    onChange={(e) => setEmailInput(e.target.value)}
                                    placeholder={`e.g. yourname@${selectedProvider.id}.com`}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>

                            <div className="bg-gray-100 border border-gray-300 rounded-lg p-4 mb-6">
                                <h4 className="text-sm font-semibold text-gray-700 mb-2">Where do I find this?</h4>
                                <p className="text-sm text-gray-600 leading-relaxed">
                                    {getHelpText(selectedProvider.id)}
                                </p>
                            </div>

                            <button
                                onClick={handleSaveLink}
                                disabled={saving}
                                className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold flex items-center justify-center"
                            >
                                {saving ? <Loader className="animate-spin" size={20} /> : 'Save Link'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

const ShareScreen = ({ mockQuote, handleQuoteSent, navigateTo, companyDetails, user }) => {
    const [sendingEmail, setSendingEmail] = useState(false);

    const shareText = `Here is the quote for ${mockQuote.clientName || 'your project'}. Total: $${calculateQuoteTotal(mockQuote.items).toFixed(2)}`;

    const handleShareWhatsApp = () => {
        const url = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
        window.open(url, '_blank');
    };

    const handleShareEmail = async () => {
        if (!mockQuote.clientEmail) {
            alert('Client email is required to send the quote');
            return;
        }

        setSendingEmail(true);
        try {
            const accountingEmails = [];
            try {
                const settingsSnapshot = await getDoc(doc(db, 'users', user.uid, 'settings', 'accounting'));
                if (settingsSnapshot.exists()) {
                    const settings = settingsSnapshot.data();
                    ['xero', 'myob', 'quickbooks'].forEach(provider => {
                        if (settings[provider]?.email) {
                            accountingEmails.push(settings[provider].email);
                        }
                    });
                }
            } catch (settingsError) {
                console.error('Error fetching accounting settings:', settingsError);
            }

            const pdfBase64 = generatePDFBase64(mockQuote, companyDetails);
            const sendQuoteEmail = httpsCallable(functions, 'sendQuoteEmail');

            await sendQuoteEmail({
                recipientEmail: mockQuote.clientEmail,
                recipientName: mockQuote.clientName,
                quoteData: {
                    id: mockQuote.id,
                    date: mockQuote.date,
                    clientName: mockQuote.clientName,
                    clientEmail: mockQuote.clientEmail,
                    jobAddress: mockQuote.jobAddress,
                    scopeSummary: mockQuote.scopeSummary,
                    items: mockQuote.items
                },
                pdfBase64,
                companyDetails,
                bccEmail: accountingEmails.length > 0 ? accountingEmails : undefined
            });

            alert('Quote sent successfully via email!');
        } catch (error) {
            console.error('Error sending email:', error);
            alert(`Failed to send email: ${error.message || 'Unknown error'}`);
        } finally {
            setSendingEmail(false);
        }
    };

    const handleShareSMS = () => {
        window.location.href = `sms:?body=${encodeURIComponent(shareText)}`;
    };

    return (
      <div className="p-4 bg-gray-50 h-full flex flex-col items-center justify-center">
        <div className="w-full max-w-sm text-center">
          <Share2 size={48} className="text-blue-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Ready to Share</h2>
          <p className="text-sm text-gray-500 mb-8">Your quote is ready.</p>
          <div className="space-y-4">
            <ShareOption
                icon={sendingEmail ? <Loader size={24} className="animate-spin"/> : <Mail size={24}/>}
                label={sendingEmail ? "Sending..." : "Email with PDF"}
                color={sendingEmail ? "bg-gray-400" : "bg-red-500"}
                onClick={handleShareEmail}
                disabled={sendingEmail}
            />
            <ShareOption icon={<MessageSquare size={24}/>} label="WhatsApp" color="bg-green-500" onClick={handleShareWhatsApp} />
            <ShareOption icon={<Phone size={24}/>} label="SMS" color="bg-blue-500" onClick={handleShareSMS} />

            <button onClick={handleQuoteSent} className="w-full py-3 text-lg font-semibold text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 mt-6">New Quote</button>
          </div>
        </div>
      </div>
    );
};

const ReferralScreen = ({ user }) => {
    const [copied, setCopied] = useState(false);
    const referralCode = user?.uid ? `TQ-${user.uid.substring(0, 8).toUpperCase()}` : 'TQ-USER-001';

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(referralCode);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    return (
        <div className="p-4 bg-gray-50 h-full overflow-y-auto pb-6">
            <h2 className="text-xl sm:text-2xl font-bold text-blue-600 mb-3 flex items-center"><Gift size={20} className="mr-2"/> Referral Program</h2>
            <p className="text-sm text-gray-600 mb-4">Refer your industry friends and earn discounts!</p>

            <div className="bg-white p-4 sm:p-6 rounded-xl shadow-lg border-2 border-green-100 mb-4 text-center">
                <h3 className="text-2xl sm:text-3xl font-bold text-green-700 mb-1">$20 OFF</h3>
                <p className="text-xs sm:text-sm font-semibold text-gray-700 mb-3">For every successful signup.</p>
                <div className="border-t pt-3">
                    <p className="text-xs text-gray-500 mb-2">Your Unique Referral Code:</p>
                    <div className="bg-gray-100 p-2 sm:p-3 rounded-lg flex justify-between items-center">
                        <span className="font-mono font-bold text-base sm:text-lg text-gray-800 select-all">{referralCode}</span>
                        <button
                            onClick={handleCopy}
                            className={`text-xs sm:text-sm font-semibold ml-2 px-3 py-1 rounded ${copied ? 'bg-green-100 text-green-700' : 'text-blue-500 hover:text-blue-700'}`}
                        >
                            {copied ? 'Copied!' : 'Copy'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const CompanyDetailsScreen = ({ companyDetails, setCompanyDetails, user }) => {
    const [saving, setSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);

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

    const handleSaveDetails = async () => {
        if (!user) return;

        setSaving(true);
        try {
            const companyRef = doc(db, 'users', user.uid, 'settings', 'company');
            await setDoc(companyRef, companyDetails);
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 3000);
        } catch (error) {
            console.error('Error saving company details:', error);
            alert('Failed to save company details');
        } finally {
            setSaving(false);
        }
    };

    return (
    <div className="p-4 bg-gray-50 h-full overflow-y-auto">
      <h2 className="text-xl font-bold text-gray-800 mb-4">Company Details</h2>
      <div className="bg-white p-4 rounded-xl shadow-lg space-y-6">
        <div className="border-b pb-4">
          <h3 className="font-semibold text-blue-700 mb-3 flex items-center"><Building size={18} className="mr-2"/> Business Information</h3>

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
                  </div>
              </div>
              <label className="cursor-pointer bg-white border border-gray-300 hover:bg-gray-50 px-3 py-2 rounded-lg shadow-sm text-sm font-medium text-gray-700 flex items-center">
                  <Upload size={16} className="mr-2" /> Upload
                  <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
              </label>
          </div>

          <div className='space-y-4'>
            <InputField label="Company Name" value={companyDetails.name} onChange={e => setCompanyDetails({...companyDetails, name: e.target.value})} placeholder="Company Name" />
            <InputField label="Business Address" value={companyDetails.address} onChange={e => setCompanyDetails({...companyDetails, address: e.target.value})} placeholder="Street, City, State, ZIP" />
            <InputField label="ABN/Tax ID" value={companyDetails.abn} onChange={e => setCompanyDetails({...companyDetails, abn: e.target.value})} placeholder="ABN/Tax ID" />

            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                <span className="text-sm font-medium text-gray-700">Registered for GST?</span>
                <button
                    onClick={() => setCompanyDetails({...companyDetails, gstRegistered: !companyDetails.gstRegistered})}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${companyDetails.gstRegistered ? 'bg-blue-600' : 'bg-gray-200'}`}
                >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${companyDetails.gstRegistered ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
            </div>
          </div>
        </div>
        <div>
          <h3 className="font-semibold text-blue-700 mb-3 flex items-center"><CreditCard size={18} className="mr-2"/> Bank Details</h3>
          <div className='space-y-4'>
            <InputField label="Bank Name" value={companyDetails.bankName} onChange={e => setCompanyDetails({...companyDetails, bankName: e.target.value})} placeholder="Bank Name" />
            <InputField label="Account Name" value={companyDetails.accountName} onChange={e => setCompanyDetails({...companyDetails, accountName: e.target.value})} placeholder="Account Name" />
            <div className='flex space-x-4'>
                <InputField label="BSB" value={companyDetails.bsb} onChange={e => setCompanyDetails({...companyDetails, bsb: e.target.value})} placeholder="BSB" />
                <InputField label="Account Number" value={companyDetails.accountNumber} onChange={e => setCompanyDetails({...companyDetails, accountNumber: e.target.value})} placeholder="Account Number" />
            </div>
          </div>
        </div>
        <div className="pt-4 border-t flex justify-end">
            {saveSuccess && (
                <span className="text-green-600 text-sm font-semibold mr-4 flex items-center">
                    <Check size={16} className="mr-1"/> Saved!
                </span>
            )}
            <button
                onClick={handleSaveDetails}
                disabled={saving}
                className="py-2 px-4 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 flex items-center shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {saving ? (
                    <>
                        <Loader size={18} className="mr-2 animate-spin"/> Saving...
                    </>
                ) : (
                    <>
                        <Save size={18} className="mr-2"/> Save Details
                    </>
                )}
            </button>
        </div>
      </div>
    </div>
    );
};

const SubscriptionScreen = ({ user }) => {
    const [subscription, setSubscription] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user) {
            const fetchSub = async () => {
                const subRef = doc(db, 'users', user.uid, 'profile', 'details');
                const snap = await getDoc(subRef);
                if (snap.exists()) setSubscription(snap.data());
                setLoading(false);
            };
            fetchSub();
        }
    }, [user]);

    const handleUpgrade = () => {
        alert('Payment gateway integration coming soon.');
    };

    if (loading) return <div className="p-4 flex justify-center"><Loader className="animate-spin text-gray-500"/></div>;

    const planType = subscription?.plan_type || 'trial';

    return (
        <div className="p-4 bg-gray-50 h-full overflow-y-auto">
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Subscription</h2>
            <div className="bg-white p-6 rounded-xl shadow-lg border-2 border-blue-100 mb-6">
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <h3 className="text-lg font-bold text-blue-800">{planType === 'pro' ? 'Pro Plan' : 'Free Trial'}</h3>
                        <span className="text-xs px-2 py-1 rounded-full font-bold bg-green-100 text-green-800">ACTIVE</span>
                    </div>
                    <Star className="text-yellow-400 fill-current" size={24} />
                </div>
                <div className="text-3xl font-bold text-gray-900 mb-1">{planType === 'pro' ? '$29/mo' : 'Free'}</div>
                <button
                    onClick={planType === 'trial' ? handleUpgrade : undefined}
                    className="w-full py-3 bg-blue-600 text-white font-bold rounded-lg mt-4 flex items-center justify-center"
                >
                    {planType === 'trial' ? 'Upgrade to Pro' : 'Manage Subscription'}
                </button>
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
      <header className="flex items-center justify-between p-2 bg-white border-b border-gray-200 shadow-sm sticky top-0 z-40">
          <button onClick={() => setIsMenuOpen(true)} className="p-2 rounded-full text-blue-600 hover:bg-blue-50" aria-label="Open Menu">
            <Menu size={32} />
          </button>
          <div className="flex justify-center">
            <img src={T2Q_LOGO_URL} alt="Talk2Quote App" className="h-16 object-contain" />
          </div>
          <button onClick={() => navigateTo('referral')} className="p-2 rounded-full text-purple-600 hover:bg-purple-50">
            <Gift size={32}/>
          </button>
      </header>
      <main className="flex-grow overflow-y-auto">{children}</main>
      <MenuDrawer isMenuOpen={isMenuOpen} navigateTo={navigateTo} handleLogout={handleLogout} />
      {isMenuOpen && <div className="fixed inset-0 bg-black bg-opacity-50 z-40" onClick={() => setIsMenuOpen(false)}></div>}
    </div>
);

const App = () => {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState('login');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [loadingQuotes, setLoadingQuotes] = useState(false);

  const [transcript, setTranscript] = useState('');
  const recognitionRef = useRef(null);

  const [lastQuoteAccepted, setLastQuoteAccepted] = useState(false);

  const [companyDetails, setCompanyDetails] = useState({
    name: 'Talk2Quote Services Pty Ltd',
    abn: '87 654 321 000',
    terms: '14 Days Net',
    email: 'billing@talk2quote.com',
    phone: '(02) 8000 1234',
    website: 'www.talk2quote.app',
    address: '123 Business Rd, Sydney NSW 2000',
    gstRegistered: true,
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

  useEffect(() => {
    const initAuth = async () => {
      try { await setPersistence(auth, browserLocalPersistence); } catch (e) { console.warn(e); }
    };
    initAuth();

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
        setUser(currentUser);
        setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    setLoadingQuotes(true);

    const q = query(collection(db, 'users', user.uid, 'quotes'), orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
        const quotesData = snapshot.docs.map(doc => ({
            ...doc.data(),
            firestoreId: doc.id
        }));
        setPreviousQuotes(quotesData);
        setLoadingQuotes(false);
    }, (error) => {
        console.error("Data Fetch Error:", error);
        setLoadingQuotes(false);
    });

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const loadCompanyDetails = async () => {
      try {
        const companyRef = doc(db, 'users', user.uid, 'settings', 'company');
        const companySnap = await getDoc(companyRef);
        if (companySnap.exists()) {
          setCompanyDetails(prev => ({ ...prev, ...companySnap.data() }));
        }
      } catch (error) {
        console.error('Error loading company details:', error);
      }
    };

    loadCompanyDetails();
  }, [user]);

  const isClientInfoSet = mockQuote.clientEmail && mockQuote.clientEmail.trim() !== '';

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
    }
  }, []);

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

  const generateQuoteFromAI = async (finalText) => {
    setIsProcessing(true);

    if (!finalText || finalText.trim().length < 5) {
        alert("I didn't hear enough detail. Please try recording again.");
        setIsProcessing(false);
        return;
    }

    const isLocalEnvironment = window.location.hostname.includes('localhost') ||
                                window.location.hostname.includes('webcontainer');

    try {
        let parsedResult;

        if (isLocalEnvironment) {
            await new Promise(resolve => setTimeout(resolve, 2000));

            parsedResult = {
                scopeSummary: 'Paint interior walls of 3-bedroom house. Includes preparation, patching minor holes, and two coats of premium wash and wear paint in "Antique White".',
                items: [
                    { id: 1, description: 'Interior Wall Painting (per sqm)', qty: 150, price: 12.50 },
                    { id: 2, description: 'Prep & Patch Materials', qty: 1, price: 150.00 },
                    { id: 3, description: 'Premium Paint (10L Tins)', qty: 4, price: 185.00 }
                ]
            };
        } else {
            const generateQuoteFunc = httpsCallable(functions, 'generateQuote');
            const result = await generateQuoteFunc({
                transcript: finalText,
                type: 'quote'
            });
            parsedResult = result.data;
        }

        const safeItems = parsedResult.items || [];

        let newDocId = null;
        if (user) {
            const draftData = {
                clientName: mockQuote.clientName,
                clientEmail: mockQuote.clientEmail,
                jobAddress: '123 Oak St, Sydney NSW (Detected via GPS)',
                scopeSummary: parsedResult.scopeSummary,
                items: safeItems,
                paymentTerms: '7 Days EOM',
                status: 'Draft',
                createdAt: new Date().toISOString(),
                displayDate: new Date().toLocaleDateString(),
                total: calculateQuoteTotal(safeItems)
            };
            const docRef = await addDoc(collection(db, 'users', user.uid, 'quotes'), draftData);
            newDocId = docRef.id;
        }

        setMockQuote(prev => ({
            ...prev,
            jobAddress: '123 Oak St, Sydney NSW (Detected via GPS)',
            status: 'Review Pending',
            scopeSummary: parsedResult.scopeSummary,
            items: safeItems,
            firestoreId: newDocId
        }));

        setIsProcessing(false);
        setTranscript('');
        navigateTo('review');

    } catch (error) {
        console.error("AI Error:", error);
        alert("Error connecting to AI: " + error.message);
        setIsProcessing(false);
    }
  };

  const handleRecordToggle = (e) => {
    if (e) e.preventDefault();
    if (!isRecording && !isClientInfoSet) return;

    if (!isRecording) {
      setTranscript('');
      setIsRecording(true);
      try { recognitionRef.current?.start(); } catch (err) { setIsRecording(false); }
    } else {
      setIsRecording(false);
      try { recognitionRef.current?.stop(); } catch (err) { console.error(err); }
      setTimeout(() => { generateQuoteFromAI(transcript); }, 500);
    }
  };

  const handleQuoteSent = async () => {
    if (!user) { alert("You must be logged in to save."); return; }
    const total = calculateQuoteTotal(mockQuote.items);

    try {
        if (mockQuote.firestoreId) {
            const quoteRef = doc(db, 'users', user.uid, 'quotes', mockQuote.firestoreId);
            await updateDoc(quoteRef, {
                status: 'Sent',
                total: total,
                clientName: mockQuote.clientName,
                clientEmail: mockQuote.clientEmail,
                jobAddress: mockQuote.jobAddress,
                scopeSummary: mockQuote.scopeSummary,
                items: mockQuote.items
            });
        } else {
            const newQuoteData = {
                ...mockQuote,
                total: total,
                status: 'Sent',
                createdAt: new Date().toISOString(),
                displayDate: new Date().toLocaleDateString()
            };
            await addDoc(collection(db, 'users', user.uid, 'quotes'), newQuoteData);
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
        alert("Failed to save quote.");
    }
  }

  const handleItemChange = (id, field, value) => {
    const newItems = mockQuote.items.map(item => {
      if (item.id === id) return { ...item, [field]: value };
      return item;
    });
    setMockQuote({ ...mockQuote, items: newItems });
  };

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
            mockQuote={mockQuote}
            handleQuoteSent={handleQuoteSent}
            navigateTo={navigateTo}
            companyDetails={companyDetails}
            user={user}
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
            user={user}
        />;
        break;
      case 'subscription':
        content = <SubscriptionScreen user={user} />;
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
        content = <ReferralScreen user={user} />;
        break;
      case 'accounting':
        content = <AccountingScreen user={user} />;
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

  if (user && currentPage === 'login') {
      setTimeout(() => setCurrentPage('main'), 0);
  }

  if (!user || currentPage === 'login') {
      return content;
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
