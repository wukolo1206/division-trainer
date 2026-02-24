import React, { useState, useEffect } from 'react';
import { RefreshCw, Check, ArrowRight, Play, Home, Trophy, Lightbulb, X, AlertCircle, RotateCcw, Info, PanelLeft, PanelTop, ZoomIn, ZoomOut, ArrowDown, Keyboard } from 'lucide-react';

const MobileDivisionTrainer = () => {
    // --- 全局應用程式狀態 ---
    const [appState, setAppState] = useState('settings'); // 'settings' | 'playing' | 'summary'
    const [layoutMode, setLayoutMode] = useState('top'); // 'top' | 'left'
    const [zoomLevel, setZoomLevel] = useState(1.0);
    const [keyboardMode, setKeyboardMode] = useState(false); // 新增：鍵盤模式狀態

    // --- 課本活動定義 ---
    const TEXTBOOK_ACTIVITIES = [
        { id: '1-1',  label: '整十數 ÷ 一位數',              example: '60÷3=20、80÷4=20',  level: '活動一' },
        { id: '1-2a', label: '二位數 ÷ 一位數（各位均整除）', example: '48÷4=12、36÷3=12',  level: '活動一' },
        { id: '1-2b', label: '二位數 ÷ 一位數（十位有餘再借）',example: '72÷3=24、91÷7=13', level: '活動一' },
        { id: '1-3',  label: '二位數 ÷ 一位數（有餘數）',     example: '98÷6=16…2',         level: '活動一' },
        { id: '2-1',  label: '整百數 ÷ 一位數',               example: '800÷4=200',         level: '活動二' },
        { id: '2-2',  label: '三位數 ÷ 一位數（商三位）',     example: '396÷3=132',         level: '活動二' },
        { id: '2-3',  label: '商中間有 0',                    example: '624÷3=208',         level: '活動二' },
        { id: '2-4',  label: '商為二位數',                    example: '465÷5=93',          level: '活動二' },
        { id: '2-5',  label: '三位數 ÷ 一位數（有餘數）',     example: '809÷8=101…1',       level: '活動二' },
    ];

    // --- 設定選項（從 localStorage 讀取） ---
    const [config, setConfig] = useState(() => {
        try {
            const saved = localStorage.getItem('divisionTrainerConfig');
            if (saved) {
                const data = JSON.parse(saved);
                return {
                    mode: data.mode || 'textbook',
                    textbookActivity: data.textbookActivity || '1-1',
                    dividendDigits: data.dividendDigits || [3],
                    forceInteger: data.forceInteger ?? false,
                    totalQuestions: data.totalQuestions || 5,
                    customDivisorMin: data.customDivisorMin || '2',
                    customDivisorMax: data.customDivisorMax || '9',
                };
            }
        } catch (e) {}
        return {
            mode: 'textbook',
            textbookActivity: '1-1',
            dividendDigits: [3],
            forceInteger: false,
            totalQuestions: 5,
            customDivisorMin: '2',
            customDivisorMax: '9',
        };
    });

    // --- 設定變更時存入 localStorage ---
    useEffect(() => {
        localStorage.setItem('divisionTrainerConfig', JSON.stringify(config));
    }, [config]);


    // --- 錯誤/警告視窗狀態 ---
    const [errorModal, setErrorModal] = useState({ show: false, message: '' });

    // --- 遊戲進度與邏輯狀態 ---
    const [progress, setProgress] = useState({ current: 0, total: 5, score: 0 });
    const [wrongQuestions, setWrongQuestions] = useState([]);
    const [retryQueue, setRetryQueue] = useState([]);
    const [isRetryMode, setIsRetryMode] = useState(false);

    const [dividend, setDividend] = useState(854);
    const [divisor, setDivisor] = useState(4);
    const [userInputs, setUserInputs] = useState({});
    const [currentStep, setCurrentStep] = useState(0);
    const [inputSteps, setInputSteps] = useState([]);
    const [isComplete, setIsComplete] = useState(false);
    const [feedback, setFeedback] = useState(null);
    const [hasError, setHasError] = useState(false);
    const [showHint, setShowHint] = useState(false);

    // ==========================================
    // 課本進度模式：依活動產生題目
    // ==========================================
    const generateTextbookProblem = (activity) => {
        const rnd = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
        let dividend, divisor;

        for (let attempts = 0; attempts < 500; attempts++) {
            switch (activity) {
                case '1-1': { // 整十數÷一位數（60÷3=20，商須為二位數）
                    divisor = rnd(2, 9);
                    const opts = [];
                    for (let d = 20; d <= 90; d += 10)
                        if (d % divisor === 0 && Math.floor(d / divisor) >= 10) opts.push(d);
                    if (opts.length > 0) return { dividend: opts[rnd(0, opts.length - 1)], divisor };
                    break;
                }
                case '1-2a': { // 二位數÷一位數（各位均整除，48÷4=12）
                    // 除數5-9時各位可被整除的二位數只有55,66,77,88,99（題目過於單調），故限制在2-4
                    divisor = rnd(2, 4);
                    const candidates = [];
                    for (let d = 10; d <= 99; d++) {
                        const tens = Math.floor(d / 10), ones = d % 10;
                        if (d % divisor === 0 && Math.floor(d / divisor) >= 10 &&
                            tens % divisor === 0 && ones % divisor === 0 && ones !== 0)
                            candidates.push(d);
                    }
                    if (candidates.length > 0) return { dividend: candidates[rnd(0, candidates.length - 1)], divisor };
                    break;
                }
                case '1-2b': { // 二位數÷一位數（十位有餘再借，72÷3=24）
                    // 除數=9時，唯一的二位數倍數90和99的十位都是9（可被9整除），無合法候選，故排除
                    divisor = rnd(2, 8);
                    const candidates = [];
                    for (let d = 10; d <= 99; d++) {
                        if (d % divisor === 0 && Math.floor(d / divisor) >= 10 &&
                            Math.floor(d / 10) % divisor !== 0)
                            candidates.push(d);
                    }
                    if (candidates.length > 0) return { dividend: candidates[rnd(0, candidates.length - 1)], divisor };
                    break;
                }
                case '1-3': { // 二位數÷一位數（有餘數，商≥10）
                    divisor = rnd(2, 9);
                    const minD = 10 * divisor;
                    if (minD > 99) break;
                    dividend = rnd(minD, 99);
                    if (dividend % divisor !== 0 && Math.floor(dividend / divisor) >= 10) return { dividend, divisor };
                    break;
                }
                case '2-1': { // 整百數÷一位數（800÷4=200）
                    divisor = rnd(2, 9);
                    const opts = [];
                    for (let h = 1; h <= 9; h++)
                        if ((h * 100) % divisor === 0) opts.push(h * 100);
                    if (opts.length > 0) return { dividend: opts[rnd(0, opts.length - 1)], divisor };
                    break;
                }
                case '2-2': { // 三位數÷一位數（商三位，各位非0，整除）
                    divisor = rnd(2, 9);
                    const q = rnd(1, 9) * 100 + rnd(1, 9) * 10 + rnd(1, 9);
                    dividend = q * divisor;
                    if (dividend >= 100 && dividend <= 999) return { dividend, divisor };
                    break;
                }
                case '2-3': { // 商中間有0（624÷3=208，809÷8=101…1）
                    divisor = rnd(2, 9);
                    const q = rnd(1, 9) * 100 + rnd(1, 9); // 格式 X0Y
                    const remainder = rnd(0, divisor - 1);
                    dividend = q * divisor + remainder;
                    if (dividend >= 100 && dividend <= 999) return { dividend, divisor };
                    break;
                }
                case '2-4': { // 百位不夠分，商二位（465÷5=93）
                    divisor = rnd(2, 9);
                    const maxH = divisor - 1;
                    if (maxH < 1) break;
                    dividend = rnd(1, maxH) * 100 + rnd(0, 99);
                    if (dividend >= 100 && dividend <= 999 && Math.floor(dividend / divisor) >= 10) return { dividend, divisor };
                    break;
                }
                case '2-5': { // 三位數÷一位數（有餘數）
                    divisor = rnd(2, 9);
                    dividend = rnd(100, 999);
                    if (dividend % divisor !== 0) return { dividend, divisor };
                    break;
                }
                default: break;
            }
        }
        // 保底：依活動給出合適的預設題目，避免活動一出現三位數
        const fallbacks = {
            '1-1': { dividend: 60, divisor: 3 },
            '1-2a': { dividend: 48, divisor: 4 },
            '1-2b': { dividend: 72, divisor: 3 },
            '1-3':  { dividend: 61, divisor: 3 },
            '2-1':  { dividend: 800, divisor: 4 },
            '2-2':  { dividend: 396, divisor: 3 },
            '2-3':  { dividend: 624, divisor: 3 },
            '2-4':  { dividend: 465, divisor: 5 },
            '2-5':  { dividend: 809, divisor: 8 },
        };
        return fallbacks[activity] || { dividend: 396, divisor: 3 };
    };

    // ==========================================
    // 核心邏輯：產生題目
    // ==========================================
    const generateProblem = (customQueue = null) => {
        setUserInputs({});
        setCurrentStep(0);
        setIsComplete(false);
        setFeedback(null);
        setShowHint(false);
        setHasError(false);

        const activeQueue = customQueue || retryQueue;
        if (activeQueue.length > 0) {
            const nextProblem = activeQueue[0];
            setDividend(nextProblem.dividend);
            setDivisor(nextProblem.divisor);
            setRetryQueue(prev => prev.length > 0 ? prev.slice(1) : []);
            return;
        }

        // --- 課本進度模式 ---
        if (config.mode === 'textbook') {
            const { dividend: nd, divisor: ns } = generateTextbookProblem(config.textbookActivity);
            setDivisor(ns);
            setDividend(nd);
            return;
        }

        // --- 自由練習模式 ---
        let newDivisor;
        let minDiv = parseInt(config.customDivisorMin);
        let maxDiv = parseInt(config.customDivisorMax);

        if (isNaN(minDiv) || minDiv < 1) minDiv = 2;
        if (isNaN(maxDiv) || maxDiv < 1) maxDiv = 9;
        if (minDiv > maxDiv) { const temp = minDiv; minDiv = maxDiv; maxDiv = temp; }

        newDivisor = Math.floor(Math.random() * (maxDiv - minDiv + 1)) + minDiv;

        const validDigits = config.dividendDigits.filter(d => (Math.pow(10, d) - 1) >= newDivisor);
        const finalDigitsOpts = validDigits.length > 0 ? validDigits : config.dividendDigits;
        const digitCount = finalDigitsOpts[Math.floor(Math.random() * finalDigitsOpts.length)];

        const min = Math.pow(10, digitCount - 1);
        const max = Math.pow(10, digitCount) - 1;

        let newDividend;
        let isValid = false;
        let attempts = 0;

        while (!isValid && attempts < 200) {
            attempts++;
            newDividend = Math.floor(Math.random() * (max - min + 1)) + min;

            if (newDividend < newDivisor) continue;

            if (config.forceInteger) {
                if (newDividend % newDivisor !== 0) {
                    newDividend = newDividend - (newDividend % newDivisor);
                    if (newDividend < min) newDividend += newDivisor;
                    if (newDividend > max) continue;
                    if (newDividend < newDivisor) continue;
                }
            }
            isValid = true;
        }

        if (!isValid) {
            newDividend = newDivisor * (Math.floor(Math.random() * 5) + 1);
            while (newDividend < min) newDividend += newDivisor;
        }

        setDivisor(newDivisor);
        setDividend(newDividend);
    };

    useEffect(() => {
        if (appState === 'playing') {
            const steps = calculateDivisionSteps(dividend, divisor);
            setInputSteps(steps);
        }
    }, [dividend, divisor, appState]);

    useEffect(() => {
        if (!inputSteps.length || isComplete) return;
        const step = inputSteps[currentStep];
        if (step && step.isGhost) {
            const timer = setTimeout(() => {
                setUserInputs(prev => ({ ...prev, [`${step.row}-${step.col}`]: 'G' }));
                if (currentStep < inputSteps.length - 1) setCurrentStep(prev => prev + 1);
                else setIsComplete(true);
            }, 50);
            return () => clearTimeout(timer);
        }
    }, [currentStep, inputSteps, isComplete]);

    // ==========================================
    // 新增：鍵盤事件監聽
    // ==========================================
    useEffect(() => {
        // 如果未開啟鍵盤模式或不在遊戲中，不監聽
        if (!keyboardMode || appState !== 'playing') return;

        const handleKeyDown = (e) => {
            // 處理數字鍵 (0-9)
            if (e.key >= '0' && e.key <= '9') {
                handleKeypadPress(parseInt(e.key));
            }
            // 處理 Enter 鍵 (僅當題目完成時觸發下一題)
            else if (e.key === 'Enter') {
                if (isComplete) {
                    nextQuestion();
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [keyboardMode, appState, isComplete, currentStep, inputSteps, feedback]); // 依賴項需包含所有 handleKeypadPress 用到的變數


    const handleZoom = (delta) => {
        setZoomLevel(prev => Math.min(Math.max(prev + delta, 0.5), 2.0));
    };

    const startGame = () => {
        if (config.mode === 'free') {
            if (config.dividendDigits.length === 0) {
                setErrorModal({ show: true, message: "請至少選擇一種被除數位數！" });
                return;
            }
            const minDiv = parseInt(config.customDivisorMin);
            const maxDiv = parseInt(config.customDivisorMax);
            const isCustomValid = !isNaN(minDiv) && !isNaN(maxDiv) && minDiv > 0 && maxDiv > 0;

            if (!isCustomValid) {
                setErrorModal({ show: true, message: "請輸入完整的除數範圍（最小與最大值皆須填寫且大於0）！" });
                return;
            }
            if (minDiv > maxDiv) {
                setErrorModal({ show: true, message: `除數範圍錯誤：最小值 (${minDiv}) 不能大於 最大值 (${maxDiv})！` });
                return;
            }
            if (maxDiv > 999) {
                setErrorModal({ show: true, message: "除數請勿超過 999！" });
                return;
            }
            const invalidDigits = [];
            config.dividendDigits.forEach(digit => {
                const maxValOfDigit = Math.pow(10, digit) - 1;
                if (maxValOfDigit < minDiv) invalidDigits.push(`${digit}位`);
            });
            if (invalidDigits.length > 0) {
                invalidDigits.sort();
                const msg = `由於除數最小為 ${minDiv}，被除數不能是 ${invalidDigits.join('、')} (數值過小)，請重新選擇被除數位數。`;
                setErrorModal({ show: true, message: msg });
                return;
            }
        }

        setProgress({ current: 1, total: config.totalQuestions, score: 0 });
        setWrongQuestions([]);
        setRetryQueue([]);
        setIsRetryMode(false);
        setAppState('playing');
        generateProblem([]);
    };

    const startRetry = () => {
        const queue = [...wrongQuestions];
        setRetryQueue(queue.slice(1));
        setWrongQuestions([]);
        setProgress({ current: 1, total: queue.length, score: 0 });
        setIsRetryMode(true);
        setAppState('playing');
        if (queue.length > 0) {
            const first = queue[0];
            setDividend(first.dividend);
            setDivisor(first.divisor);
            setRetryQueue(queue.slice(1));
            setUserInputs({});
            setCurrentStep(0);
            setIsComplete(false);
            setFeedback(null);
            setShowHint(false);
            setHasError(false);
        }
    };

    const nextQuestion = () => {
        if (hasError) setWrongQuestions(prev => [...prev, { dividend, divisor }]);
        if (progress.current < progress.total) {
            setProgress(prev => ({ ...prev, current: prev.current + 1 }));
            generateProblem();
        } else {
            setAppState('summary');
        }
    };

    const goHome = () => {
        setAppState('settings');
    };

    const calculateDivisionSteps = (dividend, divisor) => {
        const steps = [];
        const dividendStr = dividend.toString();
        const digits = dividendStr.split('').map(Number);
        let currentVal = 0;
        let currentRow = 2;
        let isStarted = false;

        for (let i = 0; i < digits.length; i++) {
            const digit = digits[i];
            currentVal = currentVal * 10 + digit;

            if (!isStarted) {
                if (currentVal < divisor && i < digits.length - 1) continue;
                isStarted = true;
            }

            const quotientDigit = Math.floor(currentVal / divisor);
            const product = quotientDigit * divisor;
            const remainder = currentVal - product;

            steps.push({
                type: 'quotient', row: 0, col: i + 2, value: quotientDigit,
                hint: `${currentVal} ÷ ${divisor} = ${quotientDigit} ...`, numberToDivide: currentVal,
            });

            if (quotientDigit !== 0) {
                const productStr = product.toString();
                for (let j = productStr.length - 1; j >= 0; j--) {
                    const char = productStr[j];
                    const colPos = (i + 2) - (productStr.length - 1 - j);
                    steps.push({
                        type: 'product', row: currentRow, col: colPos, value: parseInt(char),
                        hint: `${quotientDigit} × ${divisor} (由右至左)`
                    });
                }
                currentRow++;
                const shouldShowRemainder = !(remainder === 0 && i < digits.length - 1);
                if (shouldShowRemainder) {
                    const remainderStr = remainder.toString();
                    for (let j = remainderStr.length - 1; j >= 0; j--) {
                        const char = remainderStr[j];
                        const colPos = (i + 2) - (remainderStr.length - 1 - j);
                        steps.push({
                            type: 'subtraction', row: currentRow, col: colPos, value: parseInt(char),
                            hint: `${currentVal} - ${product} (由右至左)`
                        });
                    }
                }
            }

            if (i < digits.length - 1) {
                const nextDigit = digits[i + 1];
                let bringDownRow = (quotientDigit === 0) ? currentRow - 1 : currentRow;
                steps.push({
                    type: 'bringDown', row: bringDownRow, col: i + 3, value: nextDigit, isGhost: false,
                    hint: `放下 ${nextDigit}`
                });
                if (quotientDigit !== 0) currentRow++;
            }
            currentVal = remainder;
        }
        return steps;
    };

    const handleKeypadPress = (num) => {
        if (isComplete || feedback !== null) return;
        const currentStepData = inputSteps[currentStep];
        if (!currentStepData || currentStepData.isGhost) return;

        if (num === currentStepData.value) {
            setFeedback('correct');
            setUserInputs(prev => ({ ...prev, [`${currentStepData.row}-${currentStepData.col}`]: num }));
            setTimeout(() => {
                setFeedback(null);
                if (currentStep < inputSteps.length - 1) setCurrentStep(prev => prev + 1);
                else setIsComplete(true);
            }, 200);
        } else {
            setFeedback('error');
            setHasError(true);
            setTimeout(() => setFeedback(null), 400);
        }
    };

    const toggleDividendDigit = (value) => {
        setConfig(prev => {
            const list = prev.dividendDigits;
            if (list.includes(value)) {
                return { ...prev, dividendDigits: list.filter(v => v !== value) };
            } else {
                return { ...prev, dividendDigits: [...list, value].sort((a, b) => a - b) };
            }
        });
    };

    // ==========================================
    // Render Sections
    // ==========================================
    const renderErrorModal = () => {
        if (!errorModal.show) return null;
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-200">
                <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-6 relative animate-in zoom-in-95 duration-200">
                    <div className="flex flex-col items-center text-center">
                        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center text-red-500 mb-4">
                            <Info size={28} />
                        </div>
                        <h3 className="text-xl font-bold text-gray-800 mb-2">設定提示</h3>
                        <p className="text-gray-600 mb-6 leading-relaxed">{errorModal.message}</p>
                        <button onClick={() => setErrorModal({ show: false, message: '' })} className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors">我知道了</button>
                    </div>
                </div>
            </div>
        );
    };

    const renderSettings = () => {
        const levels = ['活動一', '活動二'];
        return (
            <div className="flex flex-col h-full bg-slate-50 overflow-auto p-4 sm:p-8 max-w-lg mx-auto w-full relative">
                {renderErrorModal()}

                <div className="mb-6 text-center">
                    <h1 className="text-3xl font-bold text-blue-700 mb-1">長除法訓練器</h1>
                    <div className="text-sm text-gray-400"> by 苗栗公館國小資源班</div>
                </div>

                {/* 模式切換 */}
                <div className="flex bg-gray-100 rounded-xl p-1 mb-4">
                    <button
                        onClick={() => setConfig(prev => ({ ...prev, mode: 'textbook' }))}
                        className={`flex-1 py-2 rounded-lg font-bold text-sm transition-all ${config.mode === 'textbook' ? 'bg-white text-blue-700 shadow' : 'text-gray-400'}`}
                    >
                        課本進度
                    </button>
                    <button
                        onClick={() => setConfig(prev => ({ ...prev, mode: 'free' }))}
                        className={`flex-1 py-2 rounded-lg font-bold text-sm transition-all ${config.mode === 'free' ? 'bg-white text-blue-700 shadow' : 'text-gray-400'}`}
                    >
                        自由練習
                    </button>
                </div>

                {/* 課本進度模式 */}
                {config.mode === 'textbook' && (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-4 p-5">
                        <h2 className="font-bold text-gray-700 mb-3 flex items-center gap-2">
                            <span className="w-1 h-6 bg-blue-500 rounded-full"></span>
                            選擇練習題型
                        </h2>
                        <select
                            value={config.textbookActivity}
                            onChange={(e) => setConfig(prev => ({ ...prev, textbookActivity: e.target.value }))}
                            className="w-full p-3 rounded-lg border-2 border-blue-300 bg-blue-50 text-blue-700 font-bold text-sm outline-none cursor-pointer"
                        >
                            {levels.map(level => (
                                <optgroup key={level} label={`${level}：${level === '活動一' ? '二位數除以一位數' : '三位數除以一位數'}`}>
                                    {TEXTBOOK_ACTIVITIES.filter(a => a.level === level).map(a => (
                                        <option key={a.id} value={a.id}>{a.label}</option>
                                    ))}
                                </optgroup>
                            ))}
                        </select>
                        {(() => {
                            const selected = TEXTBOOK_ACTIVITIES.find(a => a.id === config.textbookActivity);
                            return selected ? (
                                <p className="text-xs text-gray-400 mt-2">例：{selected.example}</p>
                            ) : null;
                        })()}
                    </div>
                )}

                {/* 自由練習模式 */}
                {config.mode === 'free' && (
                    <>
                        <div className="bg-white rounded-xl shadow-sm p-5 mb-4 border border-gray-100">
                            <h2 className="font-bold text-gray-700 mb-3 flex items-center gap-2">
                                <span className="w-1 h-6 bg-blue-500 rounded-full"></span> 被除數位數
                            </h2>
                            <div className="flex gap-2">
                                {[1, 2, 3, 4].map(digit => (
                                    <button
                                        key={digit}
                                        onClick={() => toggleDividendDigit(digit)}
                                        className={`flex-1 py-3 rounded-lg border-2 font-bold transition-all ${config.dividendDigits.includes(digit) ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-400 hover:border-gray-300'}`}
                                    >
                                        {digit}位
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="bg-white rounded-xl shadow-sm p-5 mb-4 border border-gray-100">
                            <h2 className="font-bold text-gray-700 mb-3 flex items-center gap-2">
                                <span className="w-1 h-6 bg-green-500 rounded-full"></span> 除數範圍
                            </h2>
                            <div className="flex items-center gap-2">
                                <div className="relative flex-1">
                                    <input type="number" min="1" max="999" placeholder="最小" value={config.customDivisorMin}
                                        onChange={(e) => { const v = e.target.value; if (v === '' || v.length <= 3) setConfig(prev => ({ ...prev, customDivisorMin: v })); }}
                                        className="w-full p-3 rounded-lg border-2 border-green-500 bg-green-50 text-green-700 text-center text-lg font-bold outline-none" />
                                    <span className="absolute top-1 left-2 text-[10px] text-green-600 font-bold">Min</span>
                                </div>
                                <span className="text-gray-400 font-bold">~</span>
                                <div className="relative flex-1">
                                    <input type="number" min="1" max="999" placeholder="最大" value={config.customDivisorMax}
                                        onChange={(e) => { const v = e.target.value; if (v === '' || v.length <= 3) setConfig(prev => ({ ...prev, customDivisorMax: v })); }}
                                        className="w-full p-3 rounded-lg border-2 border-green-500 bg-green-50 text-green-700 text-center text-lg font-bold outline-none" />
                                    <span className="absolute top-1 left-2 text-[10px] text-green-600 font-bold">Max</span>
                                </div>
                            </div>
                            <p className="text-xs text-gray-400 mt-3 text-center">
                                輸入除數範圍 (1-999)，若要固定除數請將最大最小設為相同。
                            </p>
                        </div>

                        <div className="bg-white rounded-xl shadow-sm p-5 mb-4 border border-gray-100">
                            <h2 className="font-bold text-gray-700 mb-3 flex items-center gap-2">
                                <span className="w-1 h-6 bg-purple-500 rounded-full"></span> 餘數設定
                            </h2>
                            <div className="flex gap-2">
                                <button onClick={() => setConfig(prev => ({ ...prev, forceInteger: false }))}
                                    className={`flex-1 py-3 rounded-lg border-2 font-bold transition-all ${!config.forceInteger ? 'border-purple-500 bg-purple-50 text-purple-700' : 'border-gray-200 text-gray-400'}`}>
                                    隨機 (可能有餘數)
                                </button>
                                <button onClick={() => setConfig(prev => ({ ...prev, forceInteger: true }))}
                                    className={`flex-1 py-3 rounded-lg border-2 font-bold transition-all ${config.forceInteger ? 'border-purple-500 bg-purple-50 text-purple-700' : 'border-gray-200 text-gray-400'}`}>
                                    必定整除
                                </button>
                            </div>
                        </div>
                    </>
                )}

                {/* 測驗題數（兩個模式都顯示） */}
                <div className="bg-white rounded-xl shadow-sm p-5 mb-6 border border-gray-100">
                    <h2 className="font-bold text-gray-700 mb-3 flex items-center gap-2">
                        <span className="w-1 h-6 bg-orange-500 rounded-full"></span> 測驗題數
                    </h2>
                    <div className="flex gap-2">
                        {[5, 10, 15, 20].map(count => (
                            <button key={count} onClick={() => setConfig(prev => ({ ...prev, totalQuestions: count }))}
                                className={`flex-1 py-2 rounded-lg border-2 font-bold transition-all ${config.totalQuestions === count ? 'border-orange-500 bg-orange-50 text-orange-700' : 'border-gray-200 text-gray-400'}`}>
                                {count}題
                            </button>
                        ))}
                    </div>
                </div>

                <button onClick={startGame}
                    className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white text-xl font-bold rounded-xl shadow-lg transform active:scale-95 transition-all flex items-center justify-center gap-2">
                    <Play fill="currentColor" /> 開始測驗
                </button>
            </div>
        );
    };

    const renderSummary = () => {
        const hasWrong = wrongQuestions.length > 0;
        return (
            <div className="flex flex-col h-full items-center justify-center bg-slate-50 p-6 animate-in fade-in zoom-in overflow-auto">
                <div className="bg-white p-6 rounded-2xl shadow-xl text-center max-w-sm w-full my-auto">
                    <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 ${hasWrong ? 'bg-orange-100 text-orange-500' : 'bg-yellow-100 text-yellow-500'}`}>
                        {hasWrong ? <RotateCcw size={40} /> : <Trophy size={48} />}
                    </div>
                    <h2 className="text-3xl font-bold text-gray-800 mb-2">{hasWrong ? '再接再厲！' : '完美過關！'}</h2>
                    <p className="text-gray-500 mb-6">{hasWrong ? `還有 ${wrongQuestions.length} 題需要加強` : '恭喜你答對了所有題目'}</p>
                    {hasWrong && (
                        <div className="mb-6 bg-orange-50 p-4 rounded-xl border border-orange-100">
                            <div className="flex items-center gap-2 text-orange-700 font-bold mb-3 justify-center">
                                <AlertCircle size={18} /> 錯題列表
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-sm max-h-40 overflow-y-auto">
                                {wrongQuestions.map((q, idx) => (
                                    <div key={idx} className="bg-white py-2 px-3 rounded shadow-sm text-gray-600 font-mono">
                                        {q.dividend} ÷ {q.divisor}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    <div className="flex flex-col gap-3">
                        {hasWrong && (
                            <button onClick={startRetry} className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 animate-pulse">
                                <RefreshCw size={20} /> 重新精熟錯題
                            </button>
                        )}
                        <button onClick={goHome} className={`w-full py-3 font-bold rounded-xl flex items-center justify-center gap-2 border-2 ${hasWrong ? 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50' : 'bg-blue-500 hover:bg-blue-600 text-white border-transparent shadow-lg'}`}>
                            <Home size={20} /> {hasWrong ? '放棄並回首頁' : '回到首頁'}
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    const renderGame = () => {
        const renderMultiplicationTable = () => {
            const step = inputSteps[currentStep];
            const targetNumber = step && step.type === 'quotient' ? step.numberToDivide : null;
            const getButtonStyle = (num) => {
                const product = divisor * num;
                let baseStyle = "flex-1 rounded-lg border shadow-sm active:bg-opacity-80 flex flex-col items-center justify-center transition-colors duration-300";
                if (targetNumber !== null) {
                    if (product <= targetNumber) return `${baseStyle} bg-red-100 border-red-300 text-red-600`;
                    else return `${baseStyle} bg-gray-100 border-gray-200 text-gray-300`;
                }
                return `${baseStyle} bg-orange-50 border-orange-200 text-orange-400`;
            };
            const isLargeNumber = (divisor * 9) > 999;
            const fontClass = isLargeNumber ? "text-[10px]" : "text-xs";
            const productFontClass = isLargeNumber ? "text-sm" : "text-lg";

            return (
                <div className="flex flex-col gap-2 h-full">
                    <div className="flex gap-2 h-1/2">
                        {[1, 2, 3, 4, 5].map(num => (
                            <button key={num} onClick={() => handleKeypadPress(num)} className={getButtonStyle(num)}>
                                <span className={`${fontClass} font-bold`}>{divisor}x{num}</span>
                                <span className={`${productFontClass} font-bold`}>={divisor * num}</span>
                            </button>
                        ))}
                    </div>
                    <div className="flex gap-2 h-1/2">
                        {[6, 7, 8, 9, 0].map(num => {
                            const displayNum = num === 0 ? 10 : num;
                            const product = divisor * displayNum;
                            return (
                                <button key={num} onClick={() => handleKeypadPress(displayNum % 10)} className={getButtonStyle(displayNum)}>
                                    <span className={`${fontClass} font-bold`}>{divisor}x{displayNum}</span>
                                    <span className={`${productFontClass} font-bold`}>={product}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            );
        };

        const renderKeypad = () => (
            <div className="flex flex-col gap-2 h-full">
                <div className="flex gap-2 h-1/2">
                    {[1, 2, 3, 4, 5].map(num => (
                        <button key={num} onClick={() => handleKeypadPress(num)} className="flex-1 rounded-lg bg-white border border-gray-200 shadow-sm active:bg-gray-100 text-xl font-bold text-blue-600 flex items-center justify-center">{num}</button>
                    ))}
                </div>
                <div className="flex gap-2 h-1/2">
                    {[6, 7, 8, 9, 0].map(num => (
                        <button key={num} onClick={() => handleKeypadPress(num)} className="flex-1 rounded-lg bg-white border border-gray-200 shadow-sm active:bg-gray-100 text-xl font-bold text-blue-600 flex items-center justify-center">{num}</button>
                    ))}
                </div>
            </div>
        );

        const renderCell = (r, c) => {
            const dividendStr = dividend.toString();
            if (r === 0 && c === 0) {
                return (
                    <button onClick={() => setShowHint(!showHint)} className={`w-8 h-8 rounded-full flex items-center justify-center transition-all shadow-sm ${showHint ? 'bg-orange-400 text-white' : 'bg-yellow-100 text-yellow-600 hover:bg-yellow-200'}`}>
                        {showHint ? <X size={16} /> : <Lightbulb size={16} />}
                    </button>
                );
            }
            if (r === 1 && c === 0) {
                const fontSize = divisor > 99 ? 'text-lg' : 'text-2xl';
                return <span className={`font-bold text-gray-800 ${fontSize}`}>{divisor}</span>;
            }
            if (r === 1 && c === 1) return <div className="h-full w-1/2 ml-auto border-r-2 border-gray-900 rounded-br-lg transform scale-y-110 translate-y-1"></div>;
            if (r === 1 && c >= 2 && c < 2 + dividendStr.length) {
                const content = dividendStr[c - 2];
                const step = inputSteps[currentStep];
                let isHighlighted = false;
                if (!isComplete && step && step.type === 'quotient' && step.highlightCells) {
                    isHighlighted = step.highlightCells.some(cell => cell.r === r && cell.c === c);
                }
                const isBringDownSource = !isComplete && step && step.type === 'bringDown' && step.col === c;
                return (
                    <div className={`w-full h-full flex items-center justify-center border-t-2 border-gray-900 relative transition-colors duration-300 ${isHighlighted ? 'bg-orange-200' : ''} ${isBringDownSource ? 'bg-red-100 ring-2 ring-red-400 z-10' : ''} `}>
                        <span className={`text-2xl font-bold tracking-widest ${isHighlighted ? 'text-orange-900' : ''}`}>{content}</span>
                    </div>
                );
            }

            const inputKey = `${r}-${c}`;
            const alreadyAnswered = userInputs[inputKey] !== undefined;
            const step = inputSteps[currentStep];
            const isCurrentTarget = !isComplete && step && step.row === r && step.col === c;
            const isBringDownTarget = isCurrentTarget && step.type === 'bringDown';
            let isHighlighted = false;
            if (!isComplete && step && step.type === 'quotient' && step.highlightCells) isHighlighted = step.highlightCells.some(cell => cell.r === r && cell.c === c);

            if (alreadyAnswered) {
                if (userInputs[inputKey] === 'G') return null;
                return (
                    <div className={`w-full h-full flex items-center justify-center transition-colors duration-300 ${isHighlighted ? 'bg-orange-200 rounded-md' : ''}`}>
                        <span className="text-2xl font-bold text-blue-700 animate-in zoom-in duration-200">{userInputs[inputKey]}</span>
                    </div>
                );
            }
            if (isCurrentTarget) {
                if (step.isGhost) return null;
                return (
                    <div className="relative w-full h-full flex items-center justify-center">
                        <div className={`w-10 h-10 flex items-center justify-center rounded-md border-2 shadow-sm transition-all duration-200 z-10 relative bg-white ${feedback === 'error' ? 'bg-red-100 border-red-500 animate-shake' : 'bg-yellow-100 border-blue-500 ring-2 ring-blue-200 animate-pulse'} ${feedback === 'correct' ? 'bg-green-200 border-green-500 scale-110' : ''}`}>
                            <span className="text-gray-400 text-sm">?</span>
                        </div>
                        {isBringDownTarget && (
                            <div className="absolute bottom-full left-0 right-0 flex justify-center pointer-events-none" style={{ height: `${(r - 1) * 3}rem`, zIndex: 20 }}>
                                <div className="absolute top-0 w-full h-full flex justify-center overflow-hidden">
                                    <div className="animate-dropArrow absolute top-0 text-red-500 opacity-80 filter drop-shadow-md">
                                        <ArrowDown size={32} strokeWidth={3} />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                );
            }
            return null;
        };

        const renderGrid = () => {
            const totalRows = 14;
            const totalCols = 7;
            const grid = [];
            for (let r = 0; r < totalRows; r++) {
                const rowCells = [];
                for (let c = 0; c < totalCols; c++) {
                    let extraClass = "";
                    const stepAbove = inputSteps.find(s => s.row === r - 1 && s.col === c);
                    const isProductAbove = stepAbove && stepAbove.type === 'product';
                    const isProductAboveFilled = userInputs[`${r - 1}-${c}`] !== undefined && userInputs[`${r - 1}-${c}`] !== 'G';
                    if (isProductAbove && isProductAboveFilled) extraClass += " border-t-2 border-gray-800";
                    rowCells.push(
                        <div key={`${r}-${c}`} className={`w-10 h-12 flex items-center justify-center relative ${extraClass}`}>
                            {renderCell(r, c)}
                        </div>
                    );
                }
                grid.push(<div key={r} className="flex justify-center h-12">{rowCells}</div>);
            }
            return grid;
        };

        const renderControlPanel = () => {
            return (
                <>
                    <div className="flex justify-between items-center mb-2 px-1 shrink-0">
                        <span className="text-sm font-bold text-gray-500 flex items-center gap-2">
                            {isRetryMode && <span className="bg-orange-100 text-orange-600 px-2 py-0.5 rounded text-xs">錯題重練</span>}
                            第 <span className="text-blue-600 text-lg">{progress.current}</span> / {progress.total} 題
                        </span>
                        <div className="flex gap-2 items-center">
                            <div className="flex items-center bg-gray-100 rounded-lg p-0.5 mr-2">
                                <button onClick={() => handleZoom(-0.1)} className="p-1 text-gray-500 hover:text-blue-600 hover:bg-white rounded-md transition-all active:scale-95" title="縮小"><ZoomOut size={16} /></button>
                                <span className="text-[10px] text-gray-400 w-8 text-center select-none">{Math.round(zoomLevel * 100)}%</span>
                                <button onClick={() => handleZoom(0.1)} className="p-1 text-gray-500 hover:text-blue-600 hover:bg-white rounded-md transition-all active:scale-95" title="放大"><ZoomIn size={16} /></button>
                            </div>

                            {/* 新增：鍵盤模式切換按鈕 */}
                            <button
                                onClick={() => setKeyboardMode(!keyboardMode)}
                                className={`p-1.5 rounded-lg transition-colors relative group ${keyboardMode ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500 hover:text-blue-600 hover:bg-blue-50'}`}
                                title={keyboardMode ? "鍵盤模式：開啟" : "鍵盤模式：關閉"}
                            >
                                <Keyboard size={18} />
                                {/* 狀態指示小點 */}
                                {keyboardMode && <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-green-500 rounded-full"></span>}
                            </button>

                            <button onClick={() => setLayoutMode(prev => prev === 'top' ? 'left' : 'top')} className="p-1.5 bg-gray-100 rounded-lg text-gray-500 hover:text-blue-600 hover:bg-blue-50 transition-colors" title="切換鍵盤位置">
                                {layoutMode === 'top' ? <PanelLeft size={18} /> : <PanelTop size={18} />}
                            </button>
                            <button onClick={goHome} className="p-1.5 bg-gray-100 rounded-lg text-gray-500 hover:text-blue-600 hover:bg-blue-50 transition-colors" title="回首頁">
                                <Home size={18} />
                            </button>
                        </div>
                    </div>
                    <div className={`${layoutMode === 'left' ? 'flex-1 min-h-[200px]' : 'h-28'} w-full transition-all duration-300`}>
                        {showHint ? renderMultiplicationTable() : renderKeypad()}
                    </div>
                    {!isComplete && inputSteps[currentStep] && !inputSteps[currentStep].isGhost && (
                        <div className="text-center text-[10px] text-gray-400 mt-2 h-4 shrink-0">
                            {inputSteps[currentStep].hint}
                        </div>
                    )}
                </>
            );
        };

        const containerClass = layoutMode === 'left' ? 'flex-row' : 'flex-col';
        const controlPanelWrapperClass = layoutMode === 'left' ? 'shrink-0 bg-white shadow-md z-30 p-2 w-[280px] sm:w-[340px] h-full flex flex-col border-r' : 'shrink-0 bg-white shadow-md z-30 p-2 pb-3 w-full';

        return (
            <div className={`flex h-screen w-full bg-slate-100 font-sans fixed inset-0 ${containerClass}`}>
                <div className={controlPanelWrapperClass}>
                    {renderControlPanel()}
                </div>
                <div className="flex-1 overflow-auto flex items-start justify-center pt-4 pb-20 bg-slate-50 relative">
                    <div className="origin-top p-4 transition-transform duration-200 ease-out" style={{ transform: `scale(${zoomLevel})` }}>
                        {renderGrid()}
                    </div>
                </div>
                <button onClick={nextQuestion} className={`fixed bottom-6 right-6 p-4 rounded-full shadow-lg transition-all duration-300 flex items-center justify-center z-50 ${isComplete ? 'bg-green-500 hover:bg-green-600 animate-bounce scale-100' : 'bg-gray-300 scale-0 opacity-0'} `} disabled={!isComplete}>
                    <ArrowRight className="text-white" size={24} />
                </button>
                <style>{`
                @keyframes shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-4px); } 75% { transform: translateX(4px); } }
                .animate-shake { animation: shake 0.3s ease-in-out; }
                @keyframes dropArrow { 0% { transform: translateY(-50%); opacity: 0; } 20% { opacity: 1; } 80% { opacity: 1; } 100% { transform: translateY(80%); opacity: 0; } }
                .animate-dropArrow { animation: dropArrow 1.5s infinite ease-in-out; }
            `}</style>
            </div>
        );
    };

    if (appState === 'settings') return renderSettings();
    if (appState === 'summary') return renderSummary();
    return renderGame();
};

export default MobileDivisionTrainer;
