import React, { useState, useEffect, useMemo, useCallback, useRef, memo } from 'react';
import ReactDOM from 'react-dom/client';
import { 
    LayoutDashboard, Users, CalendarDays, FileText, Settings, 
    Trash2, ChevronLeft, ChevronRight, ChevronDown,
    Plus, Edit3, Check,
    AlertTriangle, Copy, RefreshCcw, FileDown, PlusCircle, Book, Info, CheckCircle2, X, Square, CheckSquare, Search, FileSpreadsheet,
    Download, Upload, Database, Save, TableProperties, FileJson, FileType, Layers, TrendingUp, BookOpen, Loader2
} from 'lucide-react';

// --- CẤU HÌNH HỆ THỐNG ---
const STORAGE_KEY = 'thcs_teaching_mgmt_v8_9_optimized';
const DEBOUNCE_DELAY = 500;

const DEFAULT_SUBJECT_CONFIGS = [
    { name: 'Toán', p6: 4, p7: 4, p8: 4, p9: 4 },
    { name: 'Ngữ văn', p6: 4, p7: 4, p8: 4, p9: 4 },
    { name: 'Tiếng Anh', p6: 3, p7: 3, p8: 3, p9: 3 },
    { name: 'Vật lý', p6: 1, p7: 1, p8: 1, p9: 1 },
    { name: 'Hóa học', p6: 0, p7: 0, p8: 2, p9: 2 },
    { name: 'Sinh học', p6: 2, p7: 2, p8: 2, p9: 2 },
    { name: 'Lịch sử', p6: 1.5, p7: 1.5, p8: 1.5, p9: 1.5 },
    { name: 'Địa lý', p6: 1.5, p7: 1.5, p8: 1.5, p9: 1.5 },
    { name: 'GDCD', p6: 1, p7: 1, p8: 1, p9: 1 },
    { name: 'Tin học', p6: 1, p7: 1, p8: 1, p9: 1 },
    { name: 'Công nghệ', p6: 1, p7: 1, p8: 1, p9: 1 },
    { name: 'Thể dục', p6: 2, p7: 2, p8: 2, p9: 2 },
    { name: 'Nhạc - Họa', p6: 1, p7: 1, p8: 1, p9: 1 },
    { name: 'HĐTN - HN', p6: 3, p7: 3, p8: 3, p9: 3 }
];

const DEFAULT_ROLES = [
    { id: 'r1', name: 'Chủ nhiệm', reduction: 4 },
    { id: 'r2', name: 'Tổ trưởng', reduction: 3 },
    { id: 'r3', name: 'Tổ phó', reduction: 1 },
    { id: 'r4', name: 'Thư ký', reduction: 2 },
    { id: 'r5', name: 'TPT Đội', reduction: 10 }
];

// --- HOOKS TỐI ƯU ---
const useDebounce = (value: any, delay: number) => {
    const [debounced, setDebounced] = useState(value);
    useEffect(() => {
        const timer = setTimeout(() => setDebounced(value), delay);
        return () => clearTimeout(timer);
    }, [value, delay]);
    return debounced;
};

const useLocalStorage = (key: string, initialValue: any) => {
    const [storedValue, setStoredValue] = useState(() => {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : initialValue;
        } catch (error) {
            console.error('Error loading from localStorage:', error);
            return initialValue;
        }
    });

    const debouncedValue = useDebounce(storedValue, DEBOUNCE_DELAY);

    useEffect(() => {
        try {
            localStorage.setItem(key, JSON.stringify(debouncedValue));
        } catch (error) {
            console.error('Error saving to localStorage:', error);
        }
    }, [key, debouncedValue]);

    return [storedValue, setStoredValue];
};

// --- TIỆN ÍCH ---
const isValidClassName = (cls: string) => /^[6-9][A-Z0-9.\-_]*$/i.test(cls);

const calculateTKBPeriods = (assignmentStr: string, configMap: Map<string, any>) => {
    if (!assignmentStr) return 0;
    let total = 0;
    assignmentStr.split(';').forEach(part => {
        const [subName, clsPart] = part.split(':');
        if (subName && clsPart) {
            const subConfig = configMap.get(subName.trim().toLowerCase());
            if (subConfig) {
                clsPart.split(',').map(c => c.trim().replace(/\s/g, '')).filter(c => c).forEach(cls => {
                    const gradeMatch = cls.match(/^[6-9]/);
                    if (gradeMatch) total += Number(subConfig[`p${gradeMatch[0]}`] || 0);
                });
            }
        }
    });
    return total;
};

// --- OPTIMIZED COMPONENTS ---
const LocalNumericInput = memo(({ value, onChange, className, step = 0.5, min = 0 }: any) => {
    const [local, setLocal] = useState(value);
    useEffect(() => { setLocal(value); }, [value]);
    
    const handleCommit = useCallback(() => {
        const parsed = Math.max(min, parseFloat(local) || 0);
        if (parsed !== value) onChange(parsed);
    }, [local, onChange, value, min]);

    return (
        <input 
            type="number" 
            step={step} 
            min={min}
            className={className} 
            value={local} 
            onChange={(e) => setLocal(e.target.value)}
            onBlur={handleCommit}
            onKeyDown={(e) => { if(e.key === 'Enter') handleCommit(); }}
        />
    );
});

const LocalAssignmentInput = memo(({ value, onSave, existingAssignments }: any) => {
    const [local, setLocal] = useState(value);
    const [error, setError] = useState('');
    
    useEffect(() => { setLocal(value); }, [value]);

    const handleCommit = useCallback(() => {
        if (local === value) return;
        const normalized = local.replace(/\s+/g, ' ').trim();
        if (!normalized) { onSave(""); return; }
        
        const parts = normalized.split(';');
        for (let part of parts) {
            const colonIdx = part.indexOf(':');
            if (colonIdx !== -1) {
                const subName = part.substring(0, colonIdx).trim();
                const clsPart = part.substring(colonIdx + 1);
                const classes = clsPart.split(',').map(c => c.trim().replace(/\s/g, '')).filter(c => c);
                for (let cls of classes) {
                    if (!isValidClassName(cls)) {
                        setError(`Lớp "${cls}" sai định dạng`);
                        setLocal(value);
                        setTimeout(() => setError(''), 3000);
                        return;
                    }
                    const assignmentKey = `${subName}:${cls}`;
                    if (existingAssignments[assignmentKey]) {
                        setError(`${subName} - ${cls} đã có GV`);
                        setLocal(value);
                        setTimeout(() => setError(''), 3000);
                        return;
                    }
                }
            }
        }
        onSave(normalized);
        setError('');
    }, [local, value, existingAssignments, onSave]);

    return (
        <div className="relative">
            <input 
                type="text" 
                className={`w-full p-2.5 rounded-xl border-none font-medium text-sm shadow-inner transition-all ${error ? 'bg-red-50 text-red-600 ring-2 ring-red-200' : 'bg-slate-50 text-slate-700 focus:ring-2 focus:ring-blue-100'}`}
                value={local} 
                onChange={(e) => setLocal(e.target.value)} 
                onBlur={handleCommit}
                onKeyDown={(e) => { if(e.key === 'Enter') handleCommit(); }}
                placeholder="Môn: Lớp1, Lớp2..."
            />
            {error && <div className="absolute -bottom-5 left-0 text-[9px] text-red-500 font-bold">{error}</div>}
        </div>
    );
});

// --- APP CHÍNH ---
const App = () => {
    const [activeTab, setActiveTab] = useState('teachers');
    const [currentWeek, setCurrentWeek] = useState(1);
    const [startRange, setStartRange] = useState(1);
    const [endRange, setEndRange] = useState(1);
    const [isLoading, setIsLoading] = useState(false);

    const [data, setData] = useLocalStorage(STORAGE_KEY, {
        standardQuota: 19, 
        roles: DEFAULT_ROLES,
        subjectConfigs: DEFAULT_SUBJECT_CONFIGS,
        gradeClassCounts: { p6: 1, p7: 1, p8: 1, p9: 1 },
        weeklyRecords: {}
    });

    const updateData = useCallback((newData: any) => {
        setData((prev: any) => ({ ...prev, ...newData }));
    }, [setData]);

    const getWeekData = useCallback((week: number) => 
        data.weeklyRecords[week] || { teachers: [], assignments: {}, logs: {} }
    , [data.weeklyRecords]);

    const updateWeekData = useCallback((week: number, weekContent: any) => {
        setData((prev: any) => ({
            ...prev,
            weeklyRecords: {
                ...prev.weeklyRecords,
                [week]: { ...getWeekData(week), ...weekContent }
            }
        }));
    }, [setData, getWeekData]);

    const configMap = useMemo(() => {
        const map = new Map<string, any>();
        data.subjectConfigs.forEach((s: any) => map.set(String(s.name).toLowerCase(), s));
        return map;
    }, [data.subjectConfigs]);

    const getTKBPeriods = useCallback((assignmentStr: string) => 
        calculateTKBPeriods(assignmentStr, configMap)
    , [configMap]);

    const getTeacherReduction = useCallback((teacherRoles: string[]) => {
        return (teacherRoles || []).reduce((sum, roleName) => {
            const r = data.roles.find((x: any) => x.name === roleName);
            return sum + (r ? r.reduction : 0);
        }, 0);
    }, [data.roles]);

    // --- TAB PHÂN CÔNG ---
    const TeacherTab = memo(() => {
        const [isAdding, setIsAdding] = useState(false);
        const [isCopying, setIsCopying] = useState(false);
        const [newTeacherRoles, setNewTeacherRoles] = useState<string[]>([]);
        const [showRoleDropdown, setShowRoleDropdown] = useState(false);
        const [selectedIds, setSelectedIds] = useState<string[]>([]);
        
        const weekData = getWeekData(currentWeek);
        const prevWeekData = getWeekData(currentWeek - 1);
        const { teachers, assignments, logs = {} } = weekData;

        const fullAssignmentMap = useMemo(() => {
            const map: Record<string, string> = {};
            Object.entries(assignments).forEach(([tId, str]) => {
                if (!str) return;
                const t = teachers.find(x => x.id === tId);
                const name = t ? t.name : "GV khác";
                (str as string).split(';').forEach(p => {
                    const cIdx = p.indexOf(':');
                    if (cIdx !== -1) {
                        const sub = p.substring(0, cIdx).trim();
                        p.substring(cIdx + 1).split(',').map(c => c.trim().replace(/\s/g, '')).filter(c => c).forEach(cls => {
                            map[`${sub}:${cls}`] = name;
                        });
                    }
                });
            });
            return map;
        }, [assignments, teachers]);

        const saveAssignment = useCallback((tId: string, val: string) => {
            updateWeekData(currentWeek, { assignments: { ...assignments, [tId]: val } });
        }, [currentWeek, assignments, updateWeekData]);

        const copySelectedFromPrevious = useCallback(() => {
            if (selectedIds.length === 0) return alert("Vui lòng chọn giáo viên!");
            const newTeachers = [...teachers];
            const newAssignments = { ...assignments };
            const newLogs = { ...logs };
            
            selectedIds.forEach(id => {
                const prevT = prevWeekData.teachers.find((x:any) => x.id === id);
                if (prevT && !teachers.some(t => t.id === id)) {
                    newTeachers.push({ ...prevT });
                    newAssignments[id] = prevWeekData.assignments[id] || "";
                    if (prevWeekData.logs?.[id]) newLogs[id] = { ...prevWeekData.logs[id] };
                }
            });
            
            updateWeekData(currentWeek, { teachers: newTeachers, assignments: newAssignments, logs: newLogs });
            setSelectedIds([]);
            setIsCopying(false);
        }, [selectedIds, teachers, assignments, logs, prevWeekData, currentWeek, updateWeekData]);

        const handleExportAllWeeks = useCallback(async () => {
            setIsLoading(true);
            try {
                // @ts-ignore
                const wb = XLSX.utils.book_new();
                let hasData = false;
                
                for (let w = 1; w <= currentWeek; w++) {
                    const wData = data.weeklyRecords[w];
                    if (wData && wData.teachers && wData.teachers.length > 0) {
                        hasData = true;
                        const headers = ["Họ tên Giáo viên", "Phân công (Môn: Lớp)", "Số tiết TKB", "Dạy bù", "Tăng tiết", "Tổng cộng", "Chức vụ"];
                        const rows = wData.teachers.map((t: any) => {
                            const tkb = getTKBPeriods(wData.assignments[t.id] || "");
                            const log = wData.logs?.[t.id] || { bu: 0, tang: 0 };
                            const total = tkb + (log.bu || 0) + (log.tang || 0);
                            return [
                                t.name,
                                wData.assignments[t.id] || "",
                                tkb,
                                log.bu || 0,
                                log.tang || 0,
                                total,
                                (t.roles || []).join(', ')
                            ];
                        });
                        // @ts-ignore
                        const ws = XLSX.utils.aoa_to_sheet([[`BẢNG PHÂN CÔNG TUẦN ${w}`], [], headers, ...rows]);
                        // @ts-ignore
                        XLSX.utils.book_append_sheet(wb, ws, `Tuan ${w}`);
                    }
                }
                
                if (!hasData) {
                    alert("Chưa có dữ liệu phân công để xuất!");
                    return;
                }
                
                // @ts-ignore
                XLSX.writeFile(wb, `Phan_Cong_Chi_Tiet_Den_Tuan_${currentWeek}.xlsx`);
            } catch (error) {
                console.error('Export error:', error);
                alert('Lỗi khi xuất file!');
            } finally {
                setIsLoading(false);
            }
        }, [currentWeek, data.weeklyRecords, getTKBPeriods]);

        const handleAddTeacher = useCallback(() => {
            const nV = (document.getElementById('new-name') as HTMLInputElement)?.value.trim();
            const sV = (document.getElementById('new-sub') as HTMLSelectElement)?.value;
            const cV = (document.getElementById('new-cls') as HTMLInputElement)?.value.trim();
            
            if (!nV || !sV || !cV) {
                alert("Vui lòng nhập đủ thông tin!");
                return;
            }
            
            const clsList = cV.split(',').map(c => c.trim().toUpperCase()).filter(c => c);
            for (let c of clsList) {
                if(!isValidClassName(c)) {
                    alert(`Lớp ${c} sai định dạng.`);
                    return;
                }
                const key = `${sV}:${c}`;
                if(fullAssignmentMap[key]) {
                    alert(`Môn ${sV} tại lớp ${c} đã được giao cho ${fullAssignmentMap[key]}!`);
                    return;
                }
            }
            
            const tId = Date.now().toString();
            updateWeekData(currentWeek, {
                teachers: [{ id: tId, name: nV, roles: [...newTeacherRoles] }, ...teachers],
                assignments: { ...assignments, [tId]: `${sV}: ${clsList.join(', ')}` }
            });
            
            setIsAdding(false);
            setNewTeacherRoles([]);
            
            // Clear inputs
            (document.getElementById('new-name') as HTMLInputElement).value = '';
            (document.getElementById('new-sub') as HTMLSelectElement).value = '';
            (document.getElementById('new-cls') as HTMLInputElement).value = '';
        }, [fullAssignmentMap, newTeacherRoles, currentWeek, teachers, assignments, updateWeekData]);

        const handleDeleteTeacher = useCallback((teacherId: string, teacherName: string) => {
            if(confirm(`Xóa ${teacherName}?`)) {
                updateWeekData(currentWeek, { 
                    teachers: teachers.filter((x: any) => x.id !== teacherId) 
                });
            }
        }, [currentWeek, teachers, updateWeekData]);

        return (
            <div className="p-8 animate-fadeIn">
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-10">
                    <div className="flex items-center gap-3 bg-white border border-slate-200 p-2.5 rounded-2xl shadow-sm">
                        <button 
                            onClick={() => { 
                                setCurrentWeek(Math.max(1, currentWeek-1)); 
                                setSelectedIds([]); 
                                setIsCopying(false); 
                            }} 
                            className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-400"
                            disabled={currentWeek <= 1}
                        >
                            <ChevronLeft size={20}/>
                        </button>
                        <div className="px-6 text-center border-x border-slate-100">
                            <div className="text-[10px] font-black text-blue-500 uppercase tracking-widest leading-none mb-1">Tuần học</div>
                            <div className="text-2xl font-black text-slate-800 tracking-tighter">{currentWeek}</div>
                        </div>
                        <button 
                            onClick={() => { 
                                setCurrentWeek(currentWeek+1); 
                                setSelectedIds([]); 
                                setIsCopying(false); 
                            }} 
                            className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-400"
                        >
                            <ChevronRight size={20}/>
                        </button>
                    </div>
                    
                    <div className="flex flex-wrap gap-2">
                        <button 
                            onClick={handleExportAllWeeks} 
                            disabled={isLoading}
                            className="bg-indigo-600 text-white px-4 py-2.5 rounded-xl flex items-center gap-2 font-black shadow-lg hover:bg-indigo-700 transition-all text-[11px] uppercase tracking-widest disabled:opacity-50"
                        >
                            {isLoading ? <Loader2 size={16} className="animate-spin"/> : <Layers size={16}/>}
                            {isLoading ? 'Đang xuất...' : 'Xuất tất cả'}
                        </button>
                        <button 
                            onClick={() => { setIsCopying(!isCopying); setIsAdding(false); }} 
                            className={`px-4 py-2.5 rounded-xl flex items-center gap-2 font-black transition-all text-[11px] uppercase tracking-widest border ${isCopying ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'bg-slate-50 text-slate-500 border-slate-200'}`}
                        >
                            <Copy size={16}/> Copy tuần cũ
                        </button>
                        <button 
                            onClick={() => { setIsAdding(!isAdding); setIsCopying(false); setNewTeacherRoles([]); }} 
                            className="bg-blue-600 text-white px-6 py-2.5 rounded-xl flex items-center gap-2 font-black shadow-lg hover:bg-blue-700 transition-all text-[11px] uppercase tracking-widest"
                        >
                            {isAdding ? 'Đóng' : 'Thêm GV mới'}
                        </button>
                    </div>
                </div>

                {isAdding && (
                    <div className="mb-10 bg-white border-4 border-blue-50 p-8 rounded-[2rem] animate-fadeIn shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-2 h-full bg-blue-600"></div>
                        <h3 className="text-sm font-black text-slate-700 uppercase tracking-widest mb-6 flex items-center gap-2 italic">
                            <PlusCircle size={18} className="text-blue-600"/> Nhập thông tin GV tuần {currentWeek}
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 ml-1 uppercase">Họ tên giáo viên</label>
                                <input type="text" placeholder="Nguyễn Văn A" className="w-full p-3.5 rounded-xl bg-slate-50 border-none outline-none font-medium shadow-inner text-base" id="new-name"/>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 ml-1 uppercase">Môn giảng dạy</label>
                                <select className="w-full p-3.5 rounded-xl bg-slate-50 border-none outline-none font-black shadow-inner text-base" id="new-sub">
                                    <option value="">Chọn môn...</option>
                                    {data.subjectConfigs.map((s: any) => <option key={s.name} value={s.name}>{s.name}</option>)}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 ml-1 uppercase">Lớp dạy</label>
                                <input type="text" placeholder="6A1, 6A2..." className="w-full p-3.5 rounded-xl bg-slate-50 border-none outline-none font-medium shadow-inner text-base" id="new-cls"/>
                            </div>
                            <div className="space-y-2 relative">
                                <label className="text-[10px] font-black text-slate-400 ml-1 uppercase">Kiêm nhiệm</label>
                                <div onClick={() => setShowRoleDropdown(!showRoleDropdown)} className="w-full p-3.5 bg-slate-50 rounded-xl font-black text-slate-600 text-xs flex justify-between items-center cursor-pointer shadow-inner">
                                    <span className="truncate">{newTeacherRoles.length > 0 ? newTeacherRoles.join(', ') : 'Chưa chọn...'}</span>
                                    <ChevronDown size={18} className="text-blue-500" />
                                </div>
                                {showRoleDropdown && (
                                    <div className="absolute top-[105%] left-0 w-full mt-2 bg-white rounded-xl shadow-2xl border border-slate-100 z-50 p-3 max-h-60 overflow-y-auto">
                                        {data.roles.map((r: any) => (
                                            <div 
                                                key={r.id} 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setNewTeacherRoles(prev => prev.includes(r.name) ? prev.filter(role => role !== r.name) : [...prev, r.name]);
                                                }} 
                                                className="p-2.5 rounded-lg mb-1 cursor-pointer flex items-center justify-between hover:bg-blue-50 transition-colors"
                                            >
                                                <span className="font-black text-[11px]">{r.name}</span>
                                                {newTeacherRoles.includes(r.name) && <Check size={16} className="text-blue-600" />}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="flex justify-end mt-8">
                            <button 
                                onClick={handleAddTeacher} 
                                className="bg-blue-600 text-white px-10 py-3 rounded-xl font-black text-[11px] uppercase tracking-widest shadow-lg hover:bg-blue-700 transition-all"
                            >
                                Lưu phân công
                            </button>
                        </div>
                    </div>
                )}

                {isCopying && prevWeekData.teachers.length > 0 && (
                    <div className="mb-10 bg-indigo-50 border-2 border-indigo-100 p-8 rounded-[2rem] animate-fadeIn shadow-lg">
                        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4">
                            <h4 className="font-black text-indigo-800 text-[11px] flex items-center gap-2 uppercase tracking-wider">
                                <Info size={18}/> Chọn giáo viên từ tuần {currentWeek-1}:
                            </h4>
                            <div className="flex gap-2">
                                <button 
                                    onClick={() => setSelectedIds(prevWeekData.teachers.filter((t:any) => !teachers.some((ct:any) => ct.id === t.id)).map((x:any)=>x.id))} 
                                    className="px-4 py-2 bg-white text-indigo-600 rounded-lg text-[10px] font-black hover:bg-indigo-50 transition-colors"
                                >
                                    Chọn tất cả
                                </button>
                                <button 
                                    onClick={() => setSelectedIds([])} 
                                    className="px-4 py-2 bg-white text-slate-600 rounded-lg text-[10px] font-black hover:bg-slate-50 transition-colors"
                                >
                                    Bỏ chọn
                                </button>
                                <button 
                                    onClick={copySelectedFromPrevious}
                                    disabled={selectedIds.length === 0}
                                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-[10px] font-black hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Copy đã chọn ({selectedIds.length})
                                </button>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {prevWeekData.teachers.filter((t:any) => !teachers.some((ct:any) => ct.id === t.id)).map((t: any) => (
                                <div 
                                    key={t.id}
                                    onClick={() => setSelectedIds(prev => prev.includes(t.id) ? prev.filter(id => id !== t.id) : [...prev, t.id])}
                                    className={`p-4 rounded-xl cursor-pointer transition-all ${selectedIds.includes(t.id) ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white text-slate-700 hover:bg-indigo-50'}`}
                                >
